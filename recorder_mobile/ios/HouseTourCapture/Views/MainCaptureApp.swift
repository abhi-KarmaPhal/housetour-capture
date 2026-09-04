import SwiftUI

@main
struct HouseTourCaptureApp: App {
    var body: some Scene {
        WindowGroup {
            MainCaptureFlowView()
                .preferredColorScheme(.dark)
        }
    }
}

public struct MainCaptureFlowView: View {
    @State private var currentStep = 1
    @State private var propertyName = ""
    @State private var clientId = ""
    @State private var address = ""
    @State private var selectedFloors: [String] = ["Ground Floor"]
    @State private var rooms: [RoomItem] = []
    
    public init() {}
    
    public var body: some View {
        NavigationStack {
            ZStack {
                Color(red: 11/255, green: 15/255, blue: 23/255)
                    .ignoresSafeArea()
                
                VStack(spacing: 0) {
                    // Top Brand Header
                    HStack {
                        Image(systemName: "video.fill.badge.plus")
                            .font(.system(size: 20))
                            .foregroundColor(Color(red: 6/255, green: 182/255, blue: 212/255))
                        Text("HOUSETOUR")
                            .font(.system(size: 18, weight: .black))
                            .foregroundColor(.white)
                        Text("CAPTURE")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(Color(red: 16/255, green: 185/255, blue: 129/255))
                        Spacer()
                        Text("iOS Native v1.0")
                            .font(.system(size: 10, weight: .semibold, design: .monospaced))
                            .foregroundColor(.gray)
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 14)
                    
                    // Stepper Indicator
                    HStack(spacing: 8) {
                        ForEach(1...4, id: \.self) { step in
                            HStack(spacing: 4) {
                                Circle()
                                    .fill(step <= currentStep ? Color(red: 6/255, green: 182/255, blue: 212/255) : Color(white: 0.2))
                                    .frame(width: 18, height: 18)
                                    .overlay(
                                        Text("\(step)")
                                            .font(.system(size: 9, weight: .bold))
                                            .foregroundColor(.black)
                                    )
                                Text(stepTitle(for: step))
                                    .font(.system(size: 10, weight: .semibold))
                                    .foregroundColor(step == currentStep ? .white : .gray)
                            }
                            if step < 4 {
                                Rectangle()
                                    .fill(Color(white: 0.2))
                                    .frame(height: 1)
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 16)
                    
                    // Body Views
                    TabView(selection: $currentStep) {
                        PropertySetupView(propertyName: $propertyName, clientId: $clientId, address: $address, onNext: { currentStep = 2 })
                            .tag(1)
                        
                        FloorPlanSetupView(floors: $selectedFloors, rooms: $rooms, onNext: { currentStep = 3 }, onBack: { currentStep = 1 })
                            .tag(2)
                        
                        CameraScannerView(propertyName: propertyName, rooms: rooms, onComplete: { currentStep = 4 }, onBack: { currentStep = 2 })
                            .tag(3)
                        
                        UploadView(propertyName: propertyName, clientId: clientId, address: address, roomsCount: rooms.count, onReset: {
                            currentStep = 1
                            propertyName = ""
                            clientId = ""
                            address = ""
                            rooms = []
                        })
                            .tag(4)
                    }
                    .tabViewStyle(.page(indexDisplayMode: .never))
                }
            }
        }
    }
    
    private func stepTitle(for step: Int) -> String {
        switch step {
        case 1: return "Property"
        case 2: return "Structure"
        case 3: return "Scan"
        case 4: return "Upload"
        default: return ""
        }
    }
}
