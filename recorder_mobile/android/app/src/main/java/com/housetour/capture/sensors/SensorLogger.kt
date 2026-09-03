package com.housetour.capture.sensors

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import java.io.File
import java.io.FileWriter

/**
 * 100Hz Android Hardware IMU Logger (Accelerometer & Gyroscope)
 */
class SensorLogger(context: Context) : SensorEventListener {
    private val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
    private val gyroscope = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE)

    private val samples = mutableListOf<String>()
    private var startTimeNano: Long = 0L
    var isTracking: Boolean = false
        private set

    private var currentAcc = FloatArray(3) { 0f }
    private var currentGyro = FloatArray(3) { 0f }

    fun startLogging() {
        samples.clear()
        startTimeNano = System.nanoTime()
        isTracking = true

        accelerometer?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME)
        }
        gyroscope?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME)
        }
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (!isTracking || event == null) return
        val elapsedSec = (System.nanoTime() - startTimeNano) / 1_000_000_000.0

        if (event.sensor.type == Sensor.TYPE_ACCELEROMETER) {
            currentAcc[0] = event.values[0]
            currentAcc[1] = event.values[1]
            currentAcc[2] = event.values[2]
        } else if (event.sensor.type == Sensor.TYPE_GYROSCOPE) {
            currentGyro[0] = event.values[0]
            currentGyro[1] = event.values[1]
            currentGyro[2] = event.values[2]

            val line = String.format(
                "%.3f,%.3f,%.3f,%.3f,%.4f,%.4f,%.4f",
                elapsedSec,
                currentAcc[0], currentAcc[1], currentAcc[2],
                currentGyro[0], currentGyro[1], currentGyro[2]
            )
            samples.add(line)
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    fun stopLogging(outputFile: File): File {
        isTracking = false
        sensorManager.unregisterListener(this)

        FileWriter(outputFile).use { writer ->
            writer.write("timestamp_s,acc_x,acc_y,acc_z,gyro_x,gyro_y,gyro_z\n")
            for (line in samples) {
                writer.write(line + "\n")
            }
        }
        return outputFile
    }
}
