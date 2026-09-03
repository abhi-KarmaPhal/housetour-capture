/**
 * HouseTour Capture - Agent Spatial Recorder Controller
 */

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) lucide.createIcons();

  // Subsystems
  const cameraRecorder = new CameraRecorder("camera-preview", "camera-canvas");
  const imuTracker = new IMUTracker();
  const scanPackager = new ScanPackager();
  const builderUploader = new BuilderUploader("/jobs");

  // State
  let currentStep = 1;
  let activeFloor = "Ground Floor";
  const propertyInfo = {
    name: "3BHK Luxury Penthouse",
    clientId: "agent_77",
    address: "Skyline Boulevard, Mumbai",
    notes: "High ceiling, open kitchen, attached terrace"
  };

  let configuredRooms = [
    { id: "room_living", name: "Living Room", floor: "Ground Floor", connectedTo: ["room_kitchen"] },
    { id: "room_kitchen", name: "Kitchen & Dining", floor: "Ground Floor", connectedTo: ["room_living", "room_terrace"] },
    { id: "room_terrace", name: "Terrace Lounge", floor: "Terrace", connectedTo: ["room_kitchen"] }
  ];

  let currentScanningIndex = 0;
  const capturedData = {}; // keyed by room.id -> { videoBlob, imuCsv, thumbnailBlob }
  let timerInterval = null;
  let timerSeconds = 0;
  let generatedScanBlob = null;

  // DOM Elements
  const stagePanels = [
    document.getElementById("stage-1"),
    document.getElementById("stage-2"),
    document.getElementById("stage-3"),
    document.getElementById("stage-4")
  ];

  const stepNavs = [
    document.getElementById("step-nav-1"),
    document.getElementById("step-nav-2"),
    document.getElementById("step-nav-3"),
    document.getElementById("step-nav-4")
  ];

  // Step 1 Elements
  const propNameInput = document.getElementById("prop-name");
  const propClientInput = document.getElementById("prop-client");
  const propAddressInput = document.getElementById("prop-address");
  const propNotesInput = document.getElementById("prop-notes");
  const btnNextStep1 = document.getElementById("btn-next-step-1");

  // Step 2 Elements
  const floorTabsList = document.getElementById("floor-tabs-list");
  const btnAddFloor = document.getElementById("btn-add-floor");
  const activeFloorLabel = document.getElementById("active-floor-label");
  const totalRoomsCount = document.getElementById("total-rooms-count");
  const configuredRoomsList = document.getElementById("configured-rooms-list");
  const customRoomInput = document.getElementById("custom-room-input");
  const btnAddCustomRoom = document.getElementById("btn-add-custom-room");
  const btnBackStep2 = document.getElementById("btn-back-step-2");
  const btnNextStep2 = document.getElementById("btn-next-step-2");

  // Step 3 Elements
  const vfFloorName = document.getElementById("vf-floor-name");
  const vfRoomName = document.getElementById("vf-room-name");
  const recTimer = document.getElementById("rec-timer");
  const guideHeadline = document.getElementById("guide-headline");
  const guideSubtext = document.getElementById("guide-subtext");
  const btnShutter = document.getElementById("btn-shutter");
  const btnDoorwayPass = document.getElementById("btn-doorway-pass");
  const btnRoomDone = document.getElementById("btn-room-done");
  const capturedCountEl = document.getElementById("captured-count");
  const capturedBadgesList = document.getElementById("captured-badges-list");
  const btnBackStep3 = document.getElementById("btn-back-step-3");
  const btnFinishRecording = document.getElementById("btn-finish-recording");

  // Step 4 Elements
  const sumPropName = document.getElementById("sum-prop-name");
  const sumRoomsCount = document.getElementById("sum-rooms-count");
  const sumFloorsCount = document.getElementById("sum-floors-count");
  const packStatusText = document.getElementById("pack-status-text");
  const packPct = document.getElementById("pack-pct");
  const packProgressFill = document.getElementById("pack-progress-fill");
  const btnStartPackaging = document.getElementById("btn-start-packaging");
  const uploadSuccessCard = document.getElementById("upload-success-card");
  const createdJobId = document.getElementById("created-job-id");
  const btnDownloadScanZip = document.getElementById("btn-download-scan-zip");

  // ---------------------------------------------------------------------------
  // Step Navigation
  // ---------------------------------------------------------------------------
  function goToStep(stepNumber) {
    currentStep = stepNumber;
    stagePanels.forEach((panel, idx) => {
      if (panel) panel.style.display = (idx + 1 === stepNumber) ? "flex" : "none";
    });

    stepNavs.forEach((nav, idx) => {
      if (nav) {
        nav.classList.remove("active", "completed");
        if (idx + 1 < stepNumber) nav.classList.add("completed");
        if (idx + 1 === stepNumber) nav.classList.add("active");
      }
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
    if (window.lucide) lucide.createIcons();
  }

  // ---------------------------------------------------------------------------
  // STEP 1: Property Setup
  // ---------------------------------------------------------------------------
  btnNextStep1.addEventListener("click", () => {
    propertyInfo.name = propNameInput.value.trim() || "Untitled Property";
    propertyInfo.clientId = propClientInput.value.trim() || "agent_default";
    propertyInfo.address = propAddressInput.value.trim() || "Unknown Location";
    propertyInfo.notes = propNotesInput.value.trim();

    renderConfiguredRooms();
    goToStep(2);
  });

  // ---------------------------------------------------------------------------
  // STEP 2: Floors & Rooms Configurator
  // ---------------------------------------------------------------------------
  floorTabsList.addEventListener("click", (e) => {
    if (e.target.classList.contains("floor-tab")) {
      document.querySelectorAll(".floor-tab").forEach(t => t.classList.remove("active"));
      e.target.classList.add("active");
      activeFloor = e.target.dataset.floor;
      activeFloorLabel.textContent = activeFloor;
      renderConfiguredRooms();
    }
  });

  btnAddFloor.addEventListener("click", () => {
    const floorName = prompt("Enter new floor name (e.g. 2nd Floor, Basement, Mezzanine):");
    if (floorName && floorName.trim()) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "floor-tab";
      btn.dataset.floor = floorName.trim();
      btn.textContent = floorName.trim();
      floorTabsList.appendChild(btn);
      btn.click();
    }
  });

  document.querySelectorAll(".chip-add").forEach(chip => {
    chip.addEventListener("click", () => {
      addRoomToActiveFloor(chip.dataset.name);
    });
  });

  btnAddCustomRoom.addEventListener("click", () => {
    const name = customRoomInput.value.trim();
    if (name) {
      addRoomToActiveFloor(name);
      customRoomInput.value = "";
    }
  });

  function addRoomToActiveFloor(roomName) {
    const id = `room_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`;
    configuredRooms.push({
      id,
      name: roomName,
      floor: activeFloor,
      connectedTo: []
    });
    renderConfiguredRooms();
  }

  function renderConfiguredRooms() {
    configuredRoomsList.replaceChildren();
    totalRoomsCount.textContent = `${configuredRooms.length} Rooms`;

    configuredRooms.forEach((room, index) => {
      const li = document.createElement("li");
      li.className = "room-item-row";

      const infoDiv = document.createElement("div");
      infoDiv.className = "room-item-info";
      infoDiv.innerHTML = `
        <strong>${index + 1}. ${room.name}</strong>
        <span class="room-floor-tag">${room.floor}</span>
      `;

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn-remove-room";
      deleteBtn.innerHTML = `<i data-lucide="trash-2"></i>`;
      deleteBtn.addEventListener("click", () => {
        configuredRooms.splice(index, 1);
        renderConfiguredRooms();
      });

      li.appendChild(infoDiv);
      li.appendChild(deleteBtn);
      configuredRoomsList.appendChild(li);
    });

    if (window.lucide) lucide.createIcons();
  }

  btnBackStep2.addEventListener("click", () => goToStep(1));
  btnNextStep2.addEventListener("click", () => {
    if (configuredRooms.length === 0) {
      alert("Please add at least one room to scan.");
      return;
    }
    currentScanningIndex = 0;
    setupViewfinderForRoom(configuredRooms[currentScanningIndex]);
    cameraRecorder.startViewfinder();
    goToStep(3);
  });

  // ---------------------------------------------------------------------------
  // STEP 3: Guided Camera & IMU Viewfinder
  // ---------------------------------------------------------------------------
  function setupViewfinderForRoom(room) {
    if (!room) return;
    vfFloorName.textContent = room.floor;
    vfRoomName.textContent = room.name;

    guideHeadline.textContent = `Stand in ${room.name}`;
    guideSubtext.textContent = "Press the record shutter button and rotate slowly 360°";

    btnShutter.style.display = "flex";
    btnShutter.classList.remove("recording");
    btnDoorwayPass.style.display = "none";
    btnRoomDone.style.display = "none";

    recTimer.textContent = "00:00";
    timerSeconds = 0;
  }

  btnShutter.addEventListener("click", async () => {
    if (!cameraRecorder.isRecording) {
      // Start Recording
      await imuTracker.requestPermissions();
      cameraRecorder.startRecording();
      imuTracker.start();

      btnShutter.classList.add("recording");
      guideHeadline.textContent = "Recording in progress...";
      guideSubtext.textContent = "Rotate slowly and steadily around the room (keep phone vertical)";

      timerInterval = setInterval(() => {
        timerSeconds++;
        const mins = String(Math.floor(timerSeconds / 60)).padStart(2, "0");
        const secs = String(timerSeconds % 60).padStart(2, "0");
        recTimer.textContent = `${mins}:${secs}`;
      }, 1000);

    } else {
      // Stop Recording Room
      clearInterval(timerInterval);
      btnShutter.classList.remove("recording");
      btnShutter.style.display = "none";

      const videoBlob = await cameraRecorder.stopRecording();
      const imuCsv = imuTracker.stop();
      const thumbnailBlob = await cameraRecorder.captureThumbnail();

      const activeRoom = configuredRooms[currentScanningIndex];
      capturedData[activeRoom.id] = { videoBlob, imuCsv, thumbnailBlob };

      updateCapturedBadges();

      guideHeadline.textContent = `Room Captured: ${activeRoom.name}`;
      guideSubtext.textContent = "Next: Walk through doorway to link next room or finish";

      btnDoorwayPass.style.display = "flex";
      btnRoomDone.style.display = "flex";
    }
  });

  btnDoorwayPass.addEventListener("click", () => {
    alert("Doorway Passage Mode: Walk through the door into the next room to maintain continuous 3D feature connection.");
    advanceToNextRoom();
  });

  btnRoomDone.addEventListener("click", () => {
    advanceToNextRoom();
  });

  function advanceToNextRoom() {
    currentScanningIndex++;
    if (currentScanningIndex < configuredRooms.length) {
      setupViewfinderForRoom(configuredRooms[currentScanningIndex]);
    } else {
      alert("All configured rooms have been captured!");
      goToStep(4);
      prepareSummaryStep4();
    }
  }

  function updateCapturedBadges() {
    capturedBadgesList.replaceChildren();
    const count = Object.keys(capturedData).length;
    capturedCountEl.textContent = count;

    Object.keys(capturedData).forEach(roomId => {
      const room = configuredRooms.find(r => r.id === roomId);
      if (room) {
        const badge = document.createElement("span");
        badge.className = "cap-badge";
        badge.textContent = `✓ ${room.name}`;
        capturedBadgesList.appendChild(badge);
      }
    });
  }

  btnBackStep3.addEventListener("click", () => goToStep(2));
  btnFinishRecording.addEventListener("click", () => {
    goToStep(4);
    prepareSummaryStep4();
  });

  // ---------------------------------------------------------------------------
  // STEP 4: Packaging & Upload
  // ---------------------------------------------------------------------------
  function prepareSummaryStep4() {
    sumPropName.textContent = propertyInfo.name;
    sumRoomsCount.textContent = `${configuredRooms.length} Rooms (${Object.keys(capturedData).length} captured)`;

    const floors = Array.from(new Set(configuredRooms.map(r => r.floor)));
    sumFloorsCount.textContent = floors.join(", ") || "Ground Floor";

    uploadSuccessCard.style.display = "none";
    btnStartPackaging.style.display = "flex";
    packProgressFill.style.width = "0%";
    packPct.textContent = "0%";
    packStatusText.textContent = "Ready to package scan";
  }

  btnStartPackaging.addEventListener("click", async () => {
    try {
      btnStartPackaging.disabled = true;
      packStatusText.textContent = "Compressing videos and IMU sensor tracks into myhouse.scan...";

      generatedScanBlob = await scanPackager.packageScan(
        propertyInfo,
        configuredRooms,
        capturedData,
        (percent) => {
          packProgressFill.style.width = `${Math.round(percent / 2)}%`;
          packPct.textContent = `${Math.round(percent / 2)}%`;
        }
      );

      packStatusText.textContent = "Uploading myhouse.scan to Builder Service...";

      const uploadResult = await builderUploader.uploadScanPackage(
        generatedScanBlob,
        propertyInfo,
        (uploadPercent) => {
          const totalProgress = 50 + Math.round(uploadPercent / 2);
          packProgressFill.style.width = `${totalProgress}%`;
          packPct.textContent = `${totalProgress}%`;
        }
      );

      packStatusText.textContent = "Upload complete! 3D reconstruction pipeline running.";
      packPct.textContent = "100%";
      btnStartPackaging.style.display = "none";
      uploadSuccessCard.style.display = "flex";
      createdJobId.textContent = uploadResult.job_id || "Job initialized";

      if (window.lucide) lucide.createIcons();

    } catch (err) {
      alert(`Packaging or upload failed: ${err.message}`);
      packStatusText.textContent = `Failed: ${err.message}`;
    } finally {
      btnStartPackaging.disabled = false;
    }
  });

  const btnRecordAnother = document.getElementById("btn-record-another");
  if (btnRecordAnother) {
    btnRecordAnother.addEventListener("click", () => {
      goToStep(1);
    });
  }
});
