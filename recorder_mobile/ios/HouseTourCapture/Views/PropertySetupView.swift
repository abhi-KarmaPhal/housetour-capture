import SwiftUI

public struct PropertySetupView: View {
    @Binding var propertyName: String
    @Binding var clientId: String
    @Binding var address: String
    var onNext: () -> Void
    
    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                // Hero Info Card
                VStack(spacing: 8) {
                    Image(systemName: "building.2.fill")
                        .font(.system(size: 32))
                        .foregroundColor(Color(red: 6/255, green: 182/255, blue: 212/255))
                    Text("Property Listing Info")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.white)
                    Text("Configure the property details for automated 3D reconstruction.")
                        .font(.system(size: 12))
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(18)
                .background(Color(red: 19/255, green: 27/255, blue: 42/255))
                .cornerRadius(14)
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(Color(red: 6/255, green: 182/255, blue: 212/255).opacity(0.3), lineWidth: 1)
                )
                
                // Form Fields
                VStack(alignment: .leading, spacing: 12) {
                    Text("Property Name / Title")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.gray)
                    TextField("e.g. 3BHK Penthouse", text: $propertyName)
                        .textFieldStyle(CustomDarkTextFieldStyle())
                    
                    Text("Client / Agency ID")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.gray)
                    TextField("e.g. agent_77", text: $clientId)
                        .textFieldStyle(CustomDarkTextFieldStyle())
                    
                    Text("Address / Location")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.gray)
                    TextField("e.g. Marine Drive, Mumbai", text: $address)
                        .textFieldStyle(CustomDarkTextFieldStyle())
                }
                
                Spacer(minLength: 20)
                
                Button(action: onNext) {
                    HStack {
                        Text("Proceed to Floor & Room Plan")
                            .font(.system(size: 14, weight: .bold))
                        Image(systemName: "arrow.right")
                    }
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color(red: 16/255, green: 185/255, blue: 129/255))
                    .cornerRadius(10)
                }
            }
            .padding(20)
        }
    }
}

struct CustomDarkTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding(12)
            .background(Color(red: 30/255, green: 41/255, blue: 59/255))
            .foregroundColor(.white)
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color.white.opacity(0.15), lineWidth: 1)
            )
    }
}
