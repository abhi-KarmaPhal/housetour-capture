/**
 * NavMesh 2D Walkable Collision & Clamping Engine
 * Enforces convex polygon walkable constraints in right-handed metric space.
 */

class NavMeshEngine {
  constructor() {
    this.polygons = [];
    this.activePolygonIndex = 0;
  }

  /**
   * Loads polygons from navmesh.json spec format
   * @param {Object} navmeshDoc 
   */
  loadFromDoc(navmeshDoc) {
    if (!navmeshDoc || !navmeshDoc.polygons) {
      this.polygons = [];
      return;
    }

    this.polygons = navmeshDoc.polygons.map(p => ({
      id: p.id,
      vertices: p.vertices.map(v => ({ x: v.x, z: v.z })) // Use x, z for horizontal ground
    }));
  }

  /**
   * Tests if a 2D point (x, z) lies inside a convex polygon
   */
  isPointInPolygon(px, pz, polygon) {
    const verts = polygon.vertices;
    let inside = false;
    for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
      const xi = verts[i].x, zi = verts[i].z;
      const xj = verts[j].x, zj = verts[j].z;

      const intersect = ((zi > pz) !== (zj > pz)) &&
        (px < (xj - xi) * (pz - zi) / (zj - zi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * Finds the closest point on a line segment (a -> b) to point p
   */
  closestPointOnSegment(px, pz, ax, az, bx, bz) {
    const abx = bx - ax;
    const abz = bz - az;
    const apx = px - ax;
    const apz = pz - az;

    const abLenSq = abx * abx + abz * abz;
    if (abLenSq === 0) return { x: ax, z: az };

    let t = (apx * abx + apz * abz) / abLenSq;
    t = Math.max(0, Math.min(1, t));

    return {
      x: ax + t * abx,
      z: az + t * abz
    };
  }

  /**
   * Clamps target (x, z) to stay inside the nearest walkable polygon
   * @param {number} targetX 
   * @param {number} targetZ 
   * @param {number} currentX 
   * @param {number} currentZ 
   * @returns {{x: number, z: number, collided: boolean}}
   */
  clampMovement(targetX, targetZ, currentX, currentZ) {
    if (this.polygons.length === 0) {
      return { x: targetX, z: targetZ, collided: false };
    }

    // 1. Check if target position is inside any polygon
    for (let i = 0; i < this.polygons.length; i++) {
      if (this.isPointInPolygon(targetX, targetZ, this.polygons[i])) {
        this.activePolygonIndex = i;
        return { x: targetX, z: targetZ, collided: false };
      }
    }

    // 2. Target is outside! Find closest boundary edge of active or nearest polygon
    let bestDistSq = Infinity;
    let clampedPoint = { x: currentX, z: currentZ };

    const candidatePolys = this.polygons;

    for (const poly of candidatePolys) {
      const verts = poly.vertices;
      for (let i = 0; i < verts.length; i++) {
        const nextIdx = (i + 1) % verts.length;
        const pt = this.closestPointOnSegment(
          targetX, targetZ,
          verts[i].x, verts[i].z,
          verts[nextIdx].x, verts[nextIdx].z
        );

        const distSq = (pt.x - targetX) ** 2 + (pt.z - targetZ) ** 2;
        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          clampedPoint = pt;
        }
      }
    }

    return {
      x: clampedPoint.x,
      z: clampedPoint.z,
      collided: true
    };
  }
}

window.NavMeshEngine = NavMeshEngine;
