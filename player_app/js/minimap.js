/**
 * Minimap 2D Floorplan Radar & Room Detector
 */

class MinimapRadar {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.navmeshDoc = null;
    this.rooms = [];
    this.scale = 14; // Pixels per meter
    this.offsetX = 20;
    this.offsetZ = 20;
  }

  setTourData(tour) {
    this.navmeshDoc = tour.navmesh;
    this.rooms = tour.rooms || [];
    this.calculateBounds();
  }

  calculateBounds() {
    if (!this.navmeshDoc || !this.navmeshDoc.polygons) return;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;

    for (const poly of this.navmeshDoc.polygons) {
      for (const v of poly.vertices) {
        if (v.x < minX) minX = v.x;
        if (v.x > maxX) maxX = v.x;
        if (v.z < minZ) minZ = v.z;
        if (v.z > maxZ) maxZ = v.z;
      }
    }

    const houseWidth = (maxX - minX) || 10;
    const houseDepth = (maxZ - minZ) || 10;

    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    // Scale to fit canvas with margin
    const scaleX = (canvasWidth - 30) / houseWidth;
    const scaleZ = (canvasHeight - 30) / houseDepth;
    this.scale = Math.min(scaleX, scaleZ, 20);

    this.offsetX = 15 - minX * this.scale;
    this.offsetZ = 15 - minZ * this.scale;
  }

  toCanvasCoords(x, z) {
    return {
      cx: x * this.scale + this.offsetX,
      cz: z * this.scale + this.offsetZ
    };
  }

  update(playerPos, playerYaw) {
    if (!this.ctx || !this.navmeshDoc) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear canvas
    ctx.fillStyle = '#070a10';
    ctx.fillRect(0, 0, w, h);

    // 1. Draw Walkable Polygons (Floorplan)
    if (this.navmeshDoc.polygons) {
      ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;

      for (const poly of this.navmeshDoc.polygons) {
        if (poly.vertices.length < 3) continue;
        ctx.beginPath();
        const start = this.toCanvasCoords(poly.vertices[0].x, poly.vertices[0].z);
        ctx.moveTo(start.cx, start.cz);

        for (let i = 1; i < poly.vertices.length; i++) {
          const pt = this.toCanvasCoords(poly.vertices[i].x, poly.vertices[i].z);
          ctx.lineTo(pt.cx, pt.cz);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // 2. Draw Room Centroids & Labels
    for (const room of this.rooms) {
      if (!room.centroid) continue;
      const rpt = this.toCanvasCoords(room.centroid.x, room.centroid.z);
      ctx.fillStyle = '#64748b';
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(room.name, rpt.cx, rpt.cz - 4);
    }

    // 3. Draw Player Position & Viewing Cone
    const p = this.toCanvasCoords(playerPos.x, playerPos.z);

    // Viewing Cone (FOV ~ 60 deg)
    const coneDist = 22;
    const fov = Math.PI / 3;
    const leftAngle = playerYaw - Math.PI / 2 - fov / 2;
    const rightAngle = playerYaw - Math.PI / 2 + fov / 2;

    const leftX = p.cx + Math.cos(leftAngle) * coneDist;
    const leftZ = p.cz + Math.sin(leftAngle) * coneDist;
    const rightX = p.cx + Math.cos(rightAngle) * coneDist;
    const rightZ = p.cz + Math.sin(rightAngle) * coneDist;

    ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
    ctx.beginPath();
    ctx.moveTo(p.cx, p.cz);
    ctx.lineTo(leftX, leftZ);
    ctx.arc(p.cx, p.cz, coneDist, leftAngle, rightAngle);
    ctx.closePath();
    ctx.fill();

    // Player Beacon Dot
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(p.cx, p.cz, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 4. Update Current Room in HUD
    this.detectCurrentRoom(playerPos);
  }

  detectCurrentRoom(playerPos) {
    let closestRoom = 'Main Area';
    let bestDistSq = Infinity;

    for (const room of this.rooms) {
      if (room.bounds) {
        const b = room.bounds;
        if (
          playerPos.x >= b.min.x && playerPos.x <= b.max.x &&
          playerPos.z >= b.min.z && playerPos.z <= b.max.z
        ) {
          closestRoom = room.name;
          break;
        }
      }
      if (room.centroid) {
        const distSq = (playerPos.x - room.centroid.x) ** 2 + (playerPos.z - room.centroid.z) ** 2;
        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          closestRoom = room.name;
        }
      }
    }

    const badge = document.getElementById('current-room-badge');
    if (badge && badge.textContent !== closestRoom) {
      badge.textContent = closestRoom;
    }
  }
}

window.MinimapRadar = MinimapRadar;
