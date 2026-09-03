package com.housetour.capture.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Android Native Stepper Activity (Jetpack Compose)
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color(0xFF0B0F17)
                ) {
                    MainCaptureStepper()
                }
            }
        }
    }
}

@Composable
fun MainCaptureStepper() {
    var currentStep by remember { mutableStateOf(1) }
    var propertyName by remember { mutableStateOf("3BHK Luxury Penthouse") }
    var clientId by remember { mutableStateOf("agent_77") }
    var address by remember { mutableStateOf("Skyline Boulevard, Mumbai") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Top Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "HOUSETUR CAPTURE",
                color = Color.White,
                fontSize = 18.sp,
                fontWeight = FontWeight.Black
            )
            Text(
                text = "Android Native v1.0",
                color = Color(0xFF06B6D4),
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Step Navigation Bar
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            StepBadge(step = 1, label = "Property", active = currentStep == 1)
            StepBadge(step = 2, label = "Structure", active = currentStep == 2)
            StepBadge(step = 3, label = "Scan", active = currentStep == 3)
            StepBadge(step = 4, label = "Upload", active = currentStep == 4)
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Step Body
        when (currentStep) {
            1 -> PropertySetupScreen(
                propertyName = propertyName,
                clientId = clientId,
                address = address,
                onNameChange = { propertyName = it },
                onClientChange = { clientId = it },
                onAddressChange = { address = it },
                onNext = { currentStep = 2 }
            )
            2 -> StructureSetupScreen(
                onNext = { currentStep = 3 },
                onBack = { currentStep = 1 }
            )
            3 -> CameraScanScreen(
                propertyName = propertyName,
                onComplete = { currentStep = 4 },
                onBack = { currentStep = 2 }
            )
            4 -> UploadScreen(
                propertyName = propertyName,
                onReset = { currentStep = 1 }
            )
        }
    }
}

@Composable
fun StepBadge(step: Int, label: String, active: Boolean) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Surface(
            shape = RoundedCornerShape(50),
            color = if (active) Color(0xFF06B6D4) else Color(0xFF1E293B),
            modifier = Modifier.size(24.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text(
                    text = "$step",
                    color = if (active) Color.Black else Color.White,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
        Text(text = label, color = if (active) Color.White else Color.Gray, fontSize = 10.sp)
    }
}

@Composable
fun PropertySetupScreen(
    propertyName: String,
    clientId: String,
    address: String,
    onNameChange: (String) -> Unit,
    onClientChange: (String) -> Unit,
    onAddressChange: (String) -> Unit,
    onNext: () -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF131B2A)),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Property Setup", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(12.dp))
                
                OutlinedTextField(
                    value = propertyName,
                    onValueChange = onNameChange,
                    label = { Text("Property Name") },
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = clientId,
                    onValueChange = onClientChange,
                    label = { Text("Agent ID") },
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = address,
                    onValueChange = onAddressChange,
                    label = { Text("Location") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
        Spacer(modifier = Modifier.height(24.dp))
        Button(
            onClick = onNext,
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier.fillMaxWidth().height(48.dp)
        ) {
            Text("Proceed to Floor & Room Plan", color = Color.Black, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun StructureSetupScreen(onNext: () -> Unit, onBack: () -> Unit) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text("Floors & Room Topology", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
        Text("Ground Floor: Living Room, Kitchen, Dining", color = Color(0xFF06B6D4), fontSize = 13.sp)
        Text("Terrace: Terrace Lounge", color = Color(0xFF06B6D4), fontSize = 13.sp)
        Spacer(modifier = Modifier.height(24.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Button(onClick = onBack, colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B))) {
                Text("Back")
            }
            Button(onClick = onNext, colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))) {
                Text("Start Camera Scanner", color = Color.Black, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun CameraScanScreen(propertyName: String, onComplete: () -> Unit, onBack: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Recording: Living Room", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
        Text("Sensor: 100Hz SensorManager Active", color = Color(0xFF10B981), fontSize = 12.sp)
        Spacer(modifier = Modifier.height(30.dp))
        Button(
            onClick = onComplete,
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
            shape = RoundedCornerShape(50),
            modifier = Modifier.size(72.dp)
        ) {
            Text("REC", color = Color.White, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun UploadScreen(propertyName: String, onReset: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Property Scan Delivered!", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(6.dp))
        Text("Your capture has been safely received. Our 3D team is generating the interactive tour.", color = Color.Gray, fontSize = 12.sp)
        Spacer(modifier = Modifier.height(24.dp))
        Button(
            onClick = onReset,
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
            modifier = Modifier.fillMaxWidth().height(48.dp)
        ) {
            Text("Record Another Property", color = Color.Black, fontWeight = FontWeight.Bold)
        }
    }
}
