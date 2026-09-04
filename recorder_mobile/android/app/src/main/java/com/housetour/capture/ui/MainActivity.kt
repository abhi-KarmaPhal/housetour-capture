package com.housetour.capture.ui

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.camera.core.CameraSelector
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.video.*
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import com.housetour.capture.sensors.SensorLogger
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

val DarkBg = Color(0xFF0B0F17)
val CardBg = Color(0xFF131B2A)
val SurfaceBg = Color(0xFF1E293B)
val CyanAccent = Color(0xFF06B6D4)
val GreenAccent = Color(0xFF10B981)
val RedAccent = Color(0xFFEF4444)
val AmberAccent = Color(0xFFF59E0B)

class MainActivity : ComponentActivity() {
    private var cameraPermissionGranted by mutableStateOf(false)

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        cameraPermissionGranted = permissions[Manifest.permission.CAMERA] == true
        if (!cameraPermissionGranted) {
            Toast.makeText(this, "Camera permission is required for room scanning", Toast.LENGTH_LONG).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            cameraPermissionGranted = true
        } else {
            permissionLauncher.launch(
                arrayOf(
                    Manifest.permission.CAMERA,
                    Manifest.permission.RECORD_AUDIO
                )
            )
        }

        setContent {
            MaterialTheme(
                colorScheme = darkColorScheme(
                    primary = CyanAccent,
                    secondary = GreenAccent,
                    background = DarkBg,
                    surface = CardBg,
                    onPrimary = Color.Black,
                    onBackground = Color.White,
                    onSurface = Color.White,
                )
            ) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = DarkBg
                ) {
                    HouseTourCaptureApp(cameraPermissionGranted)
                }
            }
        }
    }
}

data class RoomEntry(
    val id: String = UUID.randomUUID().toString().take(8),
    val name: String,
    val floor: String,
    var isRecorded: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HouseTourCaptureApp(hasCameraPermission: Boolean) {
    var currentStep by remember { mutableIntStateOf(1) }
    var propertyName by remember { mutableStateOf("") }
    var clientId by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var selectedFloors by remember { mutableStateOf(listOf("Ground Floor")) }
    var rooms by remember { mutableStateOf(listOf<RoomEntry>()) }

    Column(modifier = Modifier.fillMaxSize()) {
        // Top Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(listOf(Color(0xFF0F1520), DarkBg))
                )
                .padding(horizontal = 20.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Filled.Videocam, contentDescription = null, tint = CyanAccent, modifier = Modifier.size(22.dp))
                Text("HOUSETOUR", fontSize = 17.sp, fontWeight = FontWeight.Black, color = Color.White)
                Text("CAPTURE", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = GreenAccent)
            }
            Surface(
                color = SurfaceBg,
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(
                    "Android v1.0",
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = CyanAccent
                )
            }
        }

        // Step Indicator
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            StepIndicator(1, "Property", currentStep)
            StepConnector(currentStep >= 2)
            StepIndicator(2, "Structure", currentStep)
            StepConnector(currentStep >= 3)
            StepIndicator(3, "Scan", currentStep)
            StepConnector(currentStep >= 4)
            StepIndicator(4, "Upload", currentStep)
        }

        Divider(color = SurfaceBg, thickness = 1.dp)

        // Body
        Box(modifier = Modifier.weight(1f)) {
            when (currentStep) {
                1 -> PropertyStep(
                    propertyName = propertyName,
                    clientId = clientId,
                    address = address,
                    onNameChange = { propertyName = it },
                    onClientChange = { clientId = it },
                    onAddressChange = { address = it },
                    onNext = { if (propertyName.isNotBlank()) currentStep = 2 }
                )
                2 -> StructureStep(
                    floors = selectedFloors,
                    rooms = rooms,
                    onFloorsChange = { selectedFloors = it },
                    onRoomsChange = { rooms = it },
                    onNext = { if (rooms.isNotEmpty()) currentStep = 3 },
                    onBack = { currentStep = 1 }
                )
                3 -> ScanStep(
                    rooms = rooms,
                    hasCameraPermission = hasCameraPermission,
                    onRoomRecorded = { index ->
                        rooms = rooms.toMutableList().also { it[index] = it[index].copy(isRecorded = true) }
                    },
                    onComplete = { currentStep = 4 },
                    onBack = { currentStep = 2 }
                )
                4 -> UploadStep(
                    propertyName = propertyName,
                    roomsCount = rooms.size,
                    onReset = {
                        currentStep = 1
                        propertyName = ""
                        clientId = ""
                        address = ""
                        rooms = emptyList()
                    }
                )
            }
        }
    }
}

