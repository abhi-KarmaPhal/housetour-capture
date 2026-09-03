# HouseTour Capture - Mobile Recorder App (v1.0)

A mobile-first spatial recording application designed for real-estate agents to capture multi-floor houses, room sequences, 60Hz IMU sensor trajectories, and continuous doorway transitions.

---

## 🌟 Core Capabilities

- **Step 1 – Property Setup:** Captures property name, client/agent ID, address, and listing notes.
- **Step 2 – Floor & Room Topology:**
  - Multi-Floor organization (`Ground Floor`, `1st Floor`, `Terrace / Roof`, custom floors).
  - Quick room chips (`Living Room`, `Kitchen & Dining`, `Master Bedroom`, `Balcony`, `Terrace`, `Hallway`).
- **Step 3 – Live Guided Camera & IMU Scanner:**
  - Live rear camera viewfinder (`MediaRecorder` video capture).
  - 60Hz IMU motion sensor logger (accelerometer & gyroscope CSV export).
  - Step-by-step guided instructions (*"Rotate slowly 360°"*, *"Walk through doorway to link next room"*).
- **Step 4 – 1-Click `myhouse.scan` Generation & Upload:**
  - Bundles `manifest.json`, `metadata.json`, `devices.json`, `rooms.json`, `videos/`, `sensors/`, `thumbnails/` into a standard `.scan` ZIP package via JSZip.
  - Submits directly to the Builder Service `POST /jobs` endpoint with live upload progress.

---

## 🚀 How to Launch and Test

1. Ensure the Builder Service is running (e.g. via `.\start_server.ps1`).
2. Open in mobile browser or desktop:
   - **Direct URL:** [http://localhost:8000/recorder/](http://localhost:8000/recorder/)
   - Or click **"Open Recorder App"** in the top navigation bar of the [Studio Dashboard](http://localhost:8000).
3. Follow the 4-step wizard to record or simulate a scan, package `myhouse.scan`, and launch automated 3D reconstruction!
