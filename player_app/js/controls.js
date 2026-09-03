/**
 * First-Person Spatial Walkthrough Controller
 * Unified support for Mobile Touch Joysticks & Desktop FPS WASD/PointerLock.
 */

class FPSTourControls {
  constructor(camera, domElement, navmeshEngine, onCollisionCallback) {
    this.camera = camera;
    this.domElement = domElement;
    this.navmesh = navmeshEngine;
    this.onCollision = onCollisionCallback || (() => {});

    // Player State
    this.position = new THREE.Vector3(2.5, 1.6, 3.0); // Eye height = 1.6m
    this.yaw = 0;   // Left / right rotation (radians)
    this.pitch = 0; // Up / down rotation (radians)

    this.moveSpeed = 3.2;   // Meters per second
    this.sprintMultiplier = 1.6;
    this.lookSensitivity = 0.0022;

    // Movement Vectors
    this.moveVector = new THREE.Vector2(0, 0); // (forward/back, left/right)
    this.isSprinting = false;

    // Desktop Key State
    this.keys = {};
    this.isPointerLocked = false;

    // Mobile Joystick State
    this.joystickActive = false;
    this.joystickTouchId = null;
    this.joystickCenter = { x: 0, y: 0 };
    this.maxJoystickRadius = 45;

    // Mobile Look State
    this.lookTouchId = null;
    this.lastLookTouch = { x: 0, y: 0 };

    this.initDesktopEvents();
    this.initMobileEvents();
  }

  setInitialPosition(x, y, z, yaw = 0) {
    this.position.set(x, y || 1.6, z);
    this.yaw = yaw;
    this.pitch = 0;
    this.updateCamera();
  }

  initDesktopEvents() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.isSprinting = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.isSprinting = false;
    });

    // Pointer Lock
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = (document.pointerLockElement === document.body || document.pointerLockElement === this.domElement);
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked) return;
      this.yaw -= e.movementX * this.lookSensitivity;
      this.pitch -= e.movementY * this.lookSensitivity;
      // Clamp pitch between -85 deg and +85 deg
      const maxPitch = THREE.MathUtils.degToRad(85);
      this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
    });
  }

  requestPointerLock() {
    document.body.requestPointerLock();
  }

  initMobileEvents() {
    const joystickZone = document.getElementById('joystick-zone');
    const joystickBase = document.getElementById('joystick-base');
    const joystickStick = document.getElementById('joystick-stick');
    const lookZone = document.getElementById('look-zone');

    if (!joystickZone || !lookZone) return;

    // --- Joystick Events ---
    joystickZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      this.joystickActive = true;
      this.joystickTouchId = touch.identifier;

      const rect = joystickBase.getBoundingClientRect();
      this.joystickCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
      this.updateJoystick(touch.clientX, touch.clientY, joystickStick);
    }, { passive: false });

    joystickZone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.joystickTouchId) {
          this.updateJoystick(touch.clientX, touch.clientY, joystickStick);
          break;
        }
      }
    }, { passive: false });

    const endJoystick = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.joystickTouchId) {
          this.joystickActive = false;
          this.joystickTouchId = null;
          this.moveVector.set(0, 0);
          joystickStick.style.transform = `translate(0px, 0px)`;
          break;
        }
      }
    };

    joystickZone.addEventListener('touchend', endJoystick);
    joystickZone.addEventListener('touchcancel', endJoystick);

    // --- Look Touchpad Events ---
    lookZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      this.lookTouchId = touch.identifier;
      this.lastLookTouch = { x: touch.clientX, y: touch.clientY };
    }, { passive: false });

    lookZone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.lookTouchId) {
          const dx = touch.clientX - this.lastLookTouch.x;
          const dy = touch.clientY - this.lastLookTouch.y;

          this.yaw -= dx * 0.004;
          this.pitch -= dy * 0.004;
          const maxPitch = THREE.MathUtils.degToRad(85);
          this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));

          this.lastLookTouch = { x: touch.clientX, y: touch.clientY };
          break;
        }
      }
    }, { passive: false });

    const endLook = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.lookTouchId) {
          this.lookTouchId = null;
          break;
        }
      }
    };

    lookZone.addEventListener('touchend', endLook);
    lookZone.addEventListener('touchcancel', endLook);
  }

  updateJoystick(clientX, clientY, stickEl) {
    const dx = clientX - this.joystickCenter.x;
    const dy = clientY - this.joystickCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let clampedDist = Math.min(dist, this.maxJoystickRadius);
    let angle = Math.atan2(dy, dx);

    const stickX = Math.cos(angle) * clampedDist;
    const stickY = Math.sin(angle) * clampedDist;

    stickEl.style.transform = `translate(${stickX}px, ${stickY}px)`;

    // Normalized move vector (-1 to 1)
    const normalizedDist = clampedDist / this.maxJoystickRadius;
    this.moveVector.x = Math.sin(angle) * normalizedDist; // Forward/back
    this.moveVector.y = Math.cos(angle) * normalizedDist; // Left/right
  }

  update(delta) {
    // 1. Calculate keyboard movement
    let forward = 0;
    let strafe = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) forward += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) forward -= 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) strafe -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) strafe += 1;

    // Combine with mobile joystick if active
    if (this.joystickActive) {
      forward -= this.moveVector.x;
      strafe += this.moveVector.y;
    }

    if (forward !== 0 || strafe !== 0) {
      const speed = this.moveSpeed * (this.isSprinting ? this.sprintMultiplier : 1.0);
      const moveDir = new THREE.Vector3(strafe, 0, -forward).normalize();

      // Rotate move direction by camera yaw
      moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

      const targetX = this.position.x + moveDir.x * speed * delta;
      const targetZ = this.position.z + moveDir.z * speed * delta;

      // 2. NavMesh Clamping
      if (this.navmesh) {
        const result = this.navmesh.clampMovement(targetX, targetZ, this.position.x, this.position.z);
        this.position.x = result.x;
        this.position.z = result.z;
        if (result.collided) {
          this.onCollision();
        }
      } else {
        this.position.x = targetX;
        this.position.z = targetZ;
      }
    }

    this.updateCamera();
  }

  updateCamera() {
    this.camera.position.copy(this.position);

    // Apply Euler rotation (Yaw then Pitch)
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);
  }
}

window.FPSTourControls = FPSTourControls;
