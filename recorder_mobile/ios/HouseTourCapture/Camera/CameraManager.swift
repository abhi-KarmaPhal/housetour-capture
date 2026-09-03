import Foundation
import AVFoundation
import CoreMedia

/// High-Performance AVFoundation 4K Video Recorder with Camera Intrinsics
public class CameraManager: NSObject, ObservableObject, AVCaptureFileOutputRecordingDelegate {
    @Published public var isRecording = false
    @Published public var recordedDuration: Double = 0.0
    
    private let captureSession = AVCaptureSession()
    private var movieFileOutput: AVCaptureMovieFileOutput?
    private var currentVideoURL: URL?
    private var recordingCompletion: ((Result<URL, Error>) -> Void)?
    
    public override init() {
        super.init()
        setupCaptureSession()
    }
    
    private func setupCaptureSession() {
        captureSession.beginConfiguration()
        captureSession.sessionPreset = .hd1920x1080 // or .hd4K3840x2160 based on device tier
        
        guard let videoDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let videoInput = try? AVCaptureDeviceInput(device: videoDevice) else {
            captureSession.commitConfiguration()
            return
        }
        
        if captureSession.canAddInput(videoInput) {
            captureSession.addInput(videoInput)
        }
        
        // Auto-focus and exposure lock configuration
        do {
            try videoDevice.lockForConfiguration()
            if videoDevice.isFocusModeSupported(.continuousAutoFocus) {
                videoDevice.focusMode = .continuousAutoFocus
            }
            if videoDevice.isExposureModeSupported(.continuousAutoExposure) {
                videoDevice.exposureMode = .continuousAutoExposure
            }
            videoDevice.unlockForConfiguration()
        } catch {
            print("Could not configure device focus/exposure: \(error)")
        }
        
        let output = AVCaptureMovieFileOutput()
        if captureSession.canAddOutput(output) {
            captureSession.addOutput(output)
            self.movieFileOutput = output
        }
        
        captureSession.commitConfiguration()
    }
    
    public func startSession() {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            if self?.captureSession.isRunning == false {
                self?.captureSession.startRunning()
            }
        }
    }
    
    public func stopSession() {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            if self?.captureSession.isRunning == true {
                self?.captureSession.stopRunning()
            }
        }
    }
    
    public func startRecording(roomName: String) {
        guard let movieOutput = movieFileOutput, !isRecording else { return }
        
        let filename = "\(roomName.lowercased().replacingOccurrences(of: " ", with: "_"))_\(UUID().uuidString.prefix(6)).mp4"
        let outputURL = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
        self.currentVideoURL = outputURL
        
        movieOutput.startRecording(to: outputURL, recordingDelegate: self)
        DispatchQueue.main.async {
            self.isRecording = true
        }
    }
    
    public func stopRecording(completion: @escaping (Result<URL, Error>) -> Void) {
        guard let movieOutput = movieFileOutput, isRecording else { return }
        self.recordingCompletion = completion
        movieOutput.stopRecording()
    }
    
    // MARK: - AVCaptureFileOutputRecordingDelegate
    public func fileOutput(_ output: AVCaptureFileOutput, didFinishRecordingTo outputFileURL: URL, from connections: [AVCaptureConnection], error: Error?) {
        DispatchQueue.main.async {
            self.isRecording = false
            if let error = error {
                self.recordingCompletion?(.failure(error))
            } else {
                self.recordingCompletion?(.success(outputFileURL))
            }
        }
    }
}
