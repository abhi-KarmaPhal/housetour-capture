/**
 * Camera Viewfinder & MediaRecorder Stream Handler
 */

class CameraRecorder {
  constructor(videoElementId, canvasElementId) {
    this.video = document.getElementById(videoElementId);
    this.canvas = document.getElementById(canvasElementId);
    this.stream = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
  }

  async startViewfinder() {
    if (this.stream) return;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });
      if (this.video) {
        this.video.srcObject = this.stream;
      }
    } catch (err) {
      console.warn('Camera access not granted or unavailable, enabling simulation mode:', err);
    }
  }

  startRecording() {
    this.recordedChunks = [];
    this.isRecording = true;

    if (this.stream && window.MediaRecorder) {
      const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.start(100); // 100ms chunks
    }
  }

  stopRecording() {
    return new Promise((resolve) => {
      this.isRecording = false;

      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.onstop = () => {
          const blob = new Blob(this.recordedChunks, { type: 'video/mp4' });
          resolve(blob);
        };
        this.mediaRecorder.stop();
      } else {
        // Generate simulated video blob if hardware camera was not active
        const simBlob = new Blob(['SIMULATED_HIGH_RES_ROOM_VIDEO_STREAM'], { type: 'video/mp4' });
        resolve(simBlob);
      }
    });
  }

  captureThumbnail() {
    if (!this.canvas || !this.video || !this.stream) {
      // Fallback 1x1 dummy JPEG blob
      return new Promise(resolve => {
        const c = document.createElement('canvas');
        c.width = 320;
        c.height = 180;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 320, 180);
        ctx.fillStyle = '#06b6d4';
        ctx.font = '14px sans-serif';
        ctx.fillText('HouseTour Room', 20, 90);
        c.toBlob(b => resolve(b), 'image/jpeg', 0.8);
      });
    }

    this.canvas.width = 640;
    this.canvas.height = 360;
    const ctx = this.canvas.getContext('2d');
    ctx.drawImage(this.video, 0, 0, 640, 360);

    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.85);
    });
  }
}

window.CameraRecorder = CameraRecorder;