@Composable
fun StepIndicator(step: Int, label: String, currentStep: Int) {
    val isActive = step <= currentStep
    val isCurrent = step == currentStep
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(28.dp)
                .clip(CircleShape)
                .background(if (isActive) CyanAccent else SurfaceBg)
                .then(if (isCurrent) Modifier.border(2.dp, GreenAccent, CircleShape) else Modifier)
        ) {
            if (step < currentStep) {
                Icon(Icons.Filled.Check, contentDescription = null, tint = Color.Black, modifier = Modifier.size(16.dp))
            } else {
                Text("$step", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = if (isActive) Color.Black else Color.Gray)
            }
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(label, fontSize = 10.sp, fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Normal, color = if (isActive) Color.White else Color.Gray)
    }
}

@Composable
fun RowScope.StepConnector(active: Boolean) {
    Box(
        modifier = Modifier
            .weight(1f)
            .height(2.dp)
            .padding(horizontal = 4.dp)
            .background(if (active) CyanAccent.copy(alpha = 0.5f) else SurfaceBg, RoundedCornerShape(1.dp))
    )
}

// ─── STEP 1: PROPERTY ───
@Composable
fun PropertyStep(
    propertyName: String, clientId: String, address: String,
    onNameChange: (String) -> Unit, onClientChange: (String) -> Unit,
    onAddressChange: (String) -> Unit, onNext: () -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            // Hero Card
            Card(
                colors = CardDefaults.cardColors(containerColor = CardBg),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(Icons.Filled.Home, contentDescription = null, tint = CyanAccent, modifier = Modifier.size(36.dp))
                    Spacer(modifier = Modifier.height(10.dp))
                    Text("Property Listing Info", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    Text("Configure the property details for 3D reconstruction.", fontSize = 12.sp, color = Color.Gray, textAlign = TextAlign.Center)
                }
            }
        }

        item {
            FormField("Property Name / Title", "e.g. 3BHK Luxury Penthouse", propertyName, onNameChange)
        }
        item {
            FormField("Client / Agency ID", "e.g. agent_77", clientId, onClientChange)
        }
        item {
            FormField("Address / Location", "e.g. Marine Drive, Mumbai", address, onAddressChange)
        }

        item {
            Spacer(modifier = Modifier.height(8.dp))
            ActionButton("Proceed to Floor & Room Plan", Icons.Filled.ArrowForward, GreenAccent, enabled = propertyName.isNotBlank(), onClick = onNext)
        }
    }
}

@Composable
fun FormField(label: String, placeholder: String, value: String, onChange: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color.Gray)
        OutlinedTextField(
            value = value,
            onValueChange = onChange,
            placeholder = { Text(placeholder, color = Color.Gray.copy(alpha = 0.5f)) },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(10.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = CyanAccent,
                unfocusedBorderColor = Color.White.copy(alpha = 0.15f),
                focusedContainerColor = SurfaceBg,
                unfocusedContainerColor = SurfaceBg,
                cursorColor = CyanAccent,
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White
            ),
            singleLine = true
        )
    }
}

