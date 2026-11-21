"""
tests/test_p08_t01.py — P08-T01
Tests for: internal auth dependency, LiteLLM wrapper, job store, job endpoints.
"""
import os
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)
SECRET = "changeme-dev-secret"


# ---------------------------------------------------------------------------
# 1. Auth
# ---------------------------------------------------------------------------


def test_auth_missing_header_returns_422():
    """Missing X-Internal-Secret header → 422 Unprocessable Entity."""
    r = client.post("/ai/jobs", json={"type": "completion"})
    assert r.status_code == 422


def test_auth_wrong_secret_returns_401():
    """Wrong secret → 401."""
    r = client.post(
        "/ai/jobs",
        json={"type": "completion"},
        headers={"X-Internal-Secret": "wrong-secret"},
    )
    assert r.status_code == 401


def test_auth_correct_secret_returns_202(monkeypatch):
    """Correct secret → 202 and job_id returned."""
    monkeypatch.setenv("LARAVEL_INTERNAL_SECRET", SECRET)
    r = client.post(
        "/ai/jobs",
        json={"type": "completion", "payload": {"messages": []}},
        headers={"X-Internal-Secret": SECRET},
    )
    assert r.status_code == 202
    body = r.json()
    assert "job_id" in body
    assert body["status"] == "pending"


# ---------------------------------------------------------------------------
# 2. Job store
# ---------------------------------------------------------------------------


def test_get_job_not_found_returns_404(monkeypatch):
    monkeypatch.setenv("LARAVEL_INTERNAL_SECRET", SECRET)
    r = client.get(
        "/ai/jobs/nonexistent-id",
        headers={"X-Internal-Secret": SECRET},
    )
    assert r.status_code == 404


def test_get_job_returns_pending_or_done(monkeypatch):
    monkeypatch.setenv("LARAVEL_INTERNAL_SECRET", SECRET)
    # Create job
    r = client.post(
        "/ai/jobs",
        json={"type": "completion", "payload": {"messages": [{"role": "user", "content": "hi"}]}},
        headers={"X-Internal-Secret": SECRET},
    )
    assert r.status_code == 202
    job_id = r.json()["job_id"]

    # Fetch it back
    r2 = client.get(
        f"/ai/jobs/{job_id}",
        headers={"X-Internal-Secret": SECRET},
    )
    assert r2.status_code == 200
    body = r2.json()
    assert body["job_id"] == job_id
    assert body["status"] in ("pending", "running", "done", "failed")


# ---------------------------------------------------------------------------
# 3. LiteLLM wrapper
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_llm_complete_returns_normalised_dict():
    """complete() returns content + model + usage dict."""
    mock_response = AsyncMock()
    mock_response.choices = [
        AsyncMock(message=AsyncMock(content="Bonjour"))
    ]
    mock_response.usage = AsyncMock(
        prompt_tokens=5, completion_tokens=3, total_tokens=8
    )

    with patch("app.llm.litellm.acompletion", return_value=mock_response):
        from app.llm import complete
        result = await complete(messages=[{"role": "user", "content": "Hello"}])

    assert result["content"] == "Bonjour"
    assert "model" in result
    assert result["usage"]["total_tokens"] == 8


# ---------------------------------------------------------------------------
# 4. Health (sanity)
# ---------------------------------------------------------------------------


def test_health_no_auth():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
