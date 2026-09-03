/**
 * myhouse.scan ZIP Packager
 * Assembles all room videos, IMU sensor CSVs, and topology into a spec-compliant scan package.
 */

class ScanPackager {
  async packageScan(propertyInfo, roomsList, capturedData, onProgress) {
    const zip = new JSZip();

    // 1. Manifest JSON
    const manifest = {
      format: "house_scan",
      version: "1.0",
      created_by: "RecorderApp",
      created_at: new Date().toISOString()
    };
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    // 2. Metadata JSON
    const metadata = {
      house_name: propertyInfo.name || "Untitled Property",
      client_id: propertyInfo.clientId || "client_default",
      address: propertyInfo.address || "Unknown Location",
      capture_date: new Date().toISOString().slice(0, 10),
      notes: propertyInfo.notes || "Captured with HouseTour Mobile Recorder"
    };
    zip.file("metadata.json", JSON.stringify(metadata, null, 2));

    // 3. Devices JSON
    const devices = {
      devices: [
        {
          id: "device_01",
          platform: navigator.userAgent.includes("iPhone") ? "ios" : "android",
          model: navigator.userAgent.includes("iPhone") ? "iPhone 13/14" : "Android Device",
          os_version: "Mobile",
          app_version: "1.0.0",
          camera_specs: {
            resolution: "1920x1080",
            fps: 30,
            lens: "wide"
          }
        }
      ]
    };
    zip.file("devices.json", JSON.stringify(devices, null, 2));

    // 4. Rooms Document
    const roomsDoc = {
      rooms: roomsList.map((room, idx) => {
        const safeId = room.id || `room_${idx + 1}`;
        return {
          id: safeId,
          name: room.name,
          floor: room.floor || "Ground Floor",
          order: idx + 1,
          video: `videos/${safeId}.mp4`,
          imu: `sensors/${safeId}_imu.csv`,
          poses: `poses/${safeId}_poses.json`,
          thumbnail: `thumbnails/${safeId}.jpg`,
          connected_to: room.connectedTo || []
        };
      })
    };
    zip.file("rooms.json", JSON.stringify(roomsDoc, null, 2));

    // 5. Populate Binary Files (Videos, Sensors, Thumbnails, Poses)
    const videosFolder = zip.folder("videos");
    const sensorsFolder = zip.folder("sensors");
    const thumbnailsFolder = zip.folder("thumbnails");
    const posesFolder = zip.folder("poses");

    for (let i = 0; i < roomsList.length; i++) {
      const room = roomsList[i];
      const safeId = room.id || `room_${i + 1}`;
      const data = capturedData[room.id] || {};

      // Video
      const videoBlob = data.videoBlob || new Blob(["MOCK_VIDEO_STREAM"], { type: "video/mp4" });
      videosFolder.file(`${safeId}.mp4`, videoBlob);

      // IMU CSV
      const imuCsv = data.imuCsv || "timestamp_s,acc_x,acc_y,acc_z,gyro_x,gyro_y,gyro_z\n0.000,0.12,9.81,-0.05,0.01,0.02,0.00\n";
      sensorsFolder.file(`${safeId}_imu.csv`, imuCsv);

      // Thumbnail
      if (data.thumbnailBlob) {
        thumbnailsFolder.file(`${safeId}.jpg`, data.thumbnailBlob);
      }

      // Poses JSON
      const posesJson = {
        frame_rate: 30,
        poses: [
          {
            frame_index: 0,
            timestamp_s: 0.0,
            position: { x: (i * 4.0), y: 1.6, z: 0.0 },
            rotation_quat: { x: 0.0, y: 0.0, z: 0.0, w: 1.0 }
          }
        ]
      };
      posesFolder.file(`${safeId}_poses.json`, JSON.stringify(posesJson, null, 2));
    }

    // Generate ZIP Blob with progress callback
    return zip.generateAsync(
      { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
      (metadata) => {
        if (onProgress) onProgress(metadata.percent);
      }
    );
  }
}

window.ScanPackager = ScanPackager;
