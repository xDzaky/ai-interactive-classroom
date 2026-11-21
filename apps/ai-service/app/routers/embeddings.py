"""Internal embedding endpoint used by Laravel document-ingestion jobs."""
import base64
from io import BytesIO
from typing import Any

import litellm
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from pypdf import PdfReader

from app.auth import require_internal_auth

router = APIRouter(prefix="/ai/embeddings", tags=["embeddings"])


class EmbeddingIngestRequest(BaseModel):
    chunks: list[str] = Field(min_length=1, max_length=500)
    model: str = "text-embedding-3-small"


class DocumentExtractRequest(BaseModel):
    content_base64: str
    filename: str


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


@router.post("/extract")
async def extract_document_text(
    body: DocumentExtractRequest,
    _auth: None = Depends(require_internal_auth),
) -> dict[str, str]:
    """Extract UTF-8 text from text files or PDFs without persisting content."""
    try:
        content = base64.b64decode(body.content_base64, validate=True)
    except ValueError as error:
        raise HTTPException(status_code=422, detail="Invalid document payload") from error

    if body.filename.lower().endswith(".pdf"):
        try:
            text = "\n".join(page.extract_text() or "" for page in PdfReader(BytesIO(content)).pages)
        except Exception as error:
            raise HTTPException(status_code=422, detail="Unable to extract PDF text") from error
    else:
        text = content.decode("utf-8", errors="replace")

    if not text.strip():
        raise HTTPException(status_code=422, detail="Document has no extractable text")
    return {"text": text}
