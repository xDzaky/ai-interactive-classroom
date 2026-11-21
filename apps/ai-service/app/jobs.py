"""
app/jobs.py — P08-T01
In-memory job store for async AI jobs.
Each job has: id, status, result, error, created_at.

For production scale this would use Redis; in-process store is sufficient
for the pilot (single-process FastAPI).
"""
import asyncio
import uuid
from datetime import UTC, datetime
from typing import Any, Callable, Coroutine


class JobStatus:
    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"


class Job:
    def __init__(self, job_id: str, job_type: str, payload: dict[str, Any]) -> None:
        self.id = job_id
        self.type = job_type
        self.payload = payload
        self.status = JobStatus.PENDING
        self.result: Any = None
        self.error: str | None = None
        self.created_at = datetime.now(UTC).isoformat()
        self.finished_at: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "job_id": self.id,
            "type": self.type,
            "status": self.status,
            "result": self.result,
            "error": self.error,
            "created_at": self.created_at,
            "finished_at": self.finished_at,
        }


# ---------------------------------------------------------------------------
# In-memory store
# ---------------------------------------------------------------------------

_store: dict[str, Job] = {}


def create_job(job_type: str, payload: dict[str, Any]) -> Job:
    """Create a new job in PENDING state and store it."""
    job_id = str(uuid.uuid4())
    job = Job(job_id=job_id, job_type=job_type, payload=payload)
    _store[job_id] = job
    return job


def get_job(job_id: str) -> Job | None:
    """Return a job by id, or None if not found."""
    return _store.get(job_id)


async def run_job(
    job: Job,
    handler: Callable[[dict[str, Any]], Coroutine[Any, Any, Any]],
) -> None:
    """
    Execute the job handler in the background.
    Updates job status to RUNNING → DONE | FAILED.
    """
    job.status = JobStatus.RUNNING
    try:
        result = await handler(job.payload)
        job.result = result
        job.status = JobStatus.DONE
    except Exception as exc:  # noqa: BLE001
        job.error = str(exc)
        job.status = JobStatus.FAILED
    finally:
        job.finished_at = datetime.now(UTC).isoformat()


def dispatch(
    job: Job,
    handler: Callable[[dict[str, Any]], Coroutine[Any, Any, Any]],
) -> None:
    """Schedule a job to run as an asyncio background task."""
    asyncio.create_task(run_job(job, handler))
