from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root():
    r = client.get("/")
    assert r.status_code == 200


def test_health():
    r = client.get("/api/v1/health")
    assert r.status_code == 200


def test_languages():
    r = client.get("/api/v1/languages")
    assert r.status_code == 200
    assert len(r.json()["languages"]) >= 5


def test_predict_valid():
    payload = {"image_base64": "A" * 200, "language": "en"}
    r = client.post("/api/v1/predict", json=payload)
    assert r.status_code == 200
    body = r.json()
    assert body["status"] in ("ok", "low_confidence")
    assert body["sign"] in list("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")


def test_predict_invalid_base64():
    r = client.post("/api/v1/predict", json={"image_base64": "short"})
    assert r.status_code == 422