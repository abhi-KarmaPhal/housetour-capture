/**
 * Tour Package Loader
 * Unpacks .tour (ZIP) packages in-browser and extracts 3D assets & metadata.
 */

class TourLoader {
  constructor() {
    this.currentTour = null;
  }

  /**
   * Loads a .tour package from a File object (drag-and-drop or file input)
   * @param {File} file 
   * @returns {Promise<TourData>}
   */
  async loadFromFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    return this.unpackTourZip(arrayBuffer, file.name);
  }

  /**
   * Loads a .tour package from a remote URL or API endpoint
   * @param {string} url 
   * @returns {Promise<TourData>}
   */
  async loadFromUrl(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch tour from ${url} (Status ${response.status})`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const filename = url.split('/').pop() || 'remote.tour';
    return this.unpackTourZip(arrayBuffer, filename);
  }

  /**
   * Internal unzipper and parser
   * @param {ArrayBuffer} arrayBuffer 
   * @param {string} sourceName 
   */
  async unpackTourZip(arrayBuffer, sourceName) {
    const zip = await JSZip.loadAsync(arrayBuffer);

    // 1. Parse Manifest JSON
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) throw new Error('Invalid .tour package: missing manifest.json');
    const manifest = JSON.parse(await manifestFile.async('string'));

    // 2. Parse Metadata JSON
    const metadataFile = zip.file('metadata.json');
    const metadata = metadataFile ? JSON.parse(await metadataFile.async('string')) : { house_name: 'House Tour' };

    // 3. Parse Rooms JSON
    const roomsFile = zip.file('rooms.json');
    const roomsDoc = roomsFile ? JSON.parse(await roomsFile.async('string')) : { rooms: [] };

    // 4. Parse NavMesh JSON
    const navmeshFile = zip.file('navmesh.json');
    const navmeshDoc = navmeshFile ? JSON.parse(await navmeshFile.async('string')) : { polygons: [] };

    // 5. Extract GLB LODs as ArrayBuffers
    const lods = {};
    for (const lodKey of ['high', 'mid', 'low']) {
      const glbFile = zip.file(`model_${lodKey}.glb`);
      if (glbFile) {
        lods[lodKey] = await glbFile.async('arraybuffer');
      }
    }

    // 6. Extract Preview Image
    let previewUrl = null;
    const previewFile = zip.file('preview.jpg');
    if (previewFile) {
      const previewBlob = await previewFile.async('blob');
      previewUrl = URL.createObjectURL(previewBlob);
    }

    this.currentTour = {
      sourceName,
      manifest,
      metadata,
      rooms: roomsDoc.rooms || [],
      navmesh: navmeshDoc,
      lods,
      previewUrl
    };

    return this.currentTour;
  }
}

window.TourLoader = TourLoader;
