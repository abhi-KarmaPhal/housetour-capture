package com.housetour.capture.ar

import android.content.Context
import com.google.ar.core.Config
import com.google.ar.core.Session

/**
 * Google ARCore 6-DOF Visual-Inertial SLAM & Plane Tracking
 */
class ARCoreTracker(private val context: Context) {
    private var arSession: Session? = null

    fun initializeAR(): Boolean {
        return try {
            val session = Session(context)
            val config = Config(session).apply {
                planeFindingMode = Config.PlaneFindingMode.HORIZONTAL_AND_VERTICAL
                lightEstimationMode = Config.LightEstimationMode.ENVIRONMENTAL_HDR
                updateMode = Config.UpdateMode.LATEST_CAMERA_IMAGE
            }
            session.configure(config)
            this.arSession = session
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    fun pause() {
        arSession?.pause()
    }

    fun resume() {
        arSession?.resume()
    }
}
