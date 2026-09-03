import Foundation
import CoreMotion

/// High-Frequency CoreMotion IMU Logger (100Hz Accelerometer & Gyroscope)
public class MotionSensorLogger: ObservableObject {
    private let motionManager = CMMotionManager()
    private var samples: [String] = []
    private var startTime: TimeInterval = 0
    public var isTracking = false
    
    public init() {
        motionManager.deviceMotionUpdateInterval = 1.0 / 100.0 // 100Hz
    }
    
    public func startLogging() {
        guard motionManager.isDeviceMotionAvailable else { return }
        
        samples.removeAll()
        startTime = CACurrentMediaTime()
        isTracking = true
        
        motionManager.startDeviceMotionUpdates(using: .xArbitraryZVertical, to: .main) { [weak self] motion, error in
            guard let self = self, let motion = motion, self.isTracking else { return }
            
            let elapsed = CACurrentMediaTime() - self.startTime
            let timestampStr = String(format: "%.3f", elapsed)
            
            // Acceleration (m/s^2)
            let acc = motion.userAcceleration
            let gravity = motion.gravity
            let totalAccX = String(format: "%.3f", (acc.x + gravity.x) * 9.81)
            let totalAccY = String(format: "%.3f", (acc.y + gravity.y) * 9.81)
            let totalAccZ = String(format: "%.3f", (acc.z + gravity.z) * 9.81)
            
            // Rotation Rate / Gyroscope (rad/s)
            let gyro = motion.rotationRate
            let gyroX = String(format: "%.4f", gyro.x)
            let gyroY = String(format: "%.4f", gyro.y)
            let gyroZ = String(format: "%.4f", gyro.z)
            
            let line = "\(timestampStr),\(totalAccX),\(totalAccY),\(totalAccZ),\(gyroX),\(gyroY),\(gyroZ)"
            self.samples.append(line)
        }
    }
    
    public func stopLogging() -> URL? {
        isTracking = false
        motionManager.stopDeviceMotionUpdates()
        
        let header = "timestamp_s,acc_x,acc_y,acc_z,gyro_x,gyro_y,gyro_z\n"
        let csvContent = header + samples.joined(separator: "\n")
        
        let fileURL = FileManager.default.temporaryDirectory.appendingPathComponent("imu_\(UUID().uuidString.prefix(6)).csv")
        do {
            try csvContent.write(to: fileURL, atomically: true, encoding: .utf8)
            return fileURL
        } catch {
            print("Failed to write IMU CSV: \(error)")
            return nil
        }
    }
}
