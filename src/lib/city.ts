import * as THREE from "three";

/** 1 scene unit = 100 m. */
export const UNIT = 0.01;

export const LAYER_ALTITUDES = [1.2, 2.0, 2.8];
export const LAYER_HEIGHT = 0.8;
const LAYER_LETTERS = ["A", "B", "C"];

type RawCity = {
  source: string;
  halfLength: number;
  hexRadius: number;
  hexCols: number;
  hexRows: number;
  buildings: number[][];
  cells: [number, number, number][];
  roads: number[][];
  axis: [number, number, number][];
  labels: [string, number, number, number][];
};

export type Building = { h: number; base: number; ring: Float32Array; perimeter: number };

export type City = {
  halfLength: number;
  hexRadius: number;
  hexCols: number;
  hexRows: number;
  buildings: Building[];
  /** x, z, tallest building top (all in scene units) per cell, row by row. */
  cells: Float32Array;
  roads: { kind: number; points: Float32Array }[];
  axis: [number, number][];
  labels: { name: string; x: number; z: number; h: number }[];
};

export async function loadCity(): Promise<City> {
  const raw: RawCity = await (await fetch("/data/szr.json")).json();
  const buildings = raw.buildings.map((b) => {
    const n = (b.length - 2) / 2;
    const ring = new Float32Array(n * 2);
    let area = 0;
    for (let i = 0; i < n; i++) {
      ring[i * 2] = b[2 + i * 2] * UNIT;
      ring[i * 2 + 1] = b[3 + i * 2] * UNIT;
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += ring[i * 2] * ring[j * 2 + 1] - ring[j * 2] * ring[i * 2 + 1];
    }
    if (area < 0) {
      // Normalise winding so outward wall normals are (dz, -dx).
      for (let i = 0; i < n / 2; i++) {
        const k = n - 1 - i;
        const x = ring[i * 2];
        const z = ring[i * 2 + 1];
        ring[i * 2] = ring[k * 2];
        ring[i * 2 + 1] = ring[k * 2 + 1];
        ring[k * 2] = x;
        ring[k * 2 + 1] = z;
      }
    }
    let perimeter = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      perimeter += Math.hypot(ring[j * 2] - ring[i * 2], ring[j * 2 + 1] - ring[i * 2 + 1]);
    }
    return { h: b[0] * UNIT, base: b[1] * UNIT, ring, perimeter };
  });
  const cells = new Float32Array(raw.cells.length * 3);
  raw.cells.forEach((c, i) => {
    cells[i * 3] = c[0] * UNIT;
    cells[i * 3 + 1] = c[1] * UNIT;
    cells[i * 3 + 2] = c[2] * UNIT;
  });
  return {
    halfLength: raw.halfLength * UNIT,
    hexRadius: raw.hexRadius * UNIT,
    hexCols: raw.hexCols,
    hexRows: raw.hexRows,
    buildings,
    cells,
    roads: raw.roads.map((r) => ({
      kind: r[0],
      points: Float32Array.from(r.slice(1), (v) => v * UNIT),
    })),
    axis: raw.axis.map((a) => [a[0] * UNIT, a[1] * UNIT]),
    labels: raw.labels.map((l) => ({ name: l[0], x: l[1] * UNIT, z: l[2] * UNIT, h: l[3] * UNIT })),
  };
}

