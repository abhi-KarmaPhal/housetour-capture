/**
 * HouseTour 3D Player - Main Application Orchestrator
 */

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

  // Core Subsystems
  const tourLoader = new TourLoader();
  const navmeshEngine = new NavMeshEngine();
  const sceneManager = new SceneManager('canvas-container');
  const minimapRadar = new MinimapRadar('minimap-canvas');

  let controls = null;
  let activeTour = null;
  let clock = new THREE.Clock();

  // DOM Elements
  const loaderOverlay = document.getElementById('loader-overlay');
  const loaderProgress = document.getElementById('loader-progress');
  const loaderStatusText = document.getElementById('loader-status-text');
  const tourDropzone = document.getElementById('tour-dropzone');
  const tourFileInput = document.getElementById('tour-file-input');
  const playerBrowseBtn = document.getElementById('player-browse-btn');
  const serverTourUrl = document.getElementById('server-tour-url');
  const loadUrlBtn = document.getElementById('load-url-btn');
  const loadDemoTourBtn = document.getElementById('load-demo-tour-btn');

  const hudContainer = document.getElementById('hud-container');
  const hudHouseName = document.getElementById('hud-house-name');
  const hudAddress = document.getElementById('hud-address');
  const roomsScrollList = document.getElementById('rooms-scroll-list');
  const collisionToast = document.getElementById('collision-toast');

  const btnToggleMinimap = document.getElementById('btn-toggle-minimap');
  const minimapContainer = document.getElementById('minimap-container');
  const btnToggleFullscreen = document.getElementById('btn-toggle-fullscreen');
  const btnExitTour = document.getElementById('btn-exit-tour');
  const btnLockPointer = document.getElementById('btn-lock-pointer');

  // Initialize Controls with collision notification
  controls = new FPSTourControls(
    sceneManager.camera,
    sceneManager.renderer.domElement,
    navmeshEngine,
    () => triggerCollisionFeedback()
  );

  // ---------------------------------------------------------------------------
  // Drag & Drop / File Input Handling
  // ---------------------------------------------------------------------------
  if (playerBrowseBtn) {
    playerBrowseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      tourFileInput.click();
    });
  }

  tourDropzone.addEventListener('click', (e) => {
    if (e.target !== playerBrowseBtn) {
      tourFileInput.click();
    }
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    tourDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      tourDropzone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    tourDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      tourDropzone.classList.remove('drag-over');
    });
  });

  tourDropzone.addEventListener('drop', async (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await loadTourFile(files[0]);
    }
  });

  tourFileInput.addEventListener('change', async (e) => {
    if (e.target.files.length > 0) {
      await loadTourFile(e.target.files[0]);
    }
  });

  // URL / Job ID Loader
  loadUrlBtn.addEventListener('click', async () => {
    let url = serverTourUrl.value.trim();
    if (!url) return;
    if (!url.startsWith('http') && !url.startsWith('/')) {
      // Treat as Job ID
      url = `/tours/${url}`;
    }
    await loadTourUrl(url);
  });

  // Demo Tour Loader (Instant 1-Click Walkthrough)
  loadDemoTourBtn.addEventListener('click', async () => {
    try {
      await loadSyntheticDemoTour();
    } catch (err) {
      console.error('Error loading demo villa:', err);
      alert(`Could not start demo: ${err.message}`);
      hideLoading();
    }
  });

  // ---------------------------------------------------------------------------
  // Tour Loading Logic
  // ---------------------------------------------------------------------------
  async function loadTourFile(file) {
    try {
      showLoading(`Unpacking ${file.name}...`);
      const tour = await tourLoader.loadFromFile(file);
      applyLoadedTour(tour);
    } catch (err) {
      alert(`Error loading .tour package: ${err.message}`);
      hideLoading();
    }
  }

  async function loadTourUrl(url) {
    try {
      showLoading(`Fetching tour package from ${url}...`);
      const tour = await tourLoader.loadFromUrl(url);
      applyLoadedTour(tour);
    } catch (err) {
      alert(`Error loading tour from URL: ${err.message}`);
      hideLoading();
    }
  }

  async function applyLoadedTour(tour) {
    activeTour = tour;
    loaderStatusText.textContent = 'Building 3D spatial geometry & LODs...';

    // 1. Load NavMesh into collision engine
    navmeshEngine.loadFromDoc(tour.navmesh);

    // 2. Load GLB LODs into Three.js scene
    await sceneManager.loadLODs(tour.lods);

    // 3. Initialize Minimap Radar
    minimapRadar.setTourData(tour);

    // 4. Update HUD Metadata
    hudHouseName.textContent = tour.metadata.house_name || 'Property Tour';
    const address = tour.metadata.address || 'Unknown Location';
    hudAddress.innerHTML = `<i data-lucide="map-pin"></i> ${address}`;

    // 5. Build Room Teleportation Chips
    buildRoomNavChips(tour.rooms);

    // 6. Set initial player spawn position (First room centroid or default)
    if (tour.rooms && tour.rooms.length > 0 && tour.rooms[0].centroid) {
      const c = tour.rooms[0].centroid;
      controls.setInitialPosition(c.x, 1.6, c.z, 0);
    } else {
      controls.setInitialPosition(2.5, 1.6, 3.0, 0);
    }

    if (window.lucide) lucide.createIcons();

    // 7. Reveal HUD & hide loading overlay
    hideLoading();
    loaderOverlay.style.display = 'none';
    hudContainer.style.display = 'flex';
  }

  function showLoading(text) {
    loaderProgress.style.display = 'flex';
    loaderStatusText.textContent = text;
  }

  function hideLoading() {
    loaderProgress.style.display = 'none';
  }

  // ---------------------------------------------------------------------------
  // Room Navigation & HUD Actions
  // ---------------------------------------------------------------------------
  function buildRoomNavChips(rooms) {
    roomsScrollList.replaceChildren();

    if (!rooms || rooms.length === 0) {
      rooms = [
        { id: 'living', name: 'Living Room', centroid: { x: 2.5, y: 1.6, z: 3.0 } },
        { id: 'kitchen', name: 'Kitchen', centroid: { x: 7.0, y: 1.6, z: 3.0 } }
      ];
    }

    rooms.forEach((room, idx) => {
      const btn = document.createElement('button');
      btn.className = `room-chip-btn ${idx === 0 ? 'active' : ''}`;
      btn.innerHTML = `<i data-lucide="compass"></i> <span>${room.name}</span>`;

      btn.addEventListener('click', () => {
        document.querySelectorAll('.room-chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        teleportToRoom(room);
      });

      roomsScrollList.appendChild(btn);
    });

    if (window.lucide) lucide.createIcons();
  }

  function teleportToRoom(room) {
    if (!room.centroid) return;
    controls.setInitialPosition(room.centroid.x, 1.6, room.centroid.z, controls.yaw);
  }

  // LOD Switcher in HUD
  document.querySelectorAll('.btn-lod').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-lod').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const lod = btn.dataset.lod;
      sceneManager.switchLOD(lod);
    });
  });

  // Minimap Toggle
  btnToggleMinimap.addEventListener('click', () => {
    const isHidden = minimapContainer.style.display === 'none';
    minimapContainer.style.display = isHidden ? 'block' : 'none';
  });

  // Fullscreen Toggle
  btnToggleFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen().catch(err => console.log(err));
    }
  });

  // Exit Tour Button
  btnExitTour.addEventListener('click', () => {
    hudContainer.style.display = 'none';
    loaderOverlay.style.display = 'flex';
  });

  // Desktop Pointer Lock Hint Click
  if (btnLockPointer) {
    btnLockPointer.addEventListener('click', () => {
      controls.requestPointerLock();
    });
  }

  let toastTimeout = null;
  function triggerCollisionFeedback() {
    collisionToast.style.display = 'flex';
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      collisionToast.style.display = 'none';
    }, 1200);
  }

  // ---------------------------------------------------------------------------
  // Synthetic Demo Tour Generator (Direct 1-Click Demo)
  // ---------------------------------------------------------------------------
  async function loadSyntheticDemoTour() {
    showLoading('Building Villa Seraphina 3D Space...');

    const demoTour = {
      sourceName: 'demo_villa.tour',
      manifest: {
        format: 'house_tour',
        version: '1.0',
        created_by: 'BuilderService',
        created_at: new Date().toISOString(),
        source_scan: 'demo_scan',
        builder_version: '1.0.0'
      },
      metadata: {
        house_name: 'Villa Seraphina (Penthouse)',
        client_id: 'client_demo_pro',
        address: 'Skyline Boulevard, Mumbai, India',
        capture_date: new Date().toISOString().slice(0, 10),
        build_date: new Date().toISOString().slice(0, 10),
        notes: 'Interactive 3D Demo Tour with NavMesh'
      },
      rooms: [
        { id: 'living', name: 'Living Room', centroid: { x: 2.5, y: 1.6, z: 3.0 }, bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 5, y: 2.8, z: 6 } } },
        { id: 'kitchen', name: 'Kitchen & Bar', centroid: { x: 7.0, y: 1.6, z: 3.0 }, bounds: { min: { x: 5, y: 0, z: 0 }, max: { x: 9, y: 2.8, z: 6 } } }
      ],
      navmesh: {
        version: '1.0',
        units: 'meters',
        y_up: true,
        polygons: [
          { id: 'poly_living', vertices: [{ x: 0.2, y: 0, z: 0.2 }, { x: 4.8, y: 0, z: 0.2 }, { x: 4.8, y: 0, z: 5.8 }, { x: 0.2, y: 0, z: 5.8 }] },
          { id: 'poly_kitchen', vertices: [{ x: 5.0, y: 0, z: 0.2 }, { x: 8.8, y: 0, z: 0.2 }, { x: 8.8, y: 0, z: 5.8 }, { x: 5.0, y: 0, z: 5.8 }] }
        ]
      },
      lods: {},
      previewUrl: null
    };

    setTimeout(() => {
      applyLoadedTour(demoTour);
    }, 200);
  }

  function generateClientGLB() {
    // Generates a valid minimal GLB buffer representing the multi-room house
    const verts = new Float32Array([
      0, 0, 0,  5, 0, 0,  5, 0, 6,  0, 0, 6, // Floor 1
      0, 2.8, 0,  5, 2.8, 0,  5, 2.8, 6,  0, 2.8, 6, // Ceiling 1
      5, 0, 0,  9, 0, 0,  9, 0, 6,  5, 0, 6, // Floor 2
      5, 2.8, 0,  9, 2.8, 0,  9, 2.8, 6,  5, 2.8, 6, // Ceiling 2
    ]);

    const inds = new Uint16Array([
      0, 1, 2,  0, 2, 3,
      4, 6, 5,  4, 7, 6,
      0, 4, 1,  1, 4, 5,
      8, 9, 10, 8, 10, 11,
      12, 14, 13, 12, 15, 14,
      9, 13, 10, 10, 13, 14
    ]);

    // Simple manual GLB construct
    const jsonStr = JSON.stringify({
      asset: { version: "2.0" },
      scenes: [{ nodes: [0] }],
      scene: 0,
      nodes: [{ mesh: 0 }],
      meshes: [{
        primitives: [{
          attributes: { POSITION: 1 },
          indices: 0,
          mode: 4,
          material: 0
        }]
      }],
      materials: [{
        pbrMetallicRoughness: {
          baseColorFactor: [0.85, 0.88, 0.92, 1],
          roughnessFactor: 0.5
        },
        doubleSided: true
      }],
      accessors: [
        { bufferView: 0, byteOffset: 0, componentType: 5123, count: inds.length, type: "SCALAR", max: [15], min: [0] },
        { bufferView: 1, byteOffset: 0, componentType: 5126, count: verts.length / 3, type: "VEC3", max: [9, 2.8, 6], min: [0, 0, 0] }
      ],
      bufferViews: [
        { buffer: 0, byteOffset: 0, byteLength: inds.byteLength, target: 34963 },
        { buffer: 0, byteOffset: Math.ceil(inds.byteLength / 4) * 4, byteLength: verts.byteLength, target: 34962 }
      ],
      buffers: [{ byteLength: Math.ceil(inds.byteLength / 4) * 4 + verts.byteLength }]
    });

    const jsonPad = (4 - (jsonStr.length % 4)) % 4;
    const paddedJson = jsonStr + ' '.repeat(jsonPad);
    const jsonBytes = new TextEncoder().encode(paddedJson);

    const binLen = Math.ceil(inds.byteLength / 4) * 4 + verts.byteLength;
    const totalLen = 12 + 8 + jsonBytes.byteLength + 8 + binLen;

    const buffer = new ArrayBuffer(totalLen);
    const view = new DataView(buffer);

    // GLB Header
    view.setUint32(0, 0x46546C67, true); // 'glTF'
    view.setUint32(4, 2, true);          // Version 2
    view.setUint32(8, totalLen, true);

    // JSON Chunk
    view.setUint32(12, jsonBytes.byteLength, true);
    view.setUint32(16, 0x4E4F534A, true); // 'JSON'
    new Uint8Array(buffer, 20, jsonBytes.byteLength).set(jsonBytes);

    // BIN Chunk
    const binOffset = 20 + jsonBytes.byteLength;
    view.setUint32(binOffset, binLen, true);
    view.setUint32(binOffset + 4, 0x004E4942, true); // 'BIN\0'

    const binStart = binOffset + 8;
    new Uint8Array(buffer, binStart, inds.byteLength).set(new Uint8Array(inds.buffer));
    const vertsOffset = binStart + Math.ceil(inds.byteLength / 4) * 4;
    new Uint8Array(buffer, vertsOffset, verts.byteLength).set(new Uint8Array(verts.buffer));

    return buffer;
  }

  // ---------------------------------------------------------------------------
  // Main Render Loop
  // ---------------------------------------------------------------------------
  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    if (activeTour && hudContainer.style.display !== 'none') {
      controls.update(delta);
      minimapRadar.update(controls.position, controls.yaw);
    }

    sceneManager.render();
  }

  animate();
});
