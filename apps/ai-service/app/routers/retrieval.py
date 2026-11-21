"""
app/routers/retrieval.py — P08-T04
Scoped retrieval: cosine similarity search over document_chunks (school-scoped),
returns top-k chunks with citations for the AI cited-answer job.
"""
from __future__ import annotations

import json
import math
from typing import Any

import litellm
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import require_internal_auth

router = APIRouter(prefix="/ai/retrieval", tags=["retrieval"])

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class RetrievalSearchRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    school_id: str
    chunks: list[dict[str, Any]]  # [{id, document_id, chunk_text, embedding: list[float]}]
    top_k: int = Field(default=5, ge=1, le=20)
    model: str = "text-embedding-3-small"


class ChunkCitation(BaseModel):
    chunk_id: str
    document_id: str
    chunk_text: str
    score: float


class RetrievalSearchResponse(BaseModel):
    citations: list[ChunkCitation]
    answer: str | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


def _parse_embedding(raw: Any) -> list[float]:
    """Parse embedding from JSON string or list."""
    if isinstance(raw, list):
        return [float(v) for v in raw]
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            return [float(v) for v in parsed]
        except (json.JSONDecodeError, TypeError, ValueError):
            return []
    return []


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/search", response_model=RetrievalSearchResponse)
async def retrieval_search(
    body: RetrievalSearchRequest,
    _auth: None = Depends(require_internal_auth),
) -> RetrievalSearchResponse:
    """
    Embed the question, then rank pre-fetched school-scoped chunks by cosine
    similarity. Returns top-k citations plus an LLM cited answer.
    """
    if not body.chunks:
        raise HTTPException(status_code=422, detail="No chunks provided for retrieval")

    # 1. Embed the question
    embed_response = await litellm.aembedding(model=body.model, input=[body.question])
    question_vec: list[float] = embed_response.data[0]["embedding"]

    # 2. Score each chunk
    scored: list[tuple[float, dict[str, Any]]] = []
    for chunk in body.chunks:
        chunk_vec = _parse_embedding(chunk.get("embedding", []))
        score = _cosine_similarity(question_vec, chunk_vec)
        scored.append((score, chunk))

    # 3. Sort descending, take top-k
    scored.sort(key=lambda t: t[0], reverse=True)
    top = scored[: body.top_k]

    citations = [
        ChunkCitation(
            chunk_id=str(c.get("id", "")),
            document_id=str(c.get("document_id", "")),
            chunk_text=str(c.get("chunk_text", "")),
            score=round(score, 4),
        )
        for score, c in top
    ]

    # 4. Build cited answer from LLM
    context_text = "\n\n---\n\n".join(
        f"[{i + 1}] {cit.chunk_text}" for i, cit in enumerate(citations)
    )
    messages = [
        {
            "role": "system",
            "content": (
                "You are an educational assistant. Answer the question using only the "
                "provided document excerpts. Cite sources using [1], [2], etc. "
                "If the answer cannot be found in the excerpts, say so."
            ),
        },
        {
            "role": "user",
            "content": f"Document excerpts:\n{context_text}\n\nQuestion: {body.question}",
        },
    ]

    try:
        llm_response = await litellm.acompletion(
            model="gpt-4o-mini",
            messages=messages,
        )
        answer = llm_response.choices[0].message.content or ""
    except Exception:
        # Non-fatal: return citations without answer if LLM unavailable
        answer = None

    return RetrievalSearchResponse(citations=citations, answer=answer)
