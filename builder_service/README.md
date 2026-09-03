# HouseTour Builder Service (v1.0 – Build-Ready)

An automated 3D reconstruction and packaging engine designed for mobile real-estate tours. Ingests raw room videos or `.scan` packages, orchestrates photogrammetry pipelines, and compiles standardized `.tour` bundles with multi-level LODs and navigation meshes.

---

## 🚀 Features

- **Automated Reconstruction Pipeline:** 7-stage non-blocking async pipeline (Ingestion → Frame Extraction → SfM → Dense Mesh → LOD Optimization → NavMesh → Tour Packaging).
- **Self-Contained 3D Generators:** Generates 100% valid glTF 2.0 binary (`.glb`) meshes and JPEG previews without external software requirements on Day 1.
- **Spec-Compliant `.tour` Packaging:** Assembles standard ZIP bundles containing `manifest.json`, `metadata.json`, `rooms.json`, `navmesh.json`, `model_*.glb`, and `preview.jpg`.
- **Hyper-Modern Web Dashboard:** Built-in dark workspace dashboard with real-time stage tracking, telemetry console logs, and an interactive WebGL 3D tour inspector using Three.js.
- **Ready for Scaling:** Modular pipeline hooks to connect with COLMAP, OpenMVS, and headless Blender.

---

## 🛠️ Tech Stack & Requirements

- **Operating System:** Windows 10/11 (or Linux/macOS)
- **Runtime:** Python 3.10+
- **Core Libraries:** FastAPI, Uvicorn, Pydantic v2, Pillow, Python-Multipart

---

## 📦 Installation & Setup

1. **Navigate to the service directory:**
   ```powershell
   cd "builder_service"
   ```

2. **Create and activate a virtual environment (Recommended):**
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

3. **Install dependencies:**
   ```powershell
   pip install -r requirements.txt
   ```

---

## 🏃 Running the Service

Start the FastAPI server with live reloading:

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- **Web Dashboard & 3D Viewer:** Open [http://localhost:8000](http://localhost:8000) in your browser.
- **Interactive Swagger API Docs:** Open [http://localhost:8000/docs](http://localhost:8000/docs).
- **Redoc Documentation:** Open [http://localhost:8000/redoc](http://localhost:8000/redoc).

---

## 📡 REST API Reference

### 1. Create Reconstruction Job
`POST /jobs` (Multipart Form)

**Parameters:**
- `files`: One or more video files (`.mp4`, `.mov`) OR a single `myhouse.scan` package.
- `house_name`: *(Optional)* Property title (e.g. `"3BHK Luxury Villa – Bhuj"`)
- `client_id`: *(Optional)* Client identifier (e.g. `"client_123"`)
- `address`: *(Optional)* Property address

**Example PowerShell / Curl:**
```powershell
curl.exe -X POST "http://localhost:8000/jobs" `
  -F "files=@sample_living.mp4" `
  -F "files=@sample_kitchen.mp4" `
  -F "house_name=Grand Penthouse" `
  -F "client_id=agency_01"
```

**Response (201 Created):**
```json
{
  "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "pending",
  "message": "Upload received. Reconstruction pipeline launched in background.",
  "created_at": "2026-09-03T14:50:00+00:00"
}
```

---

### 2. Poll Job Status & Progress
`GET /jobs/{job_id}`

**Example:**
```powershell
curl.exe "http://localhost:8000/jobs/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

**Response (Ready):**
```json
{
  "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "ready",
  "progress": 100,
  "current_stage": "Tour Packaging",
  "house_name": "Grand Penthouse",
  "client_id": "agency_01",
  "tour_url": "/tours/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "rooms_count": 2,
  "file_size_bytes": 128450,
  "logs": [
    {
      "stage": "Ingestion",
      "status": "completed",
      "timestamp": "14:50:01.200",
      "message": "Loaded 2 raw video stream(s)"
    }
  ]
}
```

---

### 3. Download `.tour` Package
`GET /tours/{job_id}`

Streams the final `myhouse.tour` ZIP bundle.

```powershell
curl.exe -O -J "http://localhost:8000/tours/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

---

## 🧪 Running Automated Tests

Run the complete test suite:

```powershell
python -m pytest tests/ -v
```

---

## 🔌 Real Reconstruction Integration Blueprint

When ready to connect real local photogrammetry binaries:

1. **FFmpeg Frame Extraction:** In [app/pipeline.py](file:///c:/Users/Abhi/OneDrive/Desktop/Money%20Magnet/builder_service/app/pipeline.py), invoke:
   ```bash
   ffmpeg -i video.mp4 -vf "fps=2,select='gt(scene,0.1)'" frames/frame_%04d.jpg
   ```
2. **COLMAP SfM:** Run feature extraction and mapper:
   ```bash
   colmap feature_extractor --image_path frames/ --database_path colmap.db
   colmap exhaustive_matcher --database_path colmap.db
   colmap mapper --database_path colmap.db --image_path frames/ --output_path sparse/
   ```
3. **OpenMVS Dense Mesh:** Run dense point cloud and mesher:
   ```bash
   DensifyPointCloud scene.mvs
   ReconstructMesh scene_dense.mvs
   TextureMesh scene_dense_mesh.mvs
   ```
4. **Headless Blender LODs:** Run decimation script:
   ```bash
   blender -b -P scripts/decimate_lods.py -- input_mesh.obj --output_dir work/
   ```

---

## 📄 License & Version
- **Format Version:** `v1.0` (HouseTour Standard)
- **Builder Version:** `1.0.0`
