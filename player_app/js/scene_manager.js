/**
 * Three.js 3D Scene Manager & Multi-LOD Renderer
 */

class SceneManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.gltfLoader = new THREE.GLTFLoader();

    this.loadedLODModels = {};
    this.activeLOD = 'high';
    this.currentModelGroup = null;

    this.initScene();
  }

  initScene() {
    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080c14);

    // 2. Camera (65 deg horizontal FOV)
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(65, aspect, 0.05, 100);
    this.camera.position.set(2.5, 1.6, 3.0);

    // 3. Renderer with ACES Tone Mapping
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting Setup
    this.setupLighting();

    // 5. Window Resize Handler
    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupLighting() {
    // Ambient light
    const hemiLight = new THREE.HemisphereLight(0xe2e8f0, 0x1e293b, 0.9);
    this.scene.add(hemiLight);

    // Sunlight directional
    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.3);
    sunLight.position.set(12, 18, 10);
    sunLight.castShadow = true;
    this.scene.add(sunLight);

    // Interior warm lights for cozy residential ambiance
    const pointLight1 = new THREE.PointLight(0x06b6d4, 0.9, 12);
    pointLight1.position.set(2.5, 2.4, 3.0);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xffeedd, 1.1, 12);
    pointLight2.position.set(7.0, 2.4, 3.0);
    this.scene.add(pointLight2);
  }

  onWindowResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * Parses and loads LOD ArrayBuffers into Three.js 3D Objects
   * @param {Object} lodArrayBuffers 
   */
  async loadLODs(lodArrayBuffers) {
    this.loadedLODModels = {};
    let parsedCount = 0;

    if (lodArrayBuffers) {
      for (const [key, buffer] of Object.entries(lodArrayBuffers)) {
        if (!buffer || buffer.byteLength === 0) continue;
        try {
          const gltf = await this.parseGLBBuffer(buffer);
          if (gltf && gltf.scene) {
            this.prepareModel(gltf.scene);
            this.loadedLODModels[key] = gltf.scene;
            parsedCount++;
          }
        } catch (err) {
          console.warn(`Could not parse GLB for LOD ${key}:`, err);
        }
      }
    }

    // Fallback: If no GLBs were successfully parsed, build procedural 3D house structure
    if (parsedCount === 0) {
      this.loadedLODModels['high'] = this.buildProceduralHouse('high');
      this.loadedLODModels['mid'] = this.buildProceduralHouse('mid');
      this.loadedLODModels['low'] = this.buildProceduralHouse('low');
    }

    // Set high or best available LOD as active
    const availableLOD = this.loadedLODModels['high'] ? 'high' : Object.keys(this.loadedLODModels)[0];
    if (availableLOD) {
      this.switchLOD(availableLOD);
    }
  }

  parseGLBBuffer(buffer) {
    return new Promise((resolve, reject) => {
      this.gltfLoader.parse(buffer, '', (gltf) => {
        resolve(gltf);
      }, (error) => {
        reject(error);
      });
    });
  }

  prepareModel(modelScene) {
    modelScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.side = THREE.DoubleSide;
          child.material.roughness = Math.min(child.material.roughness || 0.6, 0.7);
        }
      }
    });
  }

  buildProceduralHouse(lod = 'high') {
    const group = new THREE.Group();

    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.1,
    });

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.5,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      roughness: 0.2,
      metalness: 0.3,
    });

    // Living Room Floor (5m x 6m)
    const livingFloor = new THREE.Mesh(new THREE.BoxGeometry(5, 0.1, 6), floorMat);
    livingFloor.position.set(2.5, 0, 3);
    livingFloor.receiveShadow = true;
    group.add(livingFloor);

    // Kitchen Floor (4m x 6m)
    const kitchenFloor = new THREE.Mesh(new THREE.BoxGeometry(4, 0.1, 6), floorMat);
    kitchenFloor.position.set(7, 0, 3);
    kitchenFloor.receiveShadow = true;
    group.add(kitchenFloor);

    // Living Room Ceiling (height = 2.8m)
    const livingCeiling = new THREE.Mesh(new THREE.BoxGeometry(5, 0.1, 6), wallMat);
    livingCeiling.position.set(2.5, 2.8, 3);
    group.add(livingCeiling);

    // Kitchen Ceiling
    const kitchenCeiling = new THREE.Mesh(new THREE.BoxGeometry(4, 0.1, 6), wallMat);
    kitchenCeiling.position.set(7, 2.8, 3);
    group.add(kitchenCeiling);

    // Back Walls
    const backWall1 = new THREE.Mesh(new THREE.BoxGeometry(5, 2.8, 0.1), wallMat);
    backWall1.position.set(2.5, 1.4, 0);
    group.add(backWall1);

    const backWall2 = new THREE.Mesh(new THREE.BoxGeometry(4, 2.8, 0.1), wallMat);
    backWall2.position.set(7, 1.4, 0);
    group.add(backWall2);

    // Left Wall
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.8, 6), wallMat);
    leftWall.position.set(0, 1.4, 3);
    group.add(leftWall);

    // Right Wall
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.8, 6), wallMat);
    rightWall.position.set(9, 1.4, 3);
    group.add(rightWall);

    // Kitchen Island / Furniture
    if (lod !== 'low') {
      const island = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 2.2), accentMat);
      island.position.set(6.8, 0.45, 3.0);
      island.castShadow = true;
      group.add(island);

      // Living room sofa
      const sofa = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 1.0), wallMat);
      sofa.position.set(2.5, 0.25, 1.2);
      sofa.castShadow = true;
      group.add(sofa);
    }

    return group;
  }

  switchLOD(lodKey) {
    if (!this.loadedLODModels[lodKey]) return;
    if (this.currentModelGroup) {
      this.scene.remove(this.currentModelGroup);
    }
    this.activeLOD = lodKey;
    this.currentModelGroup = this.loadedLODModels[lodKey];
    this.scene.add(this.currentModelGroup);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

window.SceneManager = SceneManager;
