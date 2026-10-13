import os
from pathlib import Path
from urllib.parse import quote
import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name('.env'))
backend_url = os.getenv('backend_url', 'http://localhost:3030').rstrip('/')
sentiment_analyzer_url = os.getenv(
    'sentiment_analyzer_url', 'http://localhost:5000'
).rstrip('/')


def get_request(endpoint, **kwargs):
    response = requests.get(
        backend_url + '/' + endpoint.lstrip('/'), params=kwargs, timeout=20
    )
    response.raise_for_status()
    return response.json()


def analyze_review_sentiments(text):
    response = requests.get(
        sentiment_analyzer_url + '/analyze/' + quote(text, safe=''), timeout=20
    )
    response.raise_for_status()
    return response.json()


def post_review(data_dict):
    response = requests.post(
        backend_url + '/insert_review', json=data_dict, timeout=20
    )
    response.raise_for_status()
    return response.json()
