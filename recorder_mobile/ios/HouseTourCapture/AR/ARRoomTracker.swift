import Foundation
import ARKit
import RoomPlan

/// Apple ARKit & RoomPlan Multi-Room Structure Capture
@available(iOS 16.0, *)
public class ARRoomTracker: NSObject, ObservableObject, RoomCaptureSessionDelegate {
    @Published public var detectedWallsCount = 0
    @Published public var detectedDoorsCount = 0
    @Published public var detectedOpeningsCount = 0
    
    private var roomCaptureSession: RoomCaptureSession?
    public var finalRoom: CapturedRoom?
    
    public override init() {
        super.init()
        if RoomCaptureSession.isSupported {
            self.roomCaptureSession = RoomCaptureSession()
            self.roomCaptureSession?.delegate = self
        }
    }
    
    public func startScanning() {
        guard let session = roomCaptureSession else { return }
        let configuration = RoomCaptureSession.Configuration()
        session.run(configuration: configuration)
    }
    
    public func stopScanning(completion: @escaping (CapturedRoom?) -> Void) {
        guard let session = roomCaptureSession else {
            completion(nil)
            return
        }
        session.stop()
        completion(finalRoom)
    }
    
    // MARK: - RoomCaptureSessionDelegate
    public func captureSession(_ session: RoomCaptureSession, didUpdate room: CapturedRoom) {
        DispatchQueue.main.async {
            self.detectedWallsCount = room.walls.count
            self.detectedDoorsCount = room.doors.count
            self.detectedOpeningsCount = room.openings.count
            self.finalRoom = room
        }
    }
    
    public func captureSession(_ session: RoomCaptureSession, didEndWith data: CapturedRoomData, error: Error?) {
        print("Captured Room session completed with \(data)")
    }
}
