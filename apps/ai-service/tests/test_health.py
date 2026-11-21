"""Tests for AI service endpoints."""
import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)
VALID_SECRET = "changeme-dev-secret"


class TestHealth:
    def test_health_returns_ok(self):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "timestamp" in data

    def test_health_no_auth_required(self):
        """Health must not require auth."""
        response = client.get("/health")
        assert response.status_code == 200


class TestAiJobs:
    def test_create_job_returns_202(self):
        response = client.post(
            "/ai/jobs",
            json={"type": "outline_generator", "payload": {}},
            headers={"X-Internal-Secret": VALID_SECRET},
        )
        assert response.status_code == 202

    def test_create_job_requires_auth(self):
        response = client.post(
            "/ai/jobs",
            json={"type": "outline_generator", "payload": {}},
            headers={"X-Internal-Secret": "wrong-secret"},
        )
        assert response.status_code == 401

    def test_get_job_requires_auth(self):
        response = client.get(
            "/ai/jobs/some-id",
            headers={"X-Internal-Secret": "wrong-secret"},
        )
        assert response.status_code == 401
