import SwiftUI

public struct FloorPlanSetupView: View {
    @Binding var floors: [String]
    @Binding var rooms: [(id: String, name: String, floor: String)]
    @State private var selectedFloor = "Ground Floor"
    @State private var customRoomName = ""
    var onNext: () -> Void
    var onBack: () -> Void
    
    private let quickRoomSuggestions = ["Living Room", "Kitchen & Dining", "Master Bedroom", "Balcony", "Terrace Lounge", "Corridor"]
    
    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                // Header
                VStack(spacing: 6) {
                    Image(systemName: "square.stack.3d.up.fill")
                        .font(.system(size: 28))
                        .foregroundColor(Color(red: 6/255, green: 182/255, blue: 212/255))
                    Text("Floors & Room Topology")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                    Text("Select a floor level and add rooms to capture.")
                        .font(.system(size: 11))
                        .foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity)
                .padding(14)
                .background(Color(red: 19/255, green: 27/255, blue: 42/255))
                .cornerRadius(12)
                
                // Floor Selector Pills
                VStack(alignment: .leading, spacing: 8) {
                    Text("ACTIVE FLOOR LEVEL")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.gray)
                    
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(floors, id: \.self) { floor in
                                Button(action: { selectedFloor = floor }) {
                                    Text(floor)
                                        .font(.system(size: 12, weight: .semibold))
                                        .padding(.horizontal, 14)
                                        .padding(.vertical, 8)
                                        .background(selectedFloor == floor ? Color(red: 6/255, green: 182/255, blue: 212/255) : Color(red: 30/255, green: 41/255, blue: 59/255))
                                        .foregroundColor(selectedFloor == floor ? .black : .white)
                                        .cornerRadius(20)
                                }
                            }
                        }
                    }
                }
                
                // Quick Add Room Chips
                VStack(alignment: .leading, spacing: 8) {
                    Text("QUICK ADD ROOMS")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.gray)
                    
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 120))], spacing: 8) {
                        ForEach(quickRoomSuggestions, id: \.self) { roomName in
                            Button(action: { addRoom(name: roomName) }) {
                                HStack(spacing: 4) {
                                    Image(systemName: "plus")
                                        .font(.system(size: 10, weight: .bold))
                                    Text(roomName)
                                        .font(.system(size: 11, weight: .medium))
                                }
                                .padding(.horizontal, 10)
                                .padding(.vertical, 7)
                                .background(Color(red: 30/255, green: 41/255, blue: 59/255))
                                .foregroundColor(.white)
                                .cornerRadius(8)
                            }
                        }
                    }
                }
                
                // Configured Rooms List
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("CONFIGURED ROOMS (\(rooms.count))")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.gray)
                        Spacer()
                    }
                    
                    ForEach(Array(rooms.enumerated()), id: \.element.id) { index, room in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("\(index + 1). \(room.name)")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(.white)
                                Text(room.floor)
                                    .font(.system(size: 10))
                                    .foregroundColor(Color(red: 6/255, green: 182/255, blue: 212/255))
                            }
                            Spacer()
                            Button(action: { rooms.remove(at: index) }) {
                                Image(systemName: "trash")
                                    .font(.system(size: 12))
                                    .foregroundColor(.red.opacity(0.8))
                            }
                        }
                        .padding(10)
                        .background(Color(red: 19/255, green: 27/255, blue: 42/255))
                        .cornerRadius(8)
                    }
                }
                
                // Action Buttons
                HStack(spacing: 12) {
                    Button(action: onBack) {
                        HStack {
                            Image(systemName: "arrow.left")
                            Text("Back")
                        }
                        .foregroundColor(.white)
                        .padding(.vertical, 12)
                        .padding(.horizontal, 16)
                        .background(Color(red: 30/255, green: 41/255, blue: 59/255))
                        .cornerRadius(10)
                    }
                    
                    Button(action: onNext) {
                        HStack {
                            Text("Start Camera Scanner")
                                .font(.system(size: 13, weight: .bold))
                            Image(systemName: "camera.fill")
                        }
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color(red: 16/255, green: 185/255, blue: 129/255))
                        .cornerRadius(10)
                    }
                }
            }
            .padding(20)
        }
    }
    
    private func addRoom(name: String) {
        let id = "room_\(UUID().uuidString.prefix(6))"
        rooms.append((id: id, name: name, floor: selectedFloor))
    }
}