/** X of the road centreline at a given Z. */
export function axisX(city: City, z: number) {
  const a = city.axis;
  if (z <= a[0][0]) return a[0][1];
  for (let i = 1; i < a.length; i++) {
    if (z <= a[i][0]) {
      const f = (z - a[i - 1][0]) / (a[i][0] - a[i - 1][0]);
      return a[i - 1][1] + (a[i][1] - a[i - 1][1]) * f;
    }
  }
  return a[a.length - 1][1];
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Solid extruded buildings (walls + roofs), non-indexed with flat normals. */
export function buildSolidGeometry(city: City) {
  const pos: number[] = [];
  const nor: number[] = [];
  for (const b of city.buildings) {
    const r = b.ring;
    const n = r.length / 2;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const ax = r[i * 2];
      const az = r[i * 2 + 1];
      const bx = r[j * 2];
      const bz = r[j * 2 + 1];
      const len = Math.hypot(bx - ax, bz - az) || 1;
      const nx = (bz - az) / len;
      const nz = -(bx - ax) / len;
      pos.push(ax, b.base, az, bx, b.base, bz, bx, b.h, bz, ax, b.base, az, bx, b.h, bz, ax, b.h, az);
      for (let k = 0; k < 6; k++) nor.push(nx, 0, nz);
    }
    const contour: THREE.Vector2[] = [];
    for (let i = 0; i < n; i++) contour.push(new THREE.Vector2(r[i * 2], r[i * 2 + 1]));
    for (const tri of THREE.ShapeUtils.triangulateShape(contour, [])) {
      for (const idx of tri) {
        pos.push(r[idx * 2], b.h, r[idx * 2 + 1]);
        nor.push(0, 1, 0);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  return g;
}

/** Roof outlines for every building plus vertical corner edges for towers. */
export function buildEdgeGeometry(city: City) {
  const pos: number[] = [];
  const weight: number[] = [];
  for (const b of city.buildings) {
    const r = b.ring;
    const n = r.length / 2;
    const w = Math.min(1, 0.22 + b.h / 3.2);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      pos.push(r[i * 2], b.h, r[i * 2 + 1], r[j * 2], b.h, r[j * 2 + 1]);
      weight.push(w, w);
      if (b.h - b.base > 0.3) {
        const p = (i + n - 1) % n;
        const ux = r[i * 2] - r[p * 2];
        const uz = r[i * 2 + 1] - r[p * 2 + 1];
        const vx = r[j * 2] - r[i * 2];
        const vz = r[j * 2 + 1] - r[i * 2 + 1];
        const cos = (ux * vx + uz * vz) / ((Math.hypot(ux, uz) || 1) * (Math.hypot(vx, vz) || 1));
        if (cos < 0.82) {
          pos.push(r[i * 2], b.base, r[i * 2 + 1], r[i * 2], b.h, r[i * 2 + 1]);
          weight.push(w * 0.7, w * 0.7);
        }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aWeight", new THREE.Float32BufferAttribute(weight, 1));
  return g;
}

/**
 * Particles that start as stars and land on the building walls.
 * `position` is the landing point, `aSky` the starting point on the sky dome.
 */
export function buildParticleGeometry(city: City, count: number) {
  const rand = mulberry32(7);
  const weights = city.buildings.map((b) => b.perimeter * Math.max(b.h - b.base, 0.06));
  const total = weights.reduce((a, b) => a + b, 0);
  const pos = new Float32Array(count * 3);
  const sky = new Float32Array(count * 3);
  const rnd = new Float32Array(count * 4);
  let written = 0;
  city.buildings.forEach((b, bi) => {
    const share = bi === city.buildings.length - 1 ? count - written : Math.round((weights[bi] / total) * count);
    const r = b.ring;
    const n = r.length / 2;
    const floors = Math.max(1, Math.round((b.h - b.base) / 0.085));
    for (let k = 0; k < share && written < count; k++, written++) {
      let d = rand() * b.perimeter;
      let x = r[0];
      let z = r[1];
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const len = Math.hypot(r[j * 2] - r[i * 2], r[j * 2 + 1] - r[i * 2 + 1]);
        if (d <= len || i === n - 1) {
          const f = len > 0 ? Math.min(d / len, 1) : 0;
          x = r[i * 2] + (r[j * 2] - r[i * 2]) * f;
          z = r[i * 2 + 1] + (r[j * 2 + 1] - r[i * 2 + 1]) * f;
          break;
        }
        d -= len;
      }
      const floor = rand() < 0.14 ? floors : 1 + Math.floor(rand() * floors);
      const o = written * 3;
      pos[o] = x;
      pos[o + 1] = b.base + ((b.h - b.base) * floor) / floors;
      pos[o + 2] = z;
      // Sky dome above the scene.
      const az = rand() * Math.PI * 2;
      const el = Math.asin(0.12 + rand() * 0.88);
      const rad = 120 + rand() * 90;
      sky[o] = Math.cos(az) * Math.cos(el) * rad;
      sky[o + 1] = Math.sin(el) * rad;
      sky[o + 2] = Math.sin(az) * Math.cos(el) * rad;
      const q = written * 4;
      rnd[q] = rand();
      rnd[q + 1] = rand();
      rnd[q + 2] = rand();
      rnd[q + 3] = rand();
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSky", new THREE.BufferAttribute(sky, 3));
  g.setAttribute("aRnd", new THREE.BufferAttribute(rnd, 4));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 400);
  return g;
}

/** Road lines with distance along each road (for the flowing light) and road kind. */
export function buildRoadGeometry(city: City) {
  const pos: number[] = [];
  const info: number[] = [];
  let offset = 0;
  for (const road of city.roads) {
    if (road.kind === 2) continue;
    const p = road.points;
    let dist = offset;
    for (let i = 0; i + 3 < p.length; i += 2) {
      const len = Math.hypot(p[i + 2] - p[i], p[i + 3] - p[i + 1]);
      pos.push(p[i], 0.004, p[i + 1], p[i + 2], 0.004, p[i + 3]);
      info.push(dist, road.kind, dist + len, road.kind);
      dist += len;
    }
    offset += 3.7;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aInfo", new THREE.Float32BufferAttribute(info, 2));
  return g;
}

/* ---------- Sky cells ---------- */

export function cellIndex(city: City, q: number, r: number) {
  if (Math.abs(q) > city.hexCols || Math.abs(r) > city.hexRows) return -1;
  return (r + city.hexRows) * (2 * city.hexCols + 1) + (q + city.hexCols);
}

function isOdd(r: number) {
  return ((r % 2) + 2) % 2 === 1;
}

/** Cell (q, r) that contains the point x, z. */
export function cellAt(city: City, x: number, z: number): [number, number] {
  const dx = city.hexRadius * Math.sqrt(3);
  const dz = city.hexRadius * 1.5;
  let best: [number, number] = [0, 0];
  let bestD = Infinity;
  const r0 = Math.round(z / dz);
  for (let r = r0 - 1; r <= r0 + 1; r++) {
    const shift = isOdd(r) ? dx / 2 : 0;
    const q0 = Math.round((x - shift) / dx);
    for (let q = q0 - 1; q <= q0 + 1; q++) {
      const d = (q * dx + shift - x) ** 2 + (r * dz - z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = [q, r];
      }
    }
  }
  return best;
}

export function cellCenter(city: City, q: number, r: number): [number, number] {
  const dx = city.hexRadius * Math.sqrt(3);
  return [q * dx + (isOdd(r) ? dx / 2 : 0), r * city.hexRadius * 1.5];
}

/** Address of a sky cell, e.g. SURA-DXB-A12-045. */
export function cellCode(city: City, layer: number, q: number, r: number) {
  const col = String(q + city.hexCols + 1).padStart(2, "0");
  const row = String(r + city.hexRows + 1).padStart(3, "0");
  return `SURA-DXB-${LAYER_LETTERS[layer]}${col}-${row}`;
}

export function isCellOpen(city: City, layer: number, q: number, r: number) {
  const i = cellIndex(city, q, r);
  return i >= 0 && city.cells[i * 3 + 2] <= LAYER_ALTITUDES[layer];
}

function neighbours(q: number, r: number): [number, number][] {
  const s = isOdd(r) ? 1 : -1;
  return [
    [q - 1, r],
    [q + 1, r],
    [q, r - 1],
    [q, r + 1],
    [q + s, r - 1],
    [q + s, r + 1],
  ];
}

/** Cheapest path through open cells of one layer, from the north-east end to the south-west end. */
export function planRoute(city: City, layer: number, startQ: number, goalQ: number, preferQ: number) {
  const pick = (r: number, want: number) => {
    for (let d = 0; d <= city.hexCols * 2; d++) {
      for (const q of [want - d, want + d]) if (isCellOpen(city, layer, q, r)) return q;
    }
    return want;
  };
  const startR = city.hexRows;
  const goalR = -city.hexRows;
  const start: [number, number] = [pick(startR, startQ), startR];
  const goal: [number, number] = [pick(goalR, goalQ), goalR];
  const size = (2 * city.hexCols + 1) * (2 * city.hexRows + 1);
  const cost = new Float32Array(size).fill(Infinity);
  const from = new Int32Array(size).fill(-1);
  const done = new Uint8Array(size);
  const coords: [number, number][] = new Array(size);
  const si = cellIndex(city, start[0], start[1]);
  cost[si] = 0;
  coords[si] = start;
  const gi = cellIndex(city, goal[0], goal[1]);
  for (;;) {
    let cur = -1;
    let best = Infinity;
    for (let i = 0; i < size; i++) {
      if (!done[i] && cost[i] < best) {
        best = cost[i];
        cur = i;
      }
    }
    if (cur < 0 || cur === gi) break;
    done[cur] = 1;
    const [q, r] = coords[cur];
    for (const [nq, nr] of neighbours(q, r)) {
      if (!isCellOpen(city, layer, nq, nr)) continue;
      const ni = cellIndex(city, nq, nr);
      let step = 1 + 0.22 * Math.abs(nq - preferQ);
      // Keep clear of closed cells where possible.
      for (const [aq, ar] of neighbours(nq, nr)) {
        if (cellIndex(city, aq, ar) >= 0 && !isCellOpen(city, layer, aq, ar)) step += 0.35;
      }
      if (cost[cur] + step < cost[ni]) {
        cost[ni] = cost[cur] + step;
        from[ni] = cur;
        coords[ni] = [nq, nr];
      }
    }
  }
  const path: [number, number][] = [];
  for (let i = gi; i >= 0; i = from[i]) {
    if (!coords[i]) break;
    path.unshift(coords[i]);
  }
  const y = LAYER_ALTITUDES[layer] + LAYER_HEIGHT / 2;
  const points = path.map(([q, r]) => {
    const [x, z] = cellCenter(city, q, r);
    return new THREE.Vector3(x, y, z);
  });
  return new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);
}
