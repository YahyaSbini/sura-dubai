import * as THREE from "three";
import type { EntityId, Mission, Zone } from "@/content/pitch";
import { axisX, cellAt, cellCenter, cellIndex, type City, LAYER_ALTITUDES, LAYER_HEIGHT } from "./city";

/** Pitch state the 3D scene reads every frame (not reactive). */
export const deckState = { slide: 0 };

/** Scene position of a zone. */
export function zoneCenter(city: City, zone: Zone): [number, number] {
  const z = zone.along * city.halfLength * 0.9;
  return [axisX(city, z) + zone.side, z];
}

function endpoint(city: City, at: [number, number]): [number, number] {
  const z = at[0] * city.halfLength * 0.92;
  const x = axisX(city, z) + at[1] * city.hexRadius * Math.sqrt(3);
  return cellAt(city, x, z);
}

function neighbours(q: number, r: number): [number, number][] {
  const s = ((r % 2) + 2) % 2 === 1 ? 1 : -1;
  return [
    [q - 1, r],
    [q + 1, r],
    [q, r - 1],
    [q, r + 1],
    [q + s, r - 1],
    [q + s, r + 1],
  ];
}

export type PlannedRoute = {
  curve: THREE.CatmullRomCurve3 | null;
  cells: number;
  /** Cells on the path that a tower occupies (only when the Digital Twin is off). */
  collisions: number;
  /** Centre of each of those cells, at route height. */
  hits: THREE.Vector3[];
  /** Zones the route had to avoid. */
  avoided: number;
  lengthKm: number;
};

/**
 * Cheapest path for a mission through one sky layer, avoiding towers (when the Digital Twin is on)
 * and every zone of an enabled authority that the mission is not exempt from.
 */
export function planMission(city: City, mission: Mission, zones: Zone[], enabled: Set<EntityId>): PlannedRoute {
  const layer = mission.layer;
  const alt = LAYER_ALTITUDES[layer];
  const blocking = zones
    .filter((z) => enabled.has(z.by) && !mission.exempt.includes(z.by) && z.layers.includes(layer))
    .map((z) => [...zoneCenter(city, z), z.radius] as const);
  const useTwin = enabled.has("twin");
  const occupied = (q: number, r: number) => {
    const i = cellIndex(city, q, r);
    return i >= 0 && city.cells[i * 3 + 2] > alt;
  };
  const inZone = (q: number, r: number) => {
    const [x, z] = cellCenter(city, q, r);
    return blocking.some(([zx, zz, rad]) => Math.hypot(x - zx, z - zz) < rad);
  };
  const open = (q: number, r: number) =>
    cellIndex(city, q, r) >= 0 && !(useTwin && occupied(q, r)) && !inZone(q, r);

  const nearestOpen = ([q, r]: [number, number]): [number, number] => {
    for (let d = 0; d <= city.hexCols * 2; d++) {
      for (const dr of [0, -1, 1, -2, 2]) {
        for (const nq of [q - d, q + d]) if (open(nq, r + dr)) return [nq, r + dr];
      }
    }
    return [q, r];
  };
  const start = nearestOpen(endpoint(city, mission.from));
  const goal = nearestOpen(endpoint(city, mission.to));

  const size = (2 * city.hexCols + 1) * (2 * city.hexRows + 1);
  const cost = new Float32Array(size).fill(Infinity);
  const from = new Int32Array(size).fill(-1);
  const done = new Uint8Array(size);
  const coords: [number, number][] = new Array(size);
  const si = cellIndex(city, start[0], start[1]);
  const gi = cellIndex(city, goal[0], goal[1]);
  cost[si] = 0;
  coords[si] = start;
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
      if (!open(nq, nr)) continue;
      const ni = cellIndex(city, nq, nr);
      if (cost[cur] + 1 < cost[ni]) {
        cost[ni] = cost[cur] + 1;
        from[ni] = cur;
        coords[ni] = [nq, nr];
      }
    }
  }
  if (gi < 0 || (gi !== si && from[gi] < 0)) return { curve: null, cells: 0, collisions: 0, hits: [], avoided: blocking.length, lengthKm: 0 };

  const path: [number, number][] = [];
  for (let i = gi; i >= 0; i = from[i]) {
    if (!coords[i]) break;
    path.unshift(coords[i]);
  }
  const y = alt + LAYER_HEIGHT / 2;
  const points = path.map(([q, r]) => {
    const [x, z] = cellCenter(city, q, r);
    return new THREE.Vector3(x, y, z);
  });
  if (points.length < 2) points.push(points[0].clone().add(new THREE.Vector3(0, 0, 0.01)));
  const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);
  const hits = path.flatMap(([q, r], i) => (occupied(q, r) ? [points[i].clone()] : []));
  return {
    curve,
    cells: path.length,
    collisions: hits.length,
    hits,
    avoided: blocking.length,
    lengthKm: curve.getLength() / 10,
  };
}
