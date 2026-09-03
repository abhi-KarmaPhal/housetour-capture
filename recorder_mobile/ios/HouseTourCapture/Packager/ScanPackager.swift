import Foundation

/// Assembles iOS scan recordings, IMU data, and topology into myhouse.scan ZIP
public class ScanPackager {
    public static func buildScanPackage(
        houseName: String,
        clientId: String,
        address: String,
        rooms: [(id: String, name: String, floor: String, videoURL: URL, imuURL: URL)],
        completion: @escaping (Result<URL, Error>) -> Void
    ) {
        let tempDir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let videosDir = tempDir.appendingPathComponent("videos")
        let sensorsDir = tempDir.appendingPathComponent("sensors")
        let thumbnailsDir = tempDir.appendingPathComponent("thumbnails")
        let posesDir = tempDir.appendingPathComponent("poses")
        
        do {
            try FileManager.default.createDirectory(at: videosDir, withIntermediateDirectories: true)
            try FileManager.default.createDirectory(at: sensorsDir, withIntermediateDirectories: true)
            try FileManager.default.createDirectory(at: thumbnailsDir, withIntermediateDirectories: true)
            try FileManager.default.createDirectory(at: posesDir, withIntermediateDirectories: true)
            
            // 1. Manifest
            let manifest: [String: Any] = [
                "format": "house_scan",
                "version": "1.0",
                "created_by": "HouseTourNative_iOS",
                "created_at": ISO8601DateFormatter().string(from: Date())
            ]
            let manifestData = try JSONSerialization.data(withJSONObject: manifest, options: .prettyPrinted)
            try manifestData.write(to: tempDir.appendingPathComponent("manifest.json"))
            
            // 2. Metadata
            let metadata: [String: Any] = [
                "house_name": houseName,
                "client_id": clientId,
                "address": address,
                "capture_date": String(ISO8601DateFormatter().string(from: Date()).prefix(10)),
                "notes": "Native iOS ARKit + CoreMotion Capture"
            ]
            let metadataData = try JSONSerialization.data(withJSONObject: metadata, options: .prettyPrinted)
            try metadataData.write(to: tempDir.appendingPathComponent("metadata.json"))
            
            // 3. Devices
            let devices: [String: Any] = [
                "devices": [[
                    "id": "ios_device_01",
                    "platform": "ios",
                    "model": "iPhone Pro",
                    "os_version": "iOS 17+",
                    "app_version": "1.0.0",
                    "camera_specs": ["resolution": "1920x1080", "fps": 30, "lens": "wide"]
                ]]
            ]
            let devicesData = try JSONSerialization.data(withJSONObject: devices, options: .prettyPrinted)
            try devicesData.write(to: tempDir.appendingPathComponent("devices.json"))
            
            // 4. Rooms Document
            var roomsDoc: [[String: Any]] = []
            for (index, room) in rooms.enumerated() {
                let safeId = room.id
                let videoDest = videosDir.appendingPathComponent("\(safeId).mp4")
                let imuDest = sensorsDir.appendingPathComponent("\(safeId)_imu.csv")
                
                try? FileManager.default.copyItem(at: room.videoURL, to: videoDest)
                try? FileManager.default.copyItem(at: room.imuURL, to: imuDest)
                
                roomsDoc.append([
                    "id": safeId,
                    "name": room.name,
                    "floor": room.floor,
                    "order": index + 1,
                    "video": "videos/\(safeId).mp4",
                    "imu": "sensors/\(safeId)_imu.csv",
                    "poses": "poses/\(safeId)_poses.json",
                    "thumbnail": "thumbnails/\(safeId).jpg",
                    "connected_to": []
                ])
            }
            
            let roomsData = try JSONSerialization.data(withJSONObject: ["rooms": roomsDoc], options: .prettyPrinted)
            try roomsData.write(to: tempDir.appendingPathComponent("rooms.json"))
            
            // 5. Package as single scan container
            let scanPackageURL = FileManager.default.temporaryDirectory.appendingPathComponent("\(houseName.lowercased().replacingOccurrences(of: " ", with: "_")).scan")
            
            // Using Foundation file coordinator or system zip
            let coordinator = NSFileCoordinator()
            var error: NSError?
            coordinator.coordinate(readingItemAt: tempDir, options: .forUploading, error: &error) { zipURL in
                try? FileManager.default.copyItem(at: zipURL, to: scanPackageURL)
                completion(.success(scanPackageURL))
            }
            if let error = error {
                completion(.failure(error))
            }
        } catch {
            completion(.failure(error))
        }
    }
}
