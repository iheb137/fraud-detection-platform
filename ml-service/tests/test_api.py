import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import os
os.chdir(ROOT)  # chemins relatifs models/ du service

from app.main import app


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


def sample_cdr(**over):
    cdr = {
        "call_id": "11111111-1111-1111-1111-111111111111",
        "calling_number": "21650000001",
        "called_number": "88216000001",
        "call_start_time": "2026-07-09 10:00:00",
        "call_duration_sec": 120,
        "call_type": "VOICE",
        "destination_country": "TN",
        "call_direction": "OUT",
        "imei": "356938035643809",
        "cell_id": "TN-TUN-0042",
        "revenue": 1.5,
    }
    cdr.update(over)
    return cdr


def test_root_up(client):
    assert client.get("/").status_code == 200


def test_health_model_loaded(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "healthy"
    assert body["model_loaded"] is True


def test_predict_returns_valid_score(client):
    r = client.post("/predict", json=sample_cdr())
    assert r.status_code == 200, r.text
    body = r.json()
    assert 0.0 <= body["fraud_score"] <= 1.0
    assert isinstance(body["is_fraud"], bool)
    assert body["model_version"]


def test_predict_is_deterministic(client):
    a = client.post("/predict", json=sample_cdr()).json()
    b = client.post("/predict", json=sample_cdr()).json()
    assert a["fraud_score"] == b["fraud_score"]


def test_predict_batch(client):
    payload = {"cdrs": [sample_cdr(), sample_cdr(call_id="22222222-2222-2222-2222-222222222222")]}
    r = client.post("/predict/batch", json=payload)
    assert r.status_code == 200, r.text


def test_predict_invalid_payload_rejected(client):
    bad = sample_cdr(call_duration_sec="pas-un-entier")
    r = client.post("/predict", json=bad)
    assert r.status_code == 422


def test_model_info(client):
    r = client.get("/predict/model-info")
    assert r.status_code == 200


def test_pipeline_status_reachable(client):
    r = client.get("/pipeline/status")
    assert r.status_code == 200
    assert isinstance(r.json(), dict)