from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.routes.leads import router


def _make_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(router)
    return app


def test_support_lead_submission():
    app = _make_test_app()
    client = TestClient(app)
    response = client.post(
        "/leads/support",
        json={
            "name": "Test User",
            "email": "test@example.com",
            "topic": "technical",
            "subject": "Need assistance",
            "message": "Can someone help with my workflow?",
            "source": "navbar",
            "origin": "oss_app",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "emailed" in data


def test_hire_expert_lead_submission_backward_compatibility():
    app = _make_test_app()
    client = TestClient(app)
    response = client.post(
        "/leads/hire-expert",
        json={
            "name": "Old Client",
            "email": "old@example.com",
            "company": "Old Corp",
            "jobTitle": "CEO",
            "agentGoal": "Build inbound receptionist",
            "phone": "+1234567890",
            "volume": "5k-100k",
            "source": "sidebar",
            "origin": "oss_app",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
