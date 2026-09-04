import Foundation

public struct RoomItem: Identifiable, Hashable {
    public let id: String
    public var name: String
    public var floor: String
    public var isRecorded: Bool
    
    public init(id: String = UUID().uuidString.prefix(8).lowercased(), name: String, floor: String, isRecorded: Bool = false) {
        self.id = id
        self.name = name
        self.floor = floor
        self.isRecorded = isRecorded
    }
}
