package com.housetour.capture.packager

import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

/**
 * Builds spec-compliant myhouse.scan ZIP on Android
 */
object ScanPackager {
    data class RoomRecord(
        val id: String,
        val name: String,
        val floor: String,
        val videoFile: File,
        val imuFile: File
    )

    fun createScanPackage(
        outputScanZip: File,
        houseName: String,
        clientId: String,
        address: String,
        rooms: List<RoomRecord>
    ) {
        val isoDate = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).format(Date())

        ZipOutputStream(FileOutputStream(outputScanZip)).use { zipOut ->
            // 1. Manifest
            val manifest = JSONObject().apply {
                put("format", "house_scan")
                put("version", "1.0")
                put("created_by", "HouseTourNative_Android")
                put("created_at", isoDate)
            }
            writeZipEntry(zipOut, "manifest.json", manifest.toString(2).toByteArray())

            // 2. Metadata
            val metadata = JSONObject().apply {
                put("house_name", houseName)
                put("client_id", clientId)
                put("address", address)
                put("capture_date", isoDate.substring(0, 10))
                put("notes", "Android CameraX + SensorManager 100Hz Capture")
            }
            writeZipEntry(zipOut, "metadata.json", metadata.toString(2).toByteArray())

            // 3. Devices
            val devicesObj = JSONObject().apply {
                val devArr = JSONArray().apply {
                    put(JSONObject().apply {
                        put("id", "android_device_01")
                        put("platform", "android")
                        put("model", android.os.Build.MODEL)
                        put("os_version", "Android " + android.os.Build.VERSION.RELEASE)
                        put("app_version", "1.0.0")
                        put("camera_specs", JSONObject().apply {
                            put("resolution", "1920x1080")
                            put("fps", 30)
                            put("lens", "wide")
                        })
                    })
                }
                put("devices", devArr)
            }
            writeZipEntry(zipOut, "devices.json", devicesObj.toString(2).toByteArray())

            // 4. Rooms Document
            val roomsArr = JSONArray()
            rooms.forEachIndexed { index, room ->
                roomsArr.put(JSONObject().apply {
                    put("id", room.id)
                    put("name", room.name)
                    put("floor", room.floor)
                    put("order", index + 1)
                    put("video", "videos/${room.id}.mp4")
                    put("imu", "sensors/${room.id}_imu.csv")
                    put("poses", "poses/${room.id}_poses.json")
                    put("thumbnail", "thumbnails/${room.id}.jpg")
                    put("connected_to", JSONArray())
                })

                // Copy video file into ZIP
                if (room.videoFile.exists()) {
                    writeFileToZip(zipOut, "videos/${room.id}.mp4", room.videoFile)
                }
                // Copy IMU CSV file into ZIP
                if (room.imuFile.exists()) {
                    writeFileToZip(zipOut, "sensors/${room.id}_imu.csv", room.imuFile)
                }
            }
            val roomsDoc = JSONObject().apply { put("rooms", roomsArr) }
            writeZipEntry(zipOut, "rooms.json", roomsDoc.toString(2).toByteArray())
        }
    }

    private fun writeZipEntry(zipOut: ZipOutputStream, entryName: String, data: ByteArray) {
        zipOut.putNextEntry(ZipEntry(entryName))
        zipOut.write(data)
        zipOut.closeEntry()
    }

    private fun writeFileToZip(zipOut: ZipOutputStream, entryName: String, file: File) {
        zipOut.putNextEntry(ZipEntry(entryName))
        FileInputStream(file).use { it.copyTo(zipOut) }
        zipOut.closeEntry()
    }
}
