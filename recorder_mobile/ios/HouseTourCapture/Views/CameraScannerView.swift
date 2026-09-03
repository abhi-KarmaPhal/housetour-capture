import SwiftUI
import AVFoundation

public struct CameraScannerView: View {
    var propertyName: String
    var rooms: [(id: String, name: String, floor: String)]
    var onComplete: () -> Void
    var onBack: () -> Void
    
    @StateObject private var cameraManager = CameraManager()
    @StateObject private var motionLogger = MotionSensorLogger()
    
    @State private var currentRoomIndex = 0
    @State private var timerSeconds = 0
    @State private var timer: Timer?
    @State private var recordedRoomCount = 0
    
    public var body: some View {
        ZStack {
            // Viewfinder Black Background
            Color.black.ignoresSafeArea()
            
            VStack {
                // Top Overlay
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        if currentRoomIndex < rooms.count {
                            Text(rooms[currentRoomIndex].floor.uppercased())
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(Color(red: 6/255, green: 182/255, blue: 212/255))
                            Text(rooms[currentRoomIndex].name)
                                .font(.system(size: 20, weight: .heavy))
                                .foregroundColor(.white)
                        }
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 6) {
                        HStack(spacing: 4) {
                            Circle()
                                .fill(Color(red: 16/255, green: 185/255, blue: 129/255))
                                .frame(width: 6, height: 6)
                            Text("CoreMotion 100Hz")
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundColor(.white)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.black.opacity(0.6))
                        .cornerRadius(12)
                        
                        Text(formatTimer(timerSeconds))
                            .font(.system(size: 14, weight: .bold, design: .monospaced))
                            .foregroundColor(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.black.opacity(0.6))
                            .cornerRadius(6)
                    }
                }
                .padding(20)
                .background(
                    LinearGradient(colors: [Color.black.opacity(0.8), Color.clear], startPoint: .top, endPoint: .bottom)
                )
                
                Spacer()
                
                // Guidance Card
                VStack(spacing: 4) {
                    Text(cameraManager.isRecording ? "Recording in progress..." : "Stand in Room Center")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                    Text(cameraManager.isRecording ? "Rotate slowly and steadily 360 degrees" : "Hold iPhone vertical and tap the red shutter to start")
                        .font(.system(size: 11))
                        .foregroundColor(.gray)
                }
                .padding(12)
                .background(Color(red: 19/255, green: 27/255, blue: 42/255).opacity(0.9))
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color(red: 6/255, green: 182/255, blue: 212/255), lineWidth: 1)
                )
                .padding(.horizontal, 20)
                
                Spacer()
                
                // Shutter Button & Transitions
                VStack(spacing: 14) {
                    if !cameraManager.isRecording {
                        Button(action: startRoomScan) {
                            Circle()
                                .fill(Color.white)
                                .frame(width: 72, height: 72)
                                .overlay(
                                    Circle()
                                        .stroke(Color.red, lineWidth: 4)
                                        .frame(width: 60, height: 60)
                                )
                        }
                    } else {
                        Button(action: stopRoomScan) {
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color.red)
                                .frame(width: 32, height: 32)
                                .frame(width: 72, height: 72)
                                .background(Circle().fill(Color.white))
                        }
                    }
                    
                    HStack {
                        Button(action: onBack) {
                            Text("Reconfigure Plan")
                                .font(.system(size: 12))
                                .foregroundColor(.gray)
                        }
                        Spacer()
                        Button(action: onComplete) {
                            HStack(spacing: 4) {
                                Text("Finish & Upload (\(recordedRoomCount))")
                                    .font(.system(size: 12, weight: .bold))
                                Image(systemName: "arrow.right")
                            }
                            .foregroundColor(Color(red: 16/255, green: 185/255, blue: 129/255))
                        }
                    }
                    .padding(.horizontal, 20)
                }
                .padding(.bottom, 24)
                .background(
                    LinearGradient(colors: [Color.clear, Color.black.opacity(0.9)], startPoint: .top, endPoint: .bottom)
                )
            }
        }
        .onAppear {
            cameraManager.startSession()
        }
        .onDisappear {
            cameraManager.stopSession()
        }
    }
    
    private func startRoomScan() {
        guard currentRoomIndex < rooms.count else { return }
        cameraManager.startRecording(roomName: rooms[currentRoomIndex].name)
        motionLogger.startLogging()
        
        timerSeconds = 0
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            timerSeconds += 1
        }
    }
    
    private func stopRoomScan() {
        timer?.invalidate()
        timer = nil
        
        cameraManager.stopRecording { result in
            let _ = motionLogger.stopLogging()
            recordedRoomCount += 1
            
            if currentRoomIndex + 1 < rooms.count {
                currentRoomIndex += 1
            } else {
                onComplete()
            }
        }
    }
    
    private func formatTimer(_ seconds: Int) -> String {
        let mins = String(format: "%02d", seconds / 60)
        let secs = String(format: "%02d", seconds % 60)
        return "\(mins):\(secs)"
    }
}
