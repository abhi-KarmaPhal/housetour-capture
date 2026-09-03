# Technical Decisions - HouseTour System

## System Architecture & File Formats (v1.0)
- **Coordinate Standard:** Right-handed, Y-Up, Metric scale (meters), Quaternions `(x, y, z, w)`.
- **Builder Service:** Python 3.10+ FastAPI service running with non-blocking background workers (`ThreadPoolExecutor`) at `builder_service/`.
- **Input Package (`myhouse.scan`):** ZIP package with `manifest.json`, `metadata.json`, `devices.json`, `rooms.json`, `videos/`, `sensors/` (IMU CSVs), `poses/` (ARKit/ARCore JSON), `thumbnails/`.
- **Output Package (`myhouse.tour`):** ZIP package with `manifest.json`, `metadata.json`, `rooms.json`, `navmesh.json`, `model_high.glb`, `model_mid.glb`, `model_low.glb`, `preview.jpg`.
- **Build Sequence:**
  1. Builder Service (Completed v1.0)
  2. Player App (Completed v1.0)
  3. Recorder App (In Progress - Guided Mobile Stepper + Multi-Floor capture)
- **Multi-Room & Multi-Floor Topology Strategy (Gold Standard):**
  - **Capture Level (Recorder App):** Guided flow (Select Floor -> Select Room -> Record 360 pan -> Continuous doorway passage).
  - **Processing Level (Builder Service):** Y-axis elevation histogram clustering for floor segregation (`Floor 0: 0m`, `Floor 1: 3m`, `Terrace: 6m`).
  - **Studio Level (Web Dashboard):** Visual room & doorway topology graph editor.
