# HouseTour 3D Player App (v1.0)

A high-performance, cross-platform 3D spatial tour player designed for mobile browsers, desktops, and embedded real-estate listings. 

---

## 🌟 Key Features

- **Direct `.tour` Package Unpacking:** Loads `myhouse.tour` files directly from device storage or remote URLs, extracting glTF 2.0 binary models, JSON schemas, and preview assets on-the-fly in browser memory via JSZip.
- **NavMesh-Clamped FPS Physics:** Implements real-time 2D convex polygon boundary clamping. The player experiences continuous 6-DOF movement while remaining strictly within walkable room corridors without clipping through walls.
- **Dual-Touch Mobile Joysticks:**
  - **Left Screen Area:** Analog Virtual Joystick for forward/backward movement and strafing.
  - **Right Screen Area:** Touchpad swipe for smooth yaw and pitch camera orientation.
- **Desktop FPS Controls:** Standard `WASD` / Arrow keys + `Shift` sprint + Mouse Pointer Lock.
- **Dynamic Multi-LOD Management:** Seamlessly switches between `model_high.glb`, `model_mid.glb`, and `model_low.glb` without reloading or stuttering.
- **Real-Time Spatial Minimap Radar:** Live 2D floorplan HUD showing walkable zones, room labels, and the user's active beacon and viewing angle cone.
- **Room Teleportation:** Interactive bottom bar for smooth teleportation to room centroids.

---

## 🚀 How to Launch

1. Start the Builder Service (which hosts both the Builder and the Player App):
   ```powershell
   cd "builder_service"
   .\venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
2. Open the Player App in any browser:
   - **Direct URL:** [http://localhost:8000/player](http://localhost:8000/player)
   - Or click **"Open 3D Player"** in the top navigation bar of the [Builder Dashboard](http://localhost:8000).

3. Drop a `.tour` file or click **"Explore Interactive Demo Villa"** to experience the 3D walkthrough immediately.
