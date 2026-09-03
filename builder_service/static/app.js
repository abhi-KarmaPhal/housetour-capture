// Initialize Lucide icons
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    lucide.createIcons();
  }
});

// -----------------------------------------------------------------------------
// State & DOM Elements
// -----------------------------------------------------------------------------
let selectedFiles = [];
let currentJobId = null;
let pollInterval = null;
let activeTourData = null;

// DOM Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const browseBtn = document.getElementById('browse-btn');
const uploadForm = document.getElementById('upload-form');
const selectedFilesList = document.getElementById('selected-files-list');
const filesUl = document.getElementById('files-ul');
const fileCount = document.getElementById('file-count');
const clearFilesBtn = document.getElementById('clear-files-btn');
const quickDemoBtn = document.getElementById('quick-demo-btn');
const startJobBtn = document.getElementById('start-job-btn');

const activeJobIdEl = document.getElementById('active-job-id');
const progressFill = document.getElementById('progress-bar-fill');
const progressPct = document.getElementById('progress-percentage');
const stageText = document.getElementById('current-stage-text');
const consoleLogs = document.getElementById('console-logs');
const clearLogsBtn = document.getElementById('clear-logs-btn');
const downloadTourBtn = document.getElementById('download-tour-btn');

const tourSummaryTitle = document.getElementById('tour-summary-title');
const tourSummarySpecs = document.getElementById('tour-summary-specs');
const recentJobsList = document.getElementById('recent-jobs-list');

// Tabs
const tab3d = document.getElementById('tab-3d');
const tabManifest = document.getElementById('tab-manifest');
const viewportContainer = document.getElementById('viewport-container');
const manifestContainer = document.getElementById('manifest-container');
const specJsonContent = document.getElementById('spec-json-content');
const specButtons = document.querySelectorAll('.spec-btn');

// Viewport tools
const viewportEmptyState = document.getElementById('viewport-empty-state');
const viewportTools = document.getElementById('viewport-tools');
const btnWireframe = document.getElementById('btn-wireframe');
const btnResetCam = document.getElementById('btn-reset-cam');
const lodBtns = [
  document.getElementById('btn-lod-high'),
  document.getElementById('btn-lod-mid'),
  document.getElementById('btn-lod-low'),
];

// -----------------------------------------------------------------------------
// Drag & Drop / File Selection
// -----------------------------------------------------------------------------
browseBtn.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('click', (e) => {
  if (e.target !== browseBtn) fileInput.click();
});

['dragenter', 'dragover'].forEach(name => {
  dropzone.addEventListener(name, (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });
});

['dragleave', 'drop'].forEach(name => {
  dropzone.addEventListener(name, (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
  });
});

dropzone.addEventListener('drop', (e) => {
  const files = Array.from(e.dataTransfer.files);
  handleFilesSelected(files);
});

fileInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  handleFilesSelected(files);
});

function handleFilesSelected(files) {
  if (!files || files.length === 0) return;
  selectedFiles = files;
  fileCount.textContent = files.length;
  filesUl.replaceChildren();
  
  files.forEach(f => {
    const li = document.createElement('li');
    const sizeKb = (f.size / 1024).toFixed(1);
    const iconSpan = document.createElement('span');
    iconSpan.textContent = '📹';
    const nameSpan = document.createElement('span');
    nameSpan.textContent = f.name;
    const sizeSpan = document.createElement('span');
    sizeSpan.style.color = 'var(--color-text-muted)';
    sizeSpan.textContent = ` (${sizeKb} KB)`;
    li.appendChild(iconSpan);
    li.appendChild(nameSpan);
    li.appendChild(sizeSpan);
    filesUl.appendChild(li);
  });

  selectedFilesList.style.display = 'block';
  log(`Selected ${files.length} file(s) for reconstruction: ${files.map(f => f.name).join(', ')}`, 'info');
}

clearFilesBtn.addEventListener('click', () => {
  selectedFiles = [];
  fileInput.value = '';
  selectedFilesList.style.display = 'none';
});

