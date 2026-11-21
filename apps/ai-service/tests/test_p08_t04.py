"""tests/test_p08_t04.py — P08-T04: scoped retrieval + cited answers."""
import math
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)
HEADERS = {"X-Internal-Secret": "changeme-dev-secret"}

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

CHUNK_A = {
    "id": "chunk-1",
    "document_id": "doc-1",
    "chunk_text": "Photosynthesis converts sunlight into chemical energy.",
    "embedding": [1.0, 0.0, 0.0],
}
CHUNK_B = {
    "id": "chunk-2",
    "document_id": "doc-1",
    "chunk_text": "Mitosis is cell division producing two identical daughter cells.",
    "embedding": [0.0, 1.0, 0.0],
}
CHUNK_C = {
    "id": "chunk-3",
    "document_id": "doc-2",
    "chunk_text": "The mitochondria is the powerhouse of the cell.",
    "embedding": [0.8, 0.2, 0.0],
}


def _mock_embed(vec: list[float]):
    response = MagicMock()
    item = MagicMock()
    item.__getitem__ = lambda self, key: vec if key == "embedding" else None
    response.data = [item]
    return response


def _mock_llm_answer(text: str = "Photosynthesis [1]."):
    llm_resp = MagicMock()
    llm_resp.choices = [MagicMock()]
    llm_resp.choices[0].message.content = text
    return llm_resp


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_retrieval_requires_auth(monkeypatch):
    monkeypatch.setenv("LARAVEL_INTERNAL_SECRET", HEADERS["X-Internal-Secret"])
    # Missing X-Internal-Secret header → 422 from auth dependency
    result = client.post(
        "/ai/retrieval/search",
        json={"question": "What is photosynthesis?", "school_id": "s1", "chunks": [CHUNK_A]},
    )
    assert result.status_code == 422


def test_retrieval_top_k_ranking(monkeypatch):
    """Chunk most similar to question vector should rank first."""
    monkeypatch.setenv("LARAVEL_INTERNAL_SECRET", HEADERS["X-Internal-Secret"])

    # Question embedding points toward [1,0,0] → CHUNK_A most similar, CHUNK_C second
    with (
        patch("app.routers.retrieval.litellm.aembedding", new_callable=AsyncMock) as mock_embed,
        patch("app.routers.retrieval.litellm.acompletion", new_callable=AsyncMock) as mock_llm,
    ):
        mock_embed.return_value = _mock_embed([1.0, 0.0, 0.0])
        mock_llm.return_value = _mock_llm_answer()

        result = client.post(
            "/ai/retrieval/search",
            json={
                "question": "What is photosynthesis?",
                "school_id": "school-abc",
                "chunks": [CHUNK_A, CHUNK_B, CHUNK_C],
                "top_k": 2,
            },
            headers=HEADERS,
        )

    assert result.status_code == 200
    data = result.json()
    assert len(data["citations"]) == 2
    assert data["citations"][0]["chunk_id"] == "chunk-1"  # CHUNK_A highest
    assert data["citations"][1]["chunk_id"] == "chunk-3"  # CHUNK_C second


def test_retrieval_returns_answer(monkeypatch):
    """Response should include non-null LLM answer."""
    monkeypatch.setenv("LARAVEL_INTERNAL_SECRET", HEADERS["X-Internal-Secret"])

    with (
        patch("app.routers.retrieval.litellm.aembedding", new_callable=AsyncMock) as mock_embed,
        patch("app.routers.retrieval.litellm.acompletion", new_callable=AsyncMock) as mock_llm,
    ):
        mock_embed.return_value = _mock_embed([1.0, 0.0, 0.0])
        mock_llm.return_value = _mock_llm_answer("Plants use sunlight [1].")

        result = client.post(
            "/ai/retrieval/search",
            json={
                "question": "How do plants make food?",
                "school_id": "school-abc",
                "chunks": [CHUNK_A],
            },
            headers=HEADERS,
        )

    assert result.status_code == 200
    data = result.json()
    assert data["answer"] is not None
    assert len(data["answer"]) > 0


def test_retrieval_no_chunks_returns_422(monkeypatch):
    """Empty chunks list must return 422."""
    monkeypatch.setenv("LARAVEL_INTERNAL_SECRET", HEADERS["X-Internal-Secret"])

    with patch("app.routers.retrieval.litellm.aembedding", new_callable=AsyncMock):
        result = client.post(
            "/ai/retrieval/search",
            json={"question": "test", "school_id": "s1", "chunks": []},
            headers=HEADERS,
        )

    assert result.status_code == 422


def test_retrieval_llm_failure_returns_citations_without_answer(monkeypatch):
    """LLM failure must not crash — return citations with answer=null."""
    monkeypatch.setenv("LARAVEL_INTERNAL_SECRET", HEADERS["X-Internal-Secret"])

    with (
        patch("app.routers.retrieval.litellm.aembedding", new_callable=AsyncMock) as mock_embed,
        patch(
            "app.routers.retrieval.litellm.acompletion",
            new_callable=AsyncMock,
            side_effect=RuntimeError("LLM unavailable"),
        ),
    ):
        mock_embed.return_value = _mock_embed([1.0, 0.0, 0.0])

        result = client.post(
            "/ai/retrieval/search",
            json={
                "question": "What is photosynthesis?",
                "school_id": "s1",
                "chunks": [CHUNK_A],
            },
            headers=HEADERS,
        )

    assert result.status_code == 200
    data = result.json()
    assert len(data["citations"]) == 1
    assert data["answer"] is None


def test_cosine_similarity_helper():
    """Unit test the cosine similarity function directly."""
    from app.routers.retrieval import _cosine_similarity

    # Identical vectors → 1.0
    assert abs(_cosine_similarity([1.0, 0.0], [1.0, 0.0]) - 1.0) < 1e-6
    # Orthogonal → 0.0
    assert abs(_cosine_similarity([1.0, 0.0], [0.0, 1.0]) - 0.0) < 1e-6
    # Empty → 0.0
    assert _cosine_similarity([], []) == 0.0
