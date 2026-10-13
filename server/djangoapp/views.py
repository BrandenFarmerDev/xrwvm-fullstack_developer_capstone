import json
from functools import wraps
import requests
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST
from .models import CarModel
from .populate import initiate
from .restapis import get_request, analyze_review_sentiments, post_review


def api_errors(view):
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        try:
            return view(request, *args, **kwargs)
        except (ValueError, KeyError, TypeError):
            return JsonResponse(
                {'status': 400, 'error': 'Invalid input'}, status=400
            )
        except requests.RequestException:
            return JsonResponse(
                {'status': 502, 'error': 'Backend unavailable'}, status=502
            )
    return wrapped


@csrf_exempt
@require_POST
@api_errors
def login_user(request):
    data = json.loads(request.body)
    user = authenticate(username=data['userName'], password=data['password'])
    if user is None:
        return JsonResponse({'error': 'Invalid credentials'}, status=401)
    login(request, user)
    return JsonResponse({'userName': user.username, 'status': 'Authenticated'})


@require_GET
def logout_request(request):
    logout(request)
    return JsonResponse({'userName': ''})


@csrf_exempt
@require_POST
@api_errors
def registration(request):
    data = json.loads(request.body)
    required = ['userName', 'password', 'firstName', 'lastName', 'email']
    if not all(isinstance(data.get(k), str) and data[k].strip()
               for k in required):
        return JsonResponse({'error': 'Five fields required'}, status=400)
    try:
        with transaction.atomic():
            user = User.objects.create_user(
                username=data['userName'], password=data['password'],
                first_name=data['firstName'], last_name=data['lastName'],
                email=data['email'],
            )
    except IntegrityError:
        return JsonResponse({'error': 'Already Registered'}, status=409)
    login(request, user)
    return JsonResponse({'userName': user.username, 'status': 'Authenticated'})


@require_GET
@api_errors
def get_dealerships(request, state='All'):
    endpoint = '/fetchDealers' + ('' if state == 'All' else '/' + state)
    return JsonResponse({'status': 200, 'dealers': get_request(endpoint)})


@require_GET
@api_errors
def get_dealer_details(request, dealer_id):
    return JsonResponse({
        'status': 200, 'dealer': get_request(f'/fetchDealer/{dealer_id}')
    })


@require_GET
@api_errors
def get_dealer_reviews(request, dealer_id):
    reviews = get_request(f'/fetchReviews/dealer/{dealer_id}')
    for review in reviews:
        review['sentiment'] = analyze_review_sentiments(
            review['review']
        )['sentiment']
    return JsonResponse({'status': 200, 'reviews': reviews})


@require_GET
def get_cars(request):
    initiate()
    cars = [
        {'CarModel': model.name, 'CarMake': model.car_make.name}
        for model in CarModel.objects.select_related('car_make').order_by('id')
    ]
    return JsonResponse({'CarModels': cars})


@csrf_exempt
@require_POST
@api_errors
def add_review(request):
    if not request.user.is_authenticated:
        return JsonResponse({'status': 403, 'message': 'Unauthorized'},
                            status=403)
    data = json.loads(request.body)
    required = ['dealership', 'review', 'purchase_date', 'car_make',
                'car_model', 'car_year']
    if not all(data.get(field) for field in required):
        return JsonResponse({'status': 400, 'error': 'Review fields required'},
                            status=400)
    data['name'] = request.user.get_full_name() or request.user.username
    data['user_id'] = request.user.id
    data['dealership'] = int(data['dealership'])
    data['car_year'] = int(data['car_year'])
    if not 2015 <= data['car_year'] <= 2023:
        return JsonResponse({'status': 400, 'error': 'Invalid car year'},
                            status=400)
    data['purchase'] = bool(data.get('purchase', True))
    review = post_review(data)
    return JsonResponse({'status': 200, 'review': review})