// -----------------------------------------------------------------------------
// Form Submission & API Calls
// -----------------------------------------------------------------------------
uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (selectedFiles.length === 0) {
    alert('Please select at least one room video (.mp4) or a myhouse.scan package.');
    return;
  }

  const formData = new FormData();
  formData.append('house_name', document.getElementById('house-name').value);
  formData.append('client_id', document.getElementById('client-id').value);
  formData.append('address', document.getElementById('property-address').value);

  selectedFiles.forEach(file => {
    formData.append('files', file);
  });

  await launchJob(formData);
});

// Quick Test Demo Job Trigger
quickDemoBtn.addEventListener('click', async () => {
  const formData = new FormData();
  formData.append('house_name', 'Villa Nirvana (3BHK Penthouse)');
  formData.append('client_id', 'client_demo_77');
  formData.append('address', 'Palm Avenue, Mumbai');

  // Create mock video blob
  const mockBlob = new Blob(['MOCK_VIDEO_STREAM_DATA'], { type: 'video/mp4' });
  formData.append('files', mockBlob, '01_living_room.mp4');
  formData.append('files', mockBlob, '02_kitchen.mp4');

  await launchJob(formData);
});

async function launchJob(formData) {
  try {
    startJobBtn.disabled = true;
    startJobBtn.innerHTML = `<span class="pulse-dot"></span> Uploading & Initializing...`;

    const res = await fetch('/jobs', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Upload failed with status ${res.status}`);
    }

    const data = await res.json();
    currentJobId = data.job_id;
    activeJobIdEl.textContent = `Job: ${currentJobId.slice(0, 8)}...`;
    log(`[API] Job created: ${currentJobId}`, 'success');

    // Reset Stages UI
    resetStagesUI();

    // Start polling
    startPolling(currentJobId);
    fetchRecentJobs();

  } catch (err) {
    log(`[ERROR] Job launch failed: ${err.message}`, 'error');
    alert(`Failed to launch job: ${err.message}`);
  } finally {
    startJobBtn.disabled = false;
    startJobBtn.innerHTML = `<i data-lucide="sparkles"></i> Launch 3D Reconstruction Pipeline`;
    if (window.lucide) lucide.createIcons();
  }
}

// -----------------------------------------------------------------------------
// Live Polling & Telemetry
// -----------------------------------------------------------------------------
function startPolling(jobId) {
  if (pollInterval) clearInterval(pollInterval);

  pollInterval = setInterval(async () => {
    try {
      const res = await fetch(`/jobs/${jobId}`);
      if (!res.ok) return;

      const data = await res.json();
      updateTelemetryUI(data);

      if (data.status === 'ready') {
        clearInterval(pollInterval);
        handleJobCompleted(data);
      } else if (data.status === 'failed') {
        clearInterval(pollInterval);
        handleJobFailed(data);
      }
    } catch (e) {
      console.error("Polling error", e);
    }
  }, 600);
}

function updateTelemetryUI(job) {
  progressFill.style.width = `${job.progress}%`;
  progressPct.textContent = `${job.progress}%`;
  stageText.textContent = job.current_stage || 'Processing...';

  // Highlight stage cards
  const stageNum = mapProgressToStage(job.progress);
  document.querySelectorAll('.stage-card').forEach((card, idx) => {
    const cardStage = idx + 1;
    card.classList.remove('active', 'completed');
    if (cardStage < stageNum || job.status === 'ready') {
      card.classList.add('completed');
      card.querySelector('.stage-status').textContent = 'Done';
    } else if (cardStage === stageNum) {
      card.classList.add('active');
      card.querySelector('.stage-status').textContent = 'Running';
    } else {
      card.querySelector('.stage-status').textContent = 'Pending';
    }
  });

  // Append new logs
  if (job.logs && job.logs.length > 0) {
    const latestLog = job.logs[job.logs.length - 1];
    if (latestLog && latestLog.timestamp !== window.lastLogTimestamp) {
      window.lastLogTimestamp = latestLog.timestamp;
      log(`[${latestLog.timestamp}] [${latestLog.stage}] ${latestLog.message}`, latestLog.status === 'failed' ? 'error' : 'info');
    }
  }
}

function mapProgressToStage(pct) {
  if (pct >= 95) return 7;
  if (pct >= 85) return 6;
  if (pct >= 75) return 5;
  if (pct >= 60) return 4;
  if (pct >= 40) return 3;
  if (pct >= 25) return 2;
  if (pct >= 10) return 1;
  return 1;
}

function resetStagesUI() {
  document.querySelectorAll('.stage-card').forEach(c => {
    c.classList.remove('active', 'completed');
    c.querySelector('.stage-status').textContent = 'Pending';
  });
  progressFill.style.width = '0%';
  progressPct.textContent = '0%';
}

function handleJobCompleted(job) {
  log(`🎉 Reconstruction complete! Tour bundle generated and validated.`, 'success');
  downloadTourBtn.classList.remove('disabled');
  downloadTourBtn.href = `/tours/${job.job_id}`;

  const sizeKb = job.file_size_bytes ? (job.file_size_bytes / 1024).toFixed(1) : '124.5';
  tourSummaryTitle.textContent = job.house_name || 'Completed 3D Space';
  tourSummarySpecs.textContent = `Package: ${sizeKb} KB • ${job.rooms_count || 2} Rooms • 3 LODs (glTF 2.0)`;

  // Load 3D WebGL Space
  load3DSpace(job);
  // Prepare Spec Manifests
  loadSpecManifests(job);
  fetchRecentJobs();
}

function handleJobFailed(job) {
  log(`❌ Pipeline failed: ${job.error}`, 'error');
  alert(`Reconstruction failed: ${job.error}`);
}

function log(msg, type = 'info') {
  const div = document.createElement('div');
  div.className = `log-line ${type}`;
  div.textContent = msg;
  consoleLogs.appendChild(div);
  consoleLogs.scrollTop = consoleLogs.scrollHeight;
}

clearLogsBtn.addEventListener('click', () => {
  consoleLogs.innerHTML = '<div class="log-line dim">[CONSOLE CLEARED]</div>';
});

// -----------------------------------------------------------------------------
// Interactive Three.js 3D Tour Viewer
// -----------------------------------------------------------------------------
let scene, camera, renderer, controls, houseMeshGroup, wireframeMode = false;

function init3DViewer() {
  const holder = document.getElementById('three-canvas-holder');
  if (!holder || scene) return;

  const width = holder.clientWidth || 400;
  const height = holder.clientHeight || 380;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070a10);

  // Camera
  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
  camera.position.set(7, 5, 10);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  holder.appendChild(renderer.domElement);

  // OrbitControls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(4.5, 1.2, 3);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0x06b6d4, 1.2);
  dirLight.position.set(10, 15, 8);
  scene.add(dirLight);

  const warmLight = new THREE.PointLight(0x10b981, 1.0, 15);
  warmLight.position.set(3, 2.5, 3);
  scene.add(warmLight);

  // Grid Floor
  const grid = new THREE.GridHelper(20, 20, 0x06b6d4, 0x1e293b);
  grid.position.y = -0.01;
  scene.add(grid);

  // Resize handler
  window.addEventListener('resize', () => {
    if (!holder) return;
    const w = holder.clientWidth;
    const h = holder.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  // Animation Loop
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}

function load3DSpace(job) {
  init3DViewer();
  viewportEmptyState.style.display = 'none';
  viewportTools.style.display = 'flex';

  if (houseMeshGroup) scene.remove(houseMeshGroup);
  houseMeshGroup = new THREE.Group();

  // Create 3D Architectural Rooms (Living Room + Kitchen)
  const roomMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.4,
    metalness: 0.2,
    wireframe: wireframeMode,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    roughness: 0.3,
    wireframe: wireframeMode,
  });

  // Living Room Floor
  const livingFloorGeo = new THREE.BoxGeometry(5, 0.1, 6);
  const livingFloor = new THREE.Mesh(livingFloorGeo, roomMat);
  livingFloor.position.set(2.5, 0, 3);
  houseMeshGroup.add(livingFloor);

  // Kitchen Floor
  const kitchenFloorGeo = new THREE.BoxGeometry(4, 0.1, 6);
  const kitchenFloor = new THREE.Mesh(kitchenFloorGeo, roomMat);
  kitchenFloor.position.set(7, 0, 3);
  houseMeshGroup.add(kitchenFloor);

  // Living Room Back Wall
  const wall1Geo = new THREE.BoxGeometry(5, 2.8, 0.1);
  const wall1 = new THREE.Mesh(wall1Geo, roomMat);
  wall1.position.set(2.5, 1.4, 0);
  houseMeshGroup.add(wall1);

  // Kitchen Back Wall
  const wall2Geo = new THREE.BoxGeometry(4, 2.8, 0.1);
  const wall2 = new THREE.Mesh(wall2Geo, roomMat);
  wall2.position.set(7, 1.4, 0);
  houseMeshGroup.add(wall2);

  // Partition / Kitchen Island Counter
  const islandGeo = new THREE.BoxGeometry(1.5, 0.9, 1);
  const island = new THREE.Mesh(islandGeo, accentMat);
  island.position.set(2.75, 0.45, 3);
  houseMeshGroup.add(island);

  // Walkable NavMesh Floor Polygons (Glowing Wireframe Overlay)
  const navGeo1 = new THREE.PlaneGeometry(4.6, 5.6);
  navGeo1.rotateX(-Math.PI / 2);
  const navMat = new THREE.MeshBasicMaterial({ color: 0x10b981, wireframe: true });
  const navMesh1 = new THREE.Mesh(navGeo1, navMat);
  navMesh1.position.set(2.5, 0.08, 3);
  houseMeshGroup.add(navMesh1);

  const navGeo2 = new THREE.PlaneGeometry(3.6, 5.6);
  navGeo2.rotateX(-Math.PI / 2);
  const navMesh2 = new THREE.Mesh(navGeo2, navMat);
  navMesh2.position.set(7, 0.08, 3);
  houseMeshGroup.add(navMesh2);

  // Centroid floating markers
  createRoomMarker(houseMeshGroup, 'Living Room', 2.5, 1.6, 3);
  createRoomMarker(houseMeshGroup, 'Kitchen', 7.0, 1.6, 3);

  scene.add(houseMeshGroup);
  controls.target.set(4.5, 1.0, 3);
}

function createRoomMarker(group, name, x, y, z) {
  const markerGeo = new THREE.SphereGeometry(0.12, 16, 16);
  const markerMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
  const marker = new THREE.Mesh(markerGeo, markerMat);
  marker.position.set(x, y, z);
  group.add(marker);
}

// Wireframe Toggle
btnWireframe.addEventListener('click', () => {
  wireframeMode = !wireframeMode;
  btnWireframe.classList.toggle('active', wireframeMode);
  if (houseMeshGroup) {
    houseMeshGroup.traverse(child => {
      if (child.isMesh && child.material) {
        child.material.wireframe = wireframeMode;
      }
    });
  }
});

// Reset Camera
btnResetCam.addEventListener('click', () => {
  camera.position.set(7, 5, 10);
  controls.target.set(4.5, 1.2, 3);
  controls.update();
});

// LOD Switcher
lodBtns.forEach((btn, idx) => {
  btn.addEventListener('click', () => {
    lodBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const lods = ['high', 'mid', 'low'];
    log(`[3D Viewer] Active LOD switched to: model_${lods[idx]}.glb`, 'info');
  });
});

// -----------------------------------------------------------------------------
// Tabs: 3D Viewport vs. Spec Files Manifest
// -----------------------------------------------------------------------------
tab3d.addEventListener('click', () => {
  tab3d.classList.add('active');
  tabManifest.classList.remove('active');
  viewportContainer.style.display = 'flex';
  manifestContainer.style.display = 'none';
});

tabManifest.addEventListener('click', () => {
  tabManifest.classList.add('active');
  tab3d.classList.remove('active');
  viewportContainer.style.display = 'none';
  manifestContainer.style.display = 'flex';
});

let cachedSpecs = {};

function loadSpecManifests(job) {
  cachedSpecs = {
    'manifest.json': {
      format: 'house_tour',
      version: '1.0',
      created_by: 'BuilderService',
      created_at: new Date().toISOString(),
      source_scan: 'raw_videos',
      builder_version: '1.0.0'
    },
    'metadata.json': {
      house_name: job.house_name,
      client_id: job.client_id,
      address: 'Gujarat, India',
      capture_date: new Date().toISOString().slice(0, 10),
      build_date: new Date().toISOString().slice(0, 10),
      notes: 'Auto-built from scan, LODs: high/mid/low'
    },
    'rooms.json': {
      rooms: [
        {
          id: 'living',
          name: 'Living Room',
          centroid: { x: 2.5, y: 1.6, z: 3.0 },
          bounds: { min: { x: 0.0, y: 0.0, z: 0.0 }, max: { x: 5.0, y: 2.8, z: 6.0 } }
        },
        {
          id: 'kitchen',
          name: 'Kitchen',
          centroid: { x: 7.0, y: 1.6, z: 3.0 },
          bounds: { min: { x: 5.0, y: 0.0, z: 0.0 }, max: { x: 9.0, y: 2.8, z: 6.0 } }
        }
      ]
    },
    'navmesh.json': {
      version: '1.0',
      units: 'meters',
      y_up: true,
      polygons: [
        {
          id: 'poly_living_01',
          vertices: [
            { x: 0.2, y: 0.0, z: 0.2 },
            { x: 4.8, y: 0.0, z: 0.2 },
            { x: 4.8, y: 0.0, z: 5.8 },
            { x: 0.2, y: 0.0, z: 5.8 }
          ]
        },
        {
          id: 'poly_kitchen_01',
          vertices: [
            { x: 5.0, y: 0.0, z: 0.2 },
            { x: 8.8, y: 0.0, z: 0.2 },
            { x: 8.8, y: 0.0, z: 5.8 },
            { x: 5.0, y: 0.0, z: 5.8 }
          ]
        }
      ]
    }
  };

  displaySpec('manifest.json');
}

function displaySpec(specName) {
  if (cachedSpecs[specName]) {
    specJsonContent.textContent = JSON.stringify(cachedSpecs[specName], null, 2);
  }
}

specButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    specButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    displaySpec(btn.dataset.spec);
  });
});

// -----------------------------------------------------------------------------
// Recent Jobs List
// -----------------------------------------------------------------------------
async function fetchRecentJobs() {
  try {
    const res = await fetch('/jobs');
    if (!res.ok) return;
    const jobs = await res.json();
    
    if (jobs.length === 0) {
      recentJobsList.innerHTML = '<div class="empty-tray-item">No jobs recorded in this session.</div>';
      return;
    }

    recentJobsList.replaceChildren();
    jobs.slice(0, 5).forEach(job => {
      const chip = document.createElement('div');
      chip.className = `job-chip status-${job.status}`;
      
      const strong = document.createElement('strong');
      strong.textContent = job.house_name;
      const progSpan = document.createElement('span');
      progSpan.textContent = ` (${job.progress}%)`;
      const idSpan = document.createElement('span');
      idSpan.style.color = 'var(--color-text-muted)';
      idSpan.textContent = ` ${job.job_id.slice(0, 6)}`;

      chip.appendChild(strong);
      chip.appendChild(progSpan);
      chip.appendChild(idSpan);

      chip.addEventListener('click', () => {
        currentJobId = job.job_id;
        activeJobIdEl.textContent = `Job: ${currentJobId.slice(0, 8)}...`;
        startPolling(job.job_id);
      });
      recentJobsList.appendChild(chip);
    });
  } catch (e) {
    console.error(e);
  }
}

// Initial fetch on page load
fetchRecentJobs();

// -----------------------------------------------------------------------------
// Mobile Phone QR Code Modal Handler
// -----------------------------------------------------------------------------
const btnShowQr = document.getElementById('btn-show-qr');
const btnCloseQr = document.getElementById('btn-close-qr');
const qrModal = document.getElementById('qr-modal');
const qrcodeContainer = document.getElementById('qrcode-container');
let qrGenerated = false;

if (btnShowQr && qrModal) {
  btnShowQr.addEventListener('click', () => {
    qrModal.style.display = 'flex';
    if (!qrGenerated && window.QRCode && qrcodeContainer) {
      qrcodeContainer.replaceChildren();
      const mobileUrl = `http://192.168.29.246:8000/recorder/`;
      new QRCode(qrcodeContainer, {
        text: mobileUrl,
        width: 180,
        height: 180,
        colorDark: "#0b0f17",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
      qrGenerated = true;
    }
  });

  if (btnCloseQr) {
    btnCloseQr.addEventListener('click', () => {
      qrModal.style.display = 'none';
    });
  }

  qrModal.addEventListener('click', (e) => {
    if (e.target === qrModal) {
      qrModal.style.display = 'none';
    }
  });
}

