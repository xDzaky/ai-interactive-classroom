"""
app/routers/jobs.py — P08-T01
AI jobs router: POST /ai/jobs (202), GET /ai/jobs/{job_id}.
"""
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from app.auth import require_internal_auth
from app.jobs import Job, JobStatus, create_job, dispatch, get_job
from app.llm import complete

router = APIRouter(prefix="/ai/jobs", tags=["jobs"])


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------


class AiJobRequest(BaseModel):
    type: str
    payload: dict[str, Any] = {}


class AiJobCreated(BaseModel):
    job_id: str
    status: str


# ---------------------------------------------------------------------------
# Registered job handlers
# ---------------------------------------------------------------------------

async def _handle_completion(payload: dict[str, Any]) -> dict[str, Any]:
    """Handle a 'completion' job: calls LiteLLM and returns content + usage."""
    messages = payload.get("messages", [{"role": "user", "content": "Hello"}])
    model = payload.get("model", None)
    return await complete(messages=messages, model=model)


async def _handle_unknown(payload: dict[str, Any]) -> dict[str, Any]:
    raise ValueError(f"Unknown job type in payload: {payload}")


_HANDLERS: dict[str, Any] = {
    "completion": _handle_completion,
}


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("", response_model=AiJobCreated, status_code=202)
async def create_ai_job(
    body: AiJobRequest,
    _auth: None = Depends(require_internal_auth),
) -> AiJobCreated:
    """Submit an AI job. Returns 202 + job_id immediately."""
    handler = _HANDLERS.get(body.type, _handle_unknown)
    job = create_job(job_type=body.type, payload=body.payload)
    dispatch(job, handler)
    return AiJobCreated(job_id=job.id, status=JobStatus.PENDING)


@router.get("/{job_id}")
async def get_ai_job(
    job_id: str,
    _auth: None = Depends(require_internal_auth),
) -> dict[str, Any]:
    """Get AI job status and result."""
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job.to_dict()
