"""Internal embedding endpoint used by Laravel document-ingestion jobs."""
from typing import Any

import litellm
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import require_internal_auth

router = APIRouter(prefix="/ai/embeddings", tags=["embeddings"])


class EmbeddingIngestRequest(BaseModel):
    chunks: list[str] = Field(min_length=1, max_length=500)
    model: str = "text-embedding-3-small"


@router.post("/ingest")
async def ingest_embeddings(
    body: EmbeddingIngestRequest,
    _auth: None = Depends(require_internal_auth),
) -> dict[str, Any]:
    """Create one embedding per non-empty document chunk."""
    if any(not chunk.strip() for chunk in body.chunks):
        raise HTTPException(status_code=422, detail="Chunks must not be empty")

    response = await litellm.aembedding(model=body.model, input=body.chunks)
    vectors = [item["embedding"] for item in response.data]
    return {"vectors": vectors}
