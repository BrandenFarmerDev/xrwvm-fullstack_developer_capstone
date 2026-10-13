import json
from unittest.mock import patch
from django.contrib.auth.models import User
from django.test import TestCase
from .models import CarMake, CarModel


class AccountAndInventoryTests(TestCase):
    def setUp(self):
        self.payload = {
            'userName': 'qa_driver', 'password': 'Course-demo-8163!',
            'firstName': 'QA', 'lastName': 'Driver',
            'email': 'qa.driver@example.com',
        }

    def post_json(self, endpoint, payload):
        return self.client.post(
            '/djangoapp/' + endpoint, json.dumps(payload),
            content_type='application/json',
        )

    def test_registration_hashes_password_and_starts_session(self):
        response = self.post_json('register', self.payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'Authenticated')
        user = User.objects.get(username='qa_driver')
        self.assertNotEqual(user.password, self.payload['password'])
        self.assertTrue(user.check_password(self.payload['password']))
        self.assertEqual(int(self.client.session['_auth_user_id']), user.id)

    def test_duplicate_and_incomplete_registrations_do_not_create_users(self):
        self.post_json('register', self.payload)
        self.assertEqual(self.post_json('register', self.payload).status_code,
                         409)
        self.assertEqual(self.post_json('register', {}).status_code, 400)
        self.assertEqual(User.objects.count(), 1)

    def test_login_failure_then_valid_login_and_logout(self):
        User.objects.create_user(username='qa_driver', password='demo-pass')
        response = self.post_json('login', {
            'userName': 'qa_driver', 'password': 'wrong'
        })
        self.assertEqual(response.status_code, 401)
        self.assertNotIn('_auth_user_id', self.client.session)
        self.assertEqual(self.post_json('login', {
            'userName': 'qa_driver', 'password': 'demo-pass'
        }).json()['status'], 'Authenticated')
        self.assertIn('_auth_user_id', self.client.session)
        self.assertEqual(self.client.get('/djangoapp/logout').json(),
                         {'userName': ''})
        self.assertNotIn('_auth_user_id', self.client.session)

    def test_review_requires_an_authenticated_server_session(self):
        response = self.post_json('add_review', {'name': 'forged-user'})
        self.assertEqual(response.status_code, 403)

    @patch('djangoapp.views.post_review', side_effect=lambda data: data)
    def test_review_author_is_the_session_user_and_year_is_validated(self,
                                                                     backend):
        self.post_json('register', self.payload)
        review = {
            'name': 'forged-user', 'user_id': -1, 'dealership': 1,
            'review': 'Fantastic services', 'purchase_date': '2023-06-01',
            'car_make': 'Toyota', 'car_model': 'Camry', 'car_year': 2023,
        }
        response = self.post_json('add_review', review)
        self.assertEqual(response.status_code, 200)
        saved = response.json()['review']
        user = User.objects.get(username=self.payload['userName'])
        self.assertEqual(saved['name'], 'QA Driver')
        self.assertEqual(saved['user_id'], user.id)
        review['car_year'] = 2024
        self.assertEqual(self.post_json('add_review', review).status_code, 400)
        self.assertEqual(backend.call_count, 1)

    def test_car_inventory_has_five_makes_fifteen_models_without_duplicates(
            self):
        first = self.client.get('/djangoapp/get_cars')
        second = self.client.get('/djangoapp/get_cars')
        self.assertEqual(first.status_code, 200)
        self.assertEqual(len(first.json()['CarModels']), 15)
        self.assertEqual(first.json(), second.json())
        self.assertEqual(CarMake.objects.count(), 5)
        self.assertEqual(CarModel.objects.count(), 15)
