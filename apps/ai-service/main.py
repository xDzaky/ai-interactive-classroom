"""AI Interactive Classroom — FastAPI AI service."""
from datetime import UTC, datetime

from fastapi import FastAPI

app = FastAPI(
    title="AI Interactive Classroom — AI Service",
    version="0.1.0",
    docs_url="/docs",
    redoc_url=None,
)


@app.get("/health")
async def health() -> dict:
    """Health check endpoint."""
    return {"status": "ok", "timestamp": datetime.now(UTC).isoformat()}
