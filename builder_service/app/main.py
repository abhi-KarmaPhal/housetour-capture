import shutil
import time
from pathlib import Path
from typing import List, Optional

from fastapi import (
    FastAPI,
    UploadFile,
    File,
    Form,
    HTTPException,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import (
    APP_NAME,
    APP_VERSION,
    UPLOADS_DIR,
    OUTPUT_DIR,
    STATIC_DIR,
)
from app.jobs import job_manager
from app.pipeline import run_pipeline
from app.schemas import (
    JobCreateResponse,
    JobStatusResponse,
    JobSummary,
    HealthResponse,
)
from app.utils import logger

# Initialize start time for uptime tracking
SERVICE_START_TIME = time.time()

app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description="Automated 3D house reconstruction and spec-compliant tour packaging engine for mobile walkthroughs.",
)

# CORS middleware for mobile apps / web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static web dashboard
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Mount standalone 3D Player App
PLAYER_APP_DIR = Path(__file__).resolve().parent.parent.parent / "player_app"
if PLAYER_APP_DIR.exists():
    app.mount("/player", StaticFiles(directory=str(PLAYER_APP_DIR), html=True), name="player")

# Mount Guided Mobile Recorder App
RECORDER_APP_DIR = Path(__file__).resolve().parent.parent.parent / "recorder_app"
if RECORDER_APP_DIR.exists():
    app.mount("/recorder", StaticFiles(directory=str(RECORDER_APP_DIR), html=True), name="recorder")


@app.get("/", include_in_schema=False)
async def serve_index():
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return JSONResponse({"message": f"{APP_NAME} v{APP_VERSION} is active. Visit /docs for API documentation."})


@app.post(
    "/jobs",
    response_model=JobCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new 3D tour reconstruction job",
)
async def create_reconstruction_job(
    files: List[UploadFile] = File(
        ...,
        description="One or more raw video files (MP4/MOV) or a single myhouse.scan package.",
    ),
    house_name: Optional[str] = Form("Sample House", description="Property or house title"),
    client_id: Optional[str] = Form("client_001", description="Client or agency identifier"),
    address: Optional[str] = Form("Unknown", description="Property address"),
):
    """
    Accepts video or .scan uploads, initializes a background 3D reconstruction pipeline,
    and returns a job tracking ID.
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No video or .scan files were uploaded.",
        )

    # Determine source type
    is_scan = any(f.filename and (f.filename.endswith(".scan") or f.filename.endswith(".zip")) for f in files)
    source_type = "scan_package" if is_scan else "raw_videos"

    # Create Job Record
    job = job_manager.create_job(
        house_name=house_name or "Sample House",
        client_id=client_id or "client_001",
        address=address or "Unknown",
        source_type=source_type,
    )

    # Save uploaded files into /uploads/{job_id}/
    job_upload_dir = UPLOADS_DIR / job.job_id
    job_upload_dir.mkdir(parents=True, exist_ok=True)

    saved_paths: List[Path] = []
    for upload in files:
        if not upload.filename:
            continue
        save_path = job_upload_dir / upload.filename
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(upload.file, buffer)
        saved_paths.append(save_path)

    job.uploaded_files = saved_paths
    job.add_log("Ingestion", "completed", f"Saved {len(saved_paths)} uploaded file(s) ({sum(p.stat().st_size for p in saved_paths)} bytes)")

    # Dispatch to background thread pool
    job_manager.submit_task(run_pipeline, job)

    return JobCreateResponse(
        job_id=job.job_id,
        status="pending",
        message="Upload received. Reconstruction pipeline launched in background.",
        created_at=job.created_at,
    )


@app.get(
    "/jobs/{job_id}",
    response_model=JobStatusResponse,
    summary="Get reconstruction job status and progress",
)
async def get_job_status(job_id: str):
    """
    Polls the current status, stage progress, and detailed execution logs of a reconstruction job.
    """
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reconstruction job '{job_id}' not found.",
        )
    return job.to_status_response()


@app.get(
    "/tours/{job_id}",
    summary="Download the compiled myhouse.tour package",
)
async def download_tour_package(job_id: str):
    """
    Streams the finished, validated `myhouse.tour` package for player apps.
    """
    job = job_manager.get_job(job_id)
    if not job:
        # Also check direct output directory in case of restarted service
        direct_tour = OUTPUT_DIR / job_id / "myhouse.tour"
        if direct_tour.exists():
            return FileResponse(
                path=direct_tour,
                media_type="application/zip",
                filename=f"{job_id}.tour",
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tour job '{job_id}' does not exist.",
        )

    if job.status == "processing" or job.status == "pending":
        raise HTTPException(
            status_code=status.HTTP_425_TOO_EARLY,
            detail=f"Job '{job_id}' is still in progress ({job.progress}% - {job.current_stage}). Please wait.",
        )

    if job.status == "failed":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Reconstruction job failed: {job.error}",
        )

    if not job.output_tour_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Compiled tour file is missing from output storage.",
        )

    return FileResponse(
        path=job.output_tour_path,
        media_type="application/zip",
        filename=f"{job.house_name.lower().replace(' ', '_')}_{job.job_id[:8]}.tour",
    )


@app.get(
    "/jobs",
    response_model=List[JobSummary],
    summary="List all recent reconstruction jobs",
)
async def list_all_jobs():
    """Returns a list of all recent jobs with their statuses and metadata."""
    return job_manager.list_jobs()


@app.get(
    "/health",
    response_model=HealthResponse,
    summary="System health and telemetry check",
)
async def health_check():
    """Returns runtime telemetry, active jobs, and disk storage stats."""
    stats = job_manager.get_stats()
    return HealthResponse(
        status="healthy",
        service=APP_NAME,
        version=APP_VERSION,
        uptime_seconds=round(time.time() - SERVICE_START_TIME, 2),
        active_jobs=stats["active_jobs"],
        completed_jobs=stats["ready_jobs"],
        storage={
            "uploads_dir": str(UPLOADS_DIR),
            "output_dir": str(OUTPUT_DIR),
            "total_jobs_recorded": stats["total_jobs"],
        },
    )