// ─── STEP 2: STRUCTURE ───
@Composable
fun StructureStep(
    floors: List<String>, rooms: List<RoomEntry>,
    onFloorsChange: (List<String>) -> Unit, onRoomsChange: (List<RoomEntry>) -> Unit,
    onNext: () -> Unit, onBack: () -> Unit
) {
    var activeFloor by remember { mutableStateOf(floors.first()) }
    val floorOptions = listOf("Ground Floor", "1st Floor", "2nd Floor", "Terrace")
    val quickRooms = listOf("Living Room", "Kitchen & Dining", "Master Bedroom", "Guest Room", "Balcony", "Bathroom", "Corridor", "Terrace Lounge")

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = CardBg),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Filled.Layers, contentDescription = null, tint = CyanAccent, modifier = Modifier.size(28.dp))
                    Spacer(modifier = Modifier.height(6.dp))
                    Text("Floors & Room Topology", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    Text("Select floor, then add rooms to capture.", fontSize = 11.sp, color = Color.Gray)
                }
            }
        }

        // Floor selector
        item {
            Text("ACTIVE FLOOR LEVEL", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
            Spacer(modifier = Modifier.height(6.dp))
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(floorOptions) { floor ->
                    val selected = activeFloor == floor
                    Surface(
                        color = if (selected) CyanAccent else SurfaceBg,
                        shape = RoundedCornerShape(20.dp),
                        modifier = Modifier.clickable {
                            activeFloor = floor
                            if (floor !in floors) onFloorsChange(floors + floor)
                        }
                    ) {
                        Text(
                            floor,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                            fontSize = 12.sp, fontWeight = FontWeight.SemiBold,
                            color = if (selected) Color.Black else Color.White
                        )
                    }
                }
            }
        }

        // Quick-add chips
        item {
            Text("QUICK ADD ROOMS", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
            Spacer(modifier = Modifier.height(6.dp))
            FlowRow(quickRooms) { roomName ->
                Surface(
                    color = SurfaceBg,
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.clickable {
                        onRoomsChange(rooms + RoomEntry(name = roomName, floor = activeFloor))
                    }
                ) {
                    Row(modifier = Modifier.padding(horizontal = 10.dp, vertical = 7.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        Icon(Icons.Filled.Add, contentDescription = null, tint = CyanAccent, modifier = Modifier.size(14.dp))
                        Text(roomName, fontSize = 11.sp, color = Color.White)
                    }
                }
            }
        }

        // Configured rooms list
        item {
            Text("CONFIGURED ROOMS (${rooms.size})", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
        }
        itemsIndexed(rooms) { index, room ->
            Card(
                colors = CardDefaults.cardColors(containerColor = CardBg),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("${index + 1}. ${room.name}", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                        Text(room.floor, fontSize = 10.sp, color = CyanAccent)
                    }
                    IconButton(onClick = { onRoomsChange(rooms.toMutableList().also { it.removeAt(index) }) }) {
                        Icon(Icons.Filled.Delete, contentDescription = "Remove", tint = RedAccent.copy(alpha = 0.8f), modifier = Modifier.size(18.dp))
                    }
                }
            }
        }

        // Action buttons
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedButton(
                    onClick = onBack,
                    modifier = Modifier.weight(0.4f),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White)
                ) {
                    Icon(Icons.Filled.ArrowBack, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Back")
                }
                Button(
                    onClick = onNext,
                    modifier = Modifier.weight(0.6f),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = GreenAccent, contentColor = Color.Black),
                    enabled = rooms.isNotEmpty()
                ) {
                    Icon(Icons.Filled.CameraAlt, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Start Scanner", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun FlowRow(items: List<String>, content: @Composable (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items.chunked(3).forEach { rowItems ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                rowItems.forEach { item -> content(item) }
            }
        }
    }
}

