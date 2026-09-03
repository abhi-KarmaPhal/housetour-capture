import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any

from app.config import WORK_DIR, OUTPUT_DIR
from app.schemas import (
    JobStatusResponse,
    JobSummary,
    StageLogEntry,
)
from app.utils import logger


class JobRecord:
    def __init__(
        self,
        job_id: str,
        house_name: str = "Sample House",
        client_id: str = "client_001",
        address: str = "Unknown",
        source_type: str = "raw_videos",
    ):
        now = datetime.now(timezone.utc).isoformat()
        self.job_id = job_id
        self.house_name = house_name
        self.client_id = client_id
        self.address = address
        self.source_type = source_type
        self.status = "pending"  # "pending", "processing", "ready", "failed"
        self.progress = 0
        self.current_stage: Optional[str] = "Queued"
        self.created_at = now
        self.updated_at = now
        self.tour_url: Optional[str] = None
        self.error: Optional[str] = None
        self.logs: List[StageLogEntry] = []
        self.rooms_count: int = 2
        self.file_size_bytes: Optional[int] = None
        self.uploaded_files: List[Path] = []
        self.work_dir = WORK_DIR / job_id
        self.output_tour_path = OUTPUT_DIR / job_id / "myhouse.tour"

    def add_log(self, stage: str, status: str, message: str):
        entry = StageLogEntry(
            stage=stage,
            status=status,
            timestamp=datetime.now(timezone.utc).strftime("%H:%M:%S.%f")[:-3],
            message=message,
        )
        self.logs.append(entry)
        self.current_stage = stage
        self.updated_at = datetime.now(timezone.utc).isoformat()
        logger.info(f"[{self.job_id}] [{stage}] [{status}] {message}")

    def to_status_response(self) -> JobStatusResponse:
        return JobStatusResponse(
            job_id=self.job_id,
            status=self.status,
            progress=self.progress,
            current_stage=self.current_stage,
            house_name=self.house_name,
            client_id=self.client_id,
            created_at=self.created_at,
            updated_at=self.updated_at,
            tour_url=self.tour_url,
            error=self.error,
            logs=self.logs,
            rooms_count=self.rooms_count,
            file_size_bytes=self.file_size_bytes,
        )

    def to_summary(self) -> JobSummary:
        return JobSummary(
            job_id=self.job_id,
            status=self.status,
            progress=self.progress,
            current_stage=self.current_stage,
            house_name=self.house_name,
            client_id=self.client_id,
            created_at=self.created_at,
            tour_url=self.tour_url,
            file_size_bytes=self.file_size_bytes,
        )


class JobManager:
    """Thread-safe Job Manager handling queue dispatch and tracking."""

    def __init__(self, max_workers: int = 4):
        self._jobs: Dict[str, JobRecord] = {}
        self._lock = threading.Lock()
        self._executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="ReconWorker")

    def create_job(
        self,
        house_name: str = "Sample House",
        client_id: str = "client_001",
        address: str = "Unknown",
        source_type: str = "raw_videos",
    ) -> JobRecord:
        job_id = str(uuid.uuid4())
        record = JobRecord(
            job_id=job_id,
            house_name=house_name,
            client_id=client_id,
            address=address,
            source_type=source_type,
        )
        with self._lock:
            self._jobs[job_id] = record
        record.add_log("Ingestion", "started", f"Job {job_id} created for property '{house_name}'")
        return record

    def get_job(self, job_id: str) -> Optional[JobRecord]:
        with self._lock:
            return self._jobs.get(job_id)

    def list_jobs(self) -> List[JobSummary]:
        with self._lock:
            # Return sorted by created_at desc
            sorted_jobs = sorted(self._jobs.values(), key=lambda j: j.created_at, reverse=True)
            return [j.to_summary() for j in sorted_jobs]

    def submit_task(self, fn, *args, **kwargs):
        """Dispatches reconstruction task to background thread pool."""
        return self._executor.submit(fn, *args, **kwargs)

    def get_stats(self) -> Dict[str, Any]:
        with self._lock:
            total = len(self._jobs)
            active = sum(1 for j in self._jobs.values() if j.status in ("pending", "processing"))
            ready = sum(1 for j in self._jobs.values() if j.status == "ready")
            failed = sum(1 for j in self._jobs.values() if j.status == "failed")
            return {
                "total_jobs": total,
                "active_jobs": active,
                "ready_jobs": ready,
                "failed_jobs": failed,
            }


# Global singleton instance
job_manager = JobManager()
