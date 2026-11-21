"""AI Interactive Classroom — FastAPI AI/RAG microservice."""
from datetime import UTC, datetime
import os

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

app = FastAPI(
    title="AI Interactive Classroom — AI Service",
    version="0.1.0",
    docs_url="/docs",
    redoc_url=None,
    description="Internal AI/RAG microservice. Auth via X-Internal-Secret header.",
)


# ---------------------------------------------------------------------------
# Health — no auth required
# ---------------------------------------------------------------------------


@app.get("/health", tags=["meta"])
async def health() -> dict:
    """Health check endpoint."""
    return {"status": "ok", "timestamp": datetime.now(UTC).isoformat()}


# ---------------------------------------------------------------------------
# AI Jobs — stub (fully implemented in P08-T01)
# ---------------------------------------------------------------------------


class AiJobRequest(BaseModel):
    type: str
    payload: dict = {}


class AiJobResponse(BaseModel):
    job_id: str
    status: str
    message: str


@app.post("/ai/jobs", tags=["jobs"], response_model=AiJobResponse, status_code=202)
async def create_job(
    body: AiJobRequest,
    x_internal_secret: str = Header(..., alias="X-Internal-Secret"),
) -> AiJobResponse:
    """Submit an AI job. Returns 202 + job_id. Full impl in P08-T01."""
    _require_internal_auth(x_internal_secret)
    return AiJobResponse(
        job_id="stub-not-implemented",
        status="not_implemented",
        message="Implemented in P08-T01",
    )


@app.get("/ai/jobs/{job_id}", tags=["jobs"])
async def get_job(
    job_id: str,
    x_internal_secret: str = Header(..., alias="X-Internal-Secret"),
) -> dict:
    """Get AI job status. Full impl in P08-T01."""
    _require_internal_auth(x_internal_secret)
    return {"job_id": job_id, "status": "not_implemented", "message": "Implemented in P08-T01"}


# ---------------------------------------------------------------------------
# Internal auth helper
# ---------------------------------------------------------------------------


def _require_internal_auth(secret: str) -> None:
    """Validate X-Internal-Secret header against env var."""
    expected = os.getenv("LARAVEL_INTERNAL_SECRET", "changeme-dev-secret")
    if secret != expected:
        raise HTTPException(status_code=401, detail="Invalid internal secret")