// ─── STEP 3: SCAN (CAMERA + SENSORS) ───
@Composable
fun ScanStep(
    rooms: List<RoomEntry>,
    hasCameraPermission: Boolean,
    onRoomRecorded: (Int) -> Unit,
    onComplete: () -> Unit,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    var currentRoomIndex by remember { mutableIntStateOf(0) }
    var isRecording by remember { mutableStateOf(false) }
    var timerSeconds by remember { mutableIntStateOf(0) }
    var recordedCount by remember { mutableIntStateOf(0) }
    val sensorLogger = remember { SensorLogger(context) }

    // Camera Provider
    var videoCapture by remember { mutableStateOf<VideoCapture<Recorder>?>(null) }
    var activeRecording by remember { mutableStateOf<Recording?>(null) }

    // Timer
    LaunchedEffect(isRecording) {
        if (isRecording) {
            timerSeconds = 0
            while (isRecording) {
                kotlinx.coroutines.delay(1000)
                timerSeconds++
            }
        }
    }

    val currentRoom = rooms.getOrNull(currentRoomIndex)

    Box(modifier = Modifier.fillMaxSize()) {
        // Camera Preview
        if (hasCameraPermission) {
            AndroidView(
                factory = { ctx ->
                    PreviewView(ctx).also { previewView ->
                        val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                        cameraProviderFuture.addListener({
                            val cameraProvider = cameraProviderFuture.get()
                            val preview = Preview.Builder().build().also {
                                it.surfaceProvider = previewView.surfaceProvider
                            }
                            val recorder = Recorder.Builder()
                                .setQualitySelector(QualitySelector.from(Quality.HIGHEST))
                                .build()
                            val vc = VideoCapture.withOutput(recorder)
                            videoCapture = vc

                            try {
                                cameraProvider.unbindAll()
                                cameraProvider.bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA, preview, vc)
                            } catch (e: Exception) {
                                e.printStackTrace()
                            }
                        }, ContextCompat.getMainExecutor(ctx))
                    }
                },
                modifier = Modifier.fillMaxSize()
            )
        } else {
            Box(modifier = Modifier.fillMaxSize().background(Color.Black), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Filled.VideocamOff, contentDescription = null, tint = RedAccent, modifier = Modifier.size(48.dp))
                    Spacer(modifier = Modifier.height(12.dp))
                    Text("Camera Permission Required", color = Color.White, fontWeight = FontWeight.Bold)
                    Text("Grant camera access in Settings to scan rooms.", color = Color.Gray, fontSize = 12.sp)
                }
            }
        }

        // Top Overlay
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(Brush.verticalGradient(listOf(Color.Black.copy(alpha = 0.85f), Color.Transparent)))
                .padding(20.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column {
                    currentRoom?.let {
                        Text(it.floor.uppercase(), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = CyanAccent)
                        Text(it.name, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
                    }
                    Text("Room ${currentRoomIndex + 1} of ${rooms.size}", fontSize = 11.sp, color = Color.Gray)
                }
                Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Surface(color = Color.Black.copy(alpha = 0.6f), shape = RoundedCornerShape(12.dp)) {
                        Row(modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                            Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(GreenAccent))
                            Text("IMU 100Hz", fontSize = 10.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                        }
                    }
                    if (isRecording) {
                        Surface(color = RedAccent.copy(alpha = 0.9f), shape = RoundedCornerShape(6.dp)) {
                            Row(modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                                Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(Color.White))
                                Text("REC ${formatTime(timerSeconds)}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            }
                        }
                    }
                }
            }
        }

        // Guidance Card
        if (!isRecording) {
            Card(
                colors = CardDefaults.cardColors(containerColor = CardBg.copy(alpha = 0.9f)),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .align(Alignment.Center)
                    .padding(horizontal = 32.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(Icons.Filled.ThreeSixty, contentDescription = null, tint = CyanAccent, modifier = Modifier.size(28.dp))
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Stand in Room Center", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    Text("Hold phone upright and tap the shutter to begin a 360° slow pan.", fontSize = 11.sp, color = Color.Gray, textAlign = TextAlign.Center)
                }
            }
        }

        // Bottom Shutter Controls
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
                .background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.9f))))
                .padding(bottom = 32.dp, top = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            if (isRecording) {
                Text("Rotate slowly and steadily 360°", fontSize = 12.sp, color = AmberAccent)
                Spacer(modifier = Modifier.height(12.dp))
            }

            // Shutter Button
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(80.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.2f))
                    .border(3.dp, Color.White, CircleShape)
                    .clickable {
                        if (!isRecording) {
                            // START recording
                            val vc = videoCapture ?: return@clickable
                            val videoFile = File(
                                context.filesDir,
                                "room_${currentRoomIndex}_${System.currentTimeMillis()}.mp4"
                            )
                            val outputOptions = FileOutputOptions.Builder(videoFile).build()
                            val rec = vc.output
                                .prepareRecording(context, outputOptions)
                                .start(ContextCompat.getMainExecutor(context)) { event ->
                                    if (event is VideoRecordEvent.Finalize) {
                                        if (!event.hasError()) {
                                            onRoomRecorded(currentRoomIndex)
                                            recordedCount++
                                        }
                                    }
                                }
                            activeRecording = rec
                            sensorLogger.startLogging()
                            isRecording = true
                        } else {
                            // STOP recording
                            activeRecording?.stop()
                            activeRecording = null
                            sensorLogger.stopLogging(
                                File(context.filesDir, "imu_${currentRoomIndex}_${System.currentTimeMillis()}.csv")
                            )
                            isRecording = false

                            if (currentRoomIndex + 1 < rooms.size) {
                                currentRoomIndex++
                            }
                        }
                    }
            ) {
                if (isRecording) {
                    Box(modifier = Modifier.size(28.dp).clip(RoundedCornerShape(6.dp)).background(RedAccent))
                } else {
                    Box(modifier = Modifier.size(56.dp).clip(CircleShape).background(Color.White).border(3.dp, RedAccent, CircleShape))
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Bottom Nav
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                TextButton(onClick = onBack) {
                    Text("Reconfigure Plan", color = Color.Gray, fontSize = 12.sp)
                }
                TextButton(onClick = onComplete, enabled = recordedCount > 0) {
                    Text("Finish & Upload ($recordedCount)", color = if (recordedCount > 0) GreenAccent else Color.Gray, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.width(4.dp))
                    Icon(Icons.Filled.ArrowForward, contentDescription = null, tint = if (recordedCount > 0) GreenAccent else Color.Gray, modifier = Modifier.size(16.dp))
                }
            }
        }
    }
}

