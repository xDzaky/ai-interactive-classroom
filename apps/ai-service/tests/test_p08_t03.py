from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)
HEADERS = {"X-Internal-Secret": "changeme-dev-secret"}


def test_embedding_ingest_requires_internal_auth():
    assert client.post("/ai/embeddings/ingest", json={"chunks": ["lesson"]}).status_code == 422


def test_embedding_ingest_returns_one_vector_per_chunk(monkeypatch):
    monkeypatch.setenv("LARAVEL_INTERNAL_SECRET", HEADERS["X-Internal-Secret"])
    response = AsyncMock()
    response.data = [{"embedding": [0.1, 0.2]}, {"embedding": [0.3, 0.4]}]
    with patch("app.routers.embeddings.litellm.aembedding", return_value=response):
        result = client.post("/ai/embeddings/ingest", json={"chunks": ["one", "two"]}, headers=HEADERS)
    assert result.status_code == 200
    assert result.json()["vectors"] == [[0.1, 0.2], [0.3, 0.4]]


def test_embedding_ingest_rejects_blank_chunk(monkeypatch):
    monkeypatch.setenv("LARAVEL_INTERNAL_SECRET", HEADERS["X-Internal-Secret"])
    assert client.post("/ai/embeddings/ingest", json={"chunks": [" "]}, headers=HEADERS).status_code == 422
