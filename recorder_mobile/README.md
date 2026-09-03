# HouseTour Native Mobile Capture Suite (iOS & Android)

Pure Native Mobile Applications for Real-Estate Spatial Capture (Tool 3 of the HouseTour System).

---

## 🌟 Architecture & Native Hardware Access

| Subsystem | 🍏 iOS Native Engine (Swift) | 🤖 Android Native Engine (Kotlin) |
| :--- | :--- | :--- |
| **Camera Pipeline** | `AVFoundation` 4K/60fps HDR with optical image stabilization & manual exposure lock | `CameraX` / `Camera2` 4K UHD video recording with continuous auto-focus |
| **Motion IMU (100Hz)** | `CoreMotion` (`CMMotionManager`) with synchronized microsecond timestamps | `SensorManager` (`SENSOR_DELAY_FASTEST`) for low-noise accelerometer & gyroscope logging |
| **Spatial 6-DOF SLAM** | `ARKit` & Apple `RoomPlan` API for parametric walls, doorways, and LiDAR depth | Google `ARCore` for 6-DOF camera pose matrices and plane detection |
| **Package & Upload** | NSFileCoordinator / ZipArchive generating `myhouse.scan` container | Java `ZipOutputStream` & OkHttp/WorkManager multipart streaming to `POST /jobs` |

---

## 🍏 iOS App Setup & Build (Xcode)

1. Open `recorder_mobile/ios` in **Xcode 15+**.
2. Target: **iOS 16.0+** (iPhone with LiDAR recommended for RoomPlan).
3. Connect your iPhone via USB / Wireless Debugging.
4. Select your Development Team in Signing & Capabilities.
5. Press **Cmd + R** to build and run on your device.

---

## 🤖 Android App Setup & Build (Android Studio)

1. Open `recorder_mobile/android` in **Android Studio (Hedgehog / Iguana+)**.
2. Minimum SDK: **API 26 (Android 8.0+)**, Target SDK: **API 34 (Android 14)**.
3. Connect your Android device with USB Debugging enabled.
4. Click **Run 'app'** (`Shift + F10`) to build the APK and deploy to your phone.

---

## 📦 Output Package Compatibility

Both the iOS and Android native apps export packages strictly matching the **Section 3.1 `myhouse.scan` specification**:
- `manifest.json` (Format version 1.0)
- `metadata.json` (House name, client ID, address, date)
- `devices.json` (Hardware model & camera intrinsics)
- `rooms.json` (Room inventory, floor assignments, and doorway connection graph)
- `videos/*.mp4` (4K/HD room and transition recordings)
- `sensors/*_imu.csv` (100Hz synchronized accelerometer/gyroscope records)
- `poses/*_poses.json` (6-DOF camera trajectory)
- `thumbnails/*.jpg` (Room preview images)
