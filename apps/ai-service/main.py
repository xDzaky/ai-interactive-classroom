"""AI Interactive Classroom — FastAPI AI/RAG microservice."""
from datetime import UTC, datetime

from fastapi import FastAPI

from app.routers import jobs as jobs_router

app = FastAPI(
    title="AI Interactive Classroom — AI Service",
    version="0.2.0",
    docs_url="/docs",
    redoc_url=None,
    description="Internal AI/RAG microservice. Auth via X-Internal-Secret header.",
)

app.include_router(jobs_router.router)


# ---------------------------------------------------------------------------
# Health — no auth required
# ---------------------------------------------------------------------------


@app.get("/health", tags=["meta"])
async def health() -> dict:
    """Health check endpoint."""
    return {"status": "ok", "timestamp": datetime.now(UTC).isoformat()}
