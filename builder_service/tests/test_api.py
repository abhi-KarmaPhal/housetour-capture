import io
import time
import zipfile
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint():
    """Verify health telemetry check."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_create_and_process_job():
    """Verify full end-to-end job creation, status polling, and tour download."""
    # 1. Create Job with mock video uploads
    mock_video1 = io.BytesIO(b"MOCK_VIDEO_DATA_ROOM_1")
    mock_video2 = io.BytesIO(b"MOCK_VIDEO_DATA_ROOM_2")

    files = [
        ("files", ("01_living.mp4", mock_video1, "video/mp4")),
        ("files", ("02_kitchen.mp4", mock_video2, "video/mp4")),
    ]
    data = {
        "house_name": "Lakeview Penthouse",
        "client_id": "client_test",
        "address": "Bangalore, India",
    }

    create_res = client.post("/jobs", files=files, data=data)
    assert create_res.status_code == 201
    create_data = create_res.json()
    assert "job_id" in create_data
    job_id = create_data["job_id"]

    # 2. Poll status until complete (or timeout)
    max_retries = 30
    ready = False
    for _ in range(max_retries):
        status_res = client.get(f"/jobs/{job_id}")
        assert status_res.status_code == 200
        status_data = status_res.json()

        if status_data["status"] == "ready":
            ready = True
            assert status_data["progress"] == 100
            assert status_data["tour_url"] is not None
            assert len(status_data["logs"]) > 0
            break
        elif status_data["status"] == "failed":
            pytest.fail(f"Job failed unexpectedly: {status_data.get('error')}")
        time.sleep(0.4)

    assert ready, "Job did not complete within expected time."

    # 3. Download the .tour package
    tour_res = client.get(f"/tours/{job_id}")
    assert tour_res.status_code == 200
    assert tour_res.headers.get("content-type") == "application/zip"

    # 4. Verify ZIP content
    tour_bytes = io.BytesIO(tour_res.content)
    with zipfile.ZipFile(tour_bytes, "r") as zf:
        namelist = set(zf.namelist())
        assert "manifest.json" in namelist
        assert "metadata.json" in namelist
        assert "rooms.json" in namelist
        assert "navmesh.json" in namelist
        assert "model_high.glb" in namelist
        assert "preview.jpg" in namelist
