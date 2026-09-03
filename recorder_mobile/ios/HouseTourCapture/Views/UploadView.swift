import SwiftUI

public struct UploadView: View {
    var propertyName: String
    var clientId: String
    var address: String
    var roomsCount: Int
    var onReset: () -> Void
    
    @State private var isUploading = false
    @State private var uploadProgress: Double = 0.0
    @State private var isSuccess = false
    @State private var createdJobId = "-"
    
    public var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header
                VStack(spacing: 8) {
                    Image(systemName: isSuccess ? "checkmark.circle.fill" : "shippingbox.and.arrow.backward.fill")
                        .font(.system(size: 40))
                        .foregroundColor(isSuccess ? Color(red: 16/255, green: 185/255, blue: 129/255) : Color(red: 6/255, green: 182/255, blue: 212/255))
                    Text(isSuccess ? "Scan Package Uploaded!" : "Assemble & Upload Tour")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.white)
                    Text(isSuccess ? "Reconstruction pipeline is now running on your Builder Engine." : "Compressing 4K room videos and 100Hz IMU trajectories into myhouse.scan.")
                        .font(.system(size: 12))
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(20)
                .background(Color(red: 19/255, green: 27/255, blue: 42/255))
                .cornerRadius(14)
                
                // Summary Card
                VStack(alignment: .leading, spacing: 10) {
                    summaryRow(label: "Property Name:", value: propertyName)
                    summaryRow(label: "Rooms Included:", value: "\(roomsCount) Rooms")
                    summaryRow(label: "Transmission:", value: "Encrypted Cloud Delivery")
                    if isSuccess {
                        summaryRow(label: "Confirmation ID:", value: createdJobId)
                    }
                }
                .padding(16)
                .background(Color(red: 30/255, green: 41/255, blue: 59/255))
                .cornerRadius(12)
                
                // Progress Bar
                if isUploading {
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text("Uploading to Studio Builder...")
                                .font(.system(size: 11))
                                .foregroundColor(.gray)
                            Spacer()
                            Text("\(Int(uploadProgress * 100))%")
                                .font(.system(size: 11, weight: .bold, design: .monospaced))
                                .foregroundColor(Color(red: 6/255, green: 182/255, blue: 212/255))
                        }
                        ProgressView(value: uploadProgress)
                            .tint(Color(red: 6/255, green: 182/255, blue: 212/255))
                    }
                }
                
                // Action Buttons
                if !isSuccess {
                    Button(action: startUpload) {
                        HStack {
                            Text(isUploading ? "Uploading..." : "Upload myhouse.scan to Builder")
                                .font(.system(size: 14, weight: .bold))
                            Image(systemName: "arrow.up.circle.fill")
                        }
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color(red: 16/255, green: 185/255, blue: 129/255))
                        .cornerRadius(10)
                    }
                    .disabled(isUploading)
                } else {
                    Button(action: onReset) {
                        Text("Record Another Property")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(Color(red: 30/255, green: 41/255, blue: 59/255))
                            .cornerRadius(10)
                    }
                }
            }
            .padding(20)
        }
    }
    
    private func summaryRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 12))
                .foregroundColor(.gray)
            Spacer()
            Text(value)
                .font(.system(size: 12, weight: .semibold, design: .monospaced))
                .foregroundColor(.white)
        }
    }
    
    private func startUpload() {
        isUploading = true
        uploadProgress = 0.0
        
        Timer.scheduledTimer(withTimeInterval: 0.2, repeats: true) { timer in
            uploadProgress += 0.1
            if uploadProgress >= 1.0 {
                timer.invalidate()
                isUploading = false
                isSuccess = true
                createdJobId = UUID().uuidString.lowercased()
            }
        }
    }
}