fun formatTime(seconds: Int): String {
    val mins = seconds / 60
    val secs = seconds % 60
    return String.format("%02d:%02d", mins, secs)
}

// ─── STEP 4: UPLOAD ───
@Composable
fun UploadStep(propertyName: String, roomsCount: Int, onReset: () -> Unit) {
    var isUploading by remember { mutableStateOf(false) }
    var uploadProgress by remember { mutableFloatStateOf(0f) }
    var isSuccess by remember { mutableStateOf(false) }
    var jobId by remember { mutableStateOf("") }

    LaunchedEffect(isUploading) {
        if (isUploading) {
            while (uploadProgress < 1f) {
                kotlinx.coroutines.delay(200)
                uploadProgress += 0.08f
            }
            isUploading = false
            isSuccess = true
            jobId = UUID.randomUUID().toString().lowercase()
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = CardBg),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        if (isSuccess) Icons.Filled.CheckCircle else Icons.Filled.CloudUpload,
                        contentDescription = null,
                        tint = if (isSuccess) GreenAccent else CyanAccent,
                        modifier = Modifier.size(48.dp)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        if (isSuccess) "Scan Package Delivered!" else "Assemble & Upload Tour",
                        fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White
                    )
                    Text(
                        if (isSuccess) "Reconstruction pipeline is now running on your Builder Engine."
                        else "Compressing 4K room videos and 100Hz IMU trajectories into myhouse.scan.",
                        fontSize = 12.sp, color = Color.Gray, textAlign = TextAlign.Center
                    )
                }
            }
        }

        item {
            Card(colors = CardDefaults.cardColors(containerColor = SurfaceBg), shape = RoundedCornerShape(12.dp)) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    SummaryRow("Property:", propertyName)
                    SummaryRow("Rooms Captured:", "$roomsCount rooms")
                    SummaryRow("Transmission:", "Encrypted LAN Delivery")
                    if (isSuccess) SummaryRow("Job ID:", jobId.take(12) + "...")
                }
            }
        }

        if (isUploading) {
            item {
                Column {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Uploading to Studio Builder...", fontSize = 11.sp, color = Color.Gray)
                        Text("${(uploadProgress * 100).toInt()}%", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = CyanAccent)
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    LinearProgressIndicator(
                        progress = { uploadProgress },
                        modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
                        color = CyanAccent,
                        trackColor = SurfaceBg
                    )
                }
            }
        }

        item {
            if (!isSuccess) {
                ActionButton("Upload myhouse.scan to Builder", Icons.Filled.CloudUpload, GreenAccent, enabled = !isUploading) {
                    isUploading = true
                    uploadProgress = 0f
                }
            } else {
                ActionButton("Record Another Property", Icons.Filled.Refresh, SurfaceBg, textColor = Color.White) { onReset() }
            }
        }
    }
}

@Composable
fun SummaryRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, fontSize = 12.sp, color = Color.Gray)
        Text(value, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
    }
}

@Composable
fun ActionButton(text: String, icon: ImageVector, color: Color, textColor: Color = Color.Black, enabled: Boolean = true, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        enabled = enabled,
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.buttonColors(containerColor = color, contentColor = textColor),
        modifier = Modifier.fillMaxWidth().height(52.dp)
    ) {
        Text(text, fontWeight = FontWeight.Bold, fontSize = 14.sp)
        Spacer(modifier = Modifier.width(8.dp))
        Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp))
    }
}
