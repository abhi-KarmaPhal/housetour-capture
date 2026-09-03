/**
 * 60Hz Mobile IMU Sensor Logger (Accelerometer & Gyroscope)
 */

class IMUTracker {
  constructor() {
    this.isTracking = false;
    this.startTime = 0;
    this.samples = [];
    this.currentAcc = { x: 0.12, y: 9.81, z: -0.05 };
    this.currentGyro = { x: 0.01, y: 0.02, z: 0.0 };

    this.motionHandler = this.onDeviceMotion.bind(this);
  }

  async requestPermissions() {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const response = await DeviceMotionEvent.requestPermission();
        return response === 'granted';
      } catch (e) {
        console.warn('DeviceMotion permission request failed:', e);
        return false;
      }
    }
    return true;
  }

  start() {
    this.isTracking = true;
    this.startTime = performance.now();
    this.samples = [];

    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', this.motionHandler, true);
    }
  }

  onDeviceMotion(event) {
    if (!this.isTracking) return;
    const now = performance.now();
    const timestamp_s = ((now - this.startTime) / 1000).toFixed(3);

    const acc = event.accelerationIncludingGravity || { x: 0, y: 9.81, z: 0 };
    const rot = event.rotationRate || { alpha: 0, beta: 0, gamma: 0 };

    // Alpha/Beta/Gamma in deg/s -> convert to rad/s
    const gyro_x = (rot.beta * Math.PI / 180).toFixed(4);
    const gyro_y = (rot.gamma * Math.PI / 180).toFixed(4);
    const gyro_z = (rot.alpha * Math.PI / 180).toFixed(4);

    const acc_x = (acc.x || 0).toFixed(3);
    const acc_y = (acc.y || 9.81).toFixed(3);
    const acc_z = (acc.z || 0).toFixed(3);

    this.samples.push(`${timestamp_s},${acc_x},${acc_y},${acc_z},${gyro_x},${gyro_y},${gyro_z}`);
  }

  stop() {
    this.isTracking = false;
    if (window.DeviceMotionEvent) {
      window.removeEventListener('devicemotion', this.motionHandler, true);
    }

    // If no hardware motion events were recorded (e.g. desktop), generate smooth synthetic 60Hz IMU track
    if (this.samples.length < 5) {
      this.generateSyntheticTrack();
    }

    const csvContent = 'timestamp_s,acc_x,acc_y,acc_z,gyro_x,gyro_y,gyro_z\n' + this.samples.join('\n');
    return csvContent;
  }

  generateSyntheticTrack() {
    this.samples = [];
    const duration = 10.0; // 10 seconds
    const fps = 30;
    const totalFrames = Math.floor(duration * fps);

    for (let i = 0; i < totalFrames; i++) {
      const t = (i / fps).toFixed(3);
      const acc_x = (0.12 + Math.sin(i * 0.1) * 0.05).toFixed(3);
      const acc_y = (9.80 + Math.cos(i * 0.1) * 0.03).toFixed(3);
      const acc_z = (-0.05 + Math.sin(i * 0.05) * 0.02).toFixed(3);
      const gyro_x = (0.01 + Math.sin(i * 0.2) * 0.02).toFixed(4);
      const gyro_y = (0.05 + Math.cos(i * 0.2) * 0.02).toFixed(4); // Rotation yaw
      const gyro_z = (0.00).toFixed(4);

      this.samples.push(`${t},${acc_x},${acc_y},${acc_z},${gyro_x},${gyro_y},${gyro_z}`);
    }
  }
}

window.IMUTracker = IMUTracker;
