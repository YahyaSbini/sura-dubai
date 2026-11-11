"use client";

import { Html } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { entities, type EntityId, type Mission, zones } from "@/content/pitch";
import {
  axisX,
  buildEdgeGeometry,
  buildRoadGeometry,
  buildSolidGeometry,
  cellCenter,
  type City,
  isCellOpen,
  LAYER_ALTITUDES,
  LAYER_HEIGHT,
  loadCity,
  planRoute,
} from "@/lib/city";
import { deckState, planMission, type PlannedRoute, zoneCenter } from "@/lib/pitch";
import { STAR_GLSL } from "../scene/uniforms";

const SAND = "#F3EDE2";
const NIGHT = "#0B1B33";
const RED = "#D9473A";

/** Layer strengths per slide (0 = Hook … 12 = The ask). Lerped every frame. */
type Mix = { cells: number; zones: number; solved: number; chaos: number; traffic: number; mission: number };
function targetMix(slide: number): Mix {
  if (slide === 0) return { cells: 0, zones: 0, solved: 0, chaos: 1, traffic: 0, mission: 0 };
  if (slide === 1) return { cells: 0.55, zones: 0, solved: 0, chaos: 0, traffic: 1, mission: 0 };
  if (slide === 2) return { cells: 0, zones: 1, solved: 0, chaos: 1, traffic: 0, mission: 0 };
  if (slide === 3) return { cells: 0.6, zones: 1, solved: 1, chaos: 0, traffic: 1, mission: 1 };
  if (slide === 4) return { cells: 0.5, zones: 0.45, solved: 1, chaos: 0, traffic: 1, mission: 1 };
  return { cells: 0.4, zones: 0, solved: 1, chaos: 0, traffic: 1, mission: 0 };
}

const mix: Mix = { cells: 0, zones: 0, solved: 0, chaos: 0, traffic: 0, mission: 0 };
/** Pixels covered by one scene unit at distance 1, shared by the point shaders. */
const shared = { uScale: { value: 1000 }, uPx: { value: 1 } };

/* ---------- Camera ---------- */

type Key = { at: [number, number, number]; look: [number, number, number]; shift: number; sway: number };
const KEYS: Key[] = [
  { at: [15, 8, 24], look: [-1, 2, 4], shift: 0, sway: 0.25 }, // hook
  { at: [24, 20, 16], look: [-1, 1.5, -3], shift: 0.2, sway: 0.2 }, // introduction
  { at: [14, 10, 13], look: [-0.5, 2, 1], shift: 0.2, sway: 0.12 }, // problem
  { at: [30, 27, 0], look: [0, 4.5, 0], shift: 0, sway: 0 }, // solution (whole corridor)
  { at: [8, 6, 9], look: [-1, 2.4, -3], shift: 0.22, sway: 0.1 }, // product
  { at: [28, 24, -12], look: [0, 1, 0], shift: 0, sway: 0.2 },
  { at: [-26, 22, 14], look: [0, 1, 0], shift: 0, sway: 0.2 },
  { at: [20, 14, 24], look: [-1, 2, 2], shift: 0, sway: 0.2 },
  { at: [6, 40, 8], look: [0, 0, 0], shift: 0, sway: 0.15 },
  { at: [-20, 12, -22], look: [0, 2, -4], shift: 0, sway: 0.2 },
  { at: [26, 18, 4], look: [0, 1, 0], shift: 0, sway: 0.2 },
  { at: [12, 8, -24], look: [-1, 2, -8], shift: 0, sway: 0.2 },
  { at: [30, 34, 18], look: [0, 0, 0], shift: 0, sway: 0.2 },
];

function Rig({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera, size, gl } = useThree();
  const at = useRef(new THREE.Vector3(...KEYS[0].at));
  const look = useRef(new THREE.Vector3(...KEYS[0].look));
  const shift = useRef(0);
  const time = useRef(0);
  const tmpAt = useMemo(() => new THREE.Vector3(), []);
  const tmpLook = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    if (!reducedMotion) time.current += dt;
    const narrow = size.width < 900;
    const k = KEYS[Math.min(deckState.slide, KEYS.length - 1)];
    const ease = reducedMotion ? 1 : 1 - Math.exp(-dt * 1.8);
    tmpAt.set(...k.at);
    tmpLook.set(...k.look);
    if (narrow) tmpAt.lerp(tmpLook, -0.35);
    at.current.lerp(tmpAt, ease);
    look.current.lerp(tmpLook, ease);
    shift.current += ((narrow ? 0 : k.shift) - shift.current) * ease;

    const cam = camera as THREE.PerspectiveCamera;
    const a = Math.sin(time.current * 0.06) * k.sway;
    const rel = at.current.clone().sub(look.current);
    rel.applyAxisAngle(THREE.Object3D.DEFAULT_UP, a);
    cam.position.copy(look.current).add(rel);
    cam.lookAt(look.current);
    const fov = size.width < size.height ? 62 : 40;
    if (cam.fov !== fov) cam.fov = fov;
    cam.setViewOffset(size.width, size.height, -size.width * shift.current, 0, size.width, size.height);
    cam.updateProjectionMatrix();

    shared.uPx.value = gl.getPixelRatio();
    shared.uScale.value = (size.height * gl.getPixelRatio()) / (2 * Math.tan((fov * Math.PI) / 360));

    const target = targetMix(deckState.slide);
    const m = reducedMotion ? 1 : 1 - Math.exp(-dt * 3);
    for (const key of Object.keys(mix) as (keyof Mix)[]) mix[key] += (target[key] - mix[key]) * m;
  });
  return null;
}

/* ---------- City ---------- */

function LightCity({ city, ghost }: { city: City; ghost: boolean }) {
  const solidMat = useRef<THREE.MeshLambertMaterial>(null);
  const edgeMat = useRef<THREE.LineBasicMaterial>(null);
  const { solid, edges, roads, major } = useMemo(() => {
    const roadGeo = buildRoadGeometry(city);
    const pos = roadGeo.attributes.position.array as Float32Array;
    const info = roadGeo.attributes.aInfo.array as Float32Array;
    const minor: number[] = [];
    const main: number[] = [];
    for (let i = 0; i < pos.length / 3; i++) {
      (info[i * 2 + 1] < 0.5 ? main : minor).push(pos[i * 3], 0.01, pos[i * 3 + 2]);
    }
    const toGeo = (arr: number[]) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
      return g;
    };
    return { solid: buildSolidGeometry(city), edges: buildEdgeGeometry(city), roads: toGeo(minor), major: toGeo(main) };
  }, [city]);

  useFrame((_, delta) => {
    const target = ghost && deckState.slide === 3 ? 0.18 : 1;
    const m = 1 - Math.exp(-Math.min(delta, 0.1) * 4);
    if (solidMat.current) {
      solidMat.current.opacity += (target - solidMat.current.opacity) * m;
      solidMat.current.transparent = solidMat.current.opacity < 0.99;
      solidMat.current.depthWrite = !solidMat.current.transparent;
    }
    if (edgeMat.current) edgeMat.current.opacity = 0.08 + 0.14 * (solidMat.current?.opacity ?? 1);
  });

  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.01}>
        <planeGeometry args={[600, 600]} />
        <meshBasicMaterial color="#ECE4D6" />
      </mesh>
      <lineSegments geometry={roads}>
        <lineBasicMaterial color={NIGHT} transparent opacity={0.1} depthWrite={false} />
      </lineSegments>
      <lineSegments geometry={major}>
        <lineBasicMaterial color="#B88324" transparent opacity={0.55} depthWrite={false} />
      </lineSegments>
      <mesh geometry={solid}>
        <meshLambertMaterial ref={solidMat} color="#FFFDF8" side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={2} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial ref={edgeMat} color={NIGHT} transparent opacity={0.22} depthWrite={false} />
      </lineSegments>
    </>
  );
}

/* ---------- Sky cells ---------- */

function hexRing(radius: number, y: number, cx: number, cz: number, out: number[]) {
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3;
    const b = ((k + 1) * Math.PI) / 3;
    out.push(cx + Math.sin(a) * radius, y, cz + Math.cos(a) * radius, cx + Math.sin(b) * radius, y, cz + Math.cos(b) * radius);
  }
}

function prism(radius: number, y: number, cx: number, cz: number, out: number[]) {
  hexRing(radius, y, cx, cz, out);
  hexRing(radius, y + LAYER_HEIGHT, cx, cz, out);
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3;
    const x = cx + Math.sin(a) * radius;
    const z = cz + Math.cos(a) * radius;
    out.push(x, y, z, x, y + LAYER_HEIGHT, z);
  }
}

function SkyCells({ city }: { city: City }) {
  const mat = useRef<THREE.LineBasicMaterial>(null);
  const geometry = useMemo(() => {
    const out: number[] = [];
    LAYER_ALTITUDES.forEach((alt, layer) => {
      for (let r = -city.hexRows; r <= city.hexRows; r++) {
        for (let q = -city.hexCols; q <= city.hexCols; q++) {
          if (!isCellOpen(city, layer, q, r)) continue;
          const [x, z] = cellCenter(city, q, r);
          hexRing(city.hexRadius * 0.93, alt, x, z, out);
        }
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
    return g;
  }, [city]);
  useFrame(() => {
    if (mat.current) mat.current.opacity = 0.32 * mix.cells;
  });
  return (
    <lineSegments geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial ref={mat} color="#1E8FB0" transparent opacity={0} depthWrite={false} />
    </lineSegments>
  );
}

/* ---------- Restricted zones ---------- */

const entityColor = Object.fromEntries(entities.map((e) => [e.id, e.color])) as Record<EntityId, string>;
const entityShort = Object.fromEntries(entities.map((e) => [e.id, e.short])) as Record<EntityId, string>;

function Zones({ city, enabled, slide }: { city: City; enabled: Set<EntityId>; slide: number }) {
  const items = useMemo(
    () =>
      zones.map((z) => {
        const [x, zz] = zoneCenter(city, z);
        const top = LAYER_ALTITUDES[Math.max(...z.layers)] + LAYER_HEIGHT;
        const bottom = z.layers.includes(0) ? 0 : LAYER_ALTITUDES[Math.min(...z.layers)];
        return { zone: z, x, z: zz, top, bottom, color: new THREE.Color(entityColor[z.by]) };
      }),
    [city],
  );
  const fills = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const rings = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const labels = useRef<(HTMLDivElement | null)[]>([]);
  const on = useRef(items.map(() => 1));
  const red = useMemo(() => new THREE.Color(RED), []);
  const c = useMemo(() => new THREE.Color(), []);

  useFrame((_, delta) => {
    const m = 1 - Math.exp(-Math.min(delta, 0.1) * 4);
    items.forEach((it, i) => {
      const want = slide === 2 || enabled.has(it.zone.by) ? 1 : 0;
      on.current[i] += (want - on.current[i]) * m;
      const o = on.current[i] * mix.zones;
      c.copy(red).lerp(it.color, mix.solved);
      const f = fills.current[i];
      if (f) {
        f.opacity = 0.16 * o;
        f.color.copy(c);
        f.visible = o > 0.01;
      }
      const r = rings.current[i];
      if (r) {
        r.opacity = 0.7 * o;
        r.color.copy(c);
        r.visible = o > 0.01;
      }
      const l = labels.current[i];
      if (l) l.style.opacity = String(o);
    });
  });

  return (
    <>
      {items.map((it, i) => (
        <group key={i} position={[it.x, 0, it.z]}>
          <mesh position-y={(it.top + it.bottom) / 2}>
            <cylinderGeometry args={[it.zone.radius, it.zone.radius, it.top - it.bottom, 48, 1, true]} />
            <meshBasicMaterial
              ref={(el) => {
                fills.current[i] = el;
              }}
              transparent
              opacity={0}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position-y={it.top}>
            <ringGeometry args={[it.zone.radius - 0.05, it.zone.radius, 64]} />
            <meshBasicMaterial
              ref={(el) => {
                rings.current[i] = el;
              }}
              transparent
              opacity={0}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <Html position={[0, it.top + 0.3, 0]} center zIndexRange={[6, 0]} style={{ pointerEvents: "none" }}>
            <div
              ref={(el) => {
                labels.current[i] = el;
              }}
              className="pitch-tag"
              style={{ opacity: 0, ["--tag" as string]: slide === 2 ? RED : entityColor[it.zone.by] }}
            >
              {slide === 2 ? (
                <>
                  <b>?</b> {it.zone.name}
                </>
              ) : (
                <>
                  <b>{entityShort[it.zone.by]}</b> {it.zone.name}
                </>
              )}
            </div>
          </Html>
        </group>
      ))}
    </>
  );
}

/* ---------- Drones ---------- */

function droneMaterial(color: string, size: number) {
  return new THREE.ShaderMaterial({
    uniforms: { uPx: shared.uPx, uScale: shared.uScale, uColor: { value: new THREE.Color(color) }, uAlpha: { value: 0 } },
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      uniform float uPx;
      uniform float uScale;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(${size.toFixed(2)} * uScale / -mv.z, 7.0 * uPx, 26.0 * uPx);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uAlpha;
      ${STAR_GLSL}
      void main() {
        vec2 uv = gl_PointCoord * 2.0 - 1.0;
        float s = suraStar(uv);
        float core = 1.0 - smoothstep(0.0, 0.28, length(uv));
        gl_FragColor = vec4(mix(uColor, vec3(1.0), core * 0.85), s * uAlpha);
        #include <colorspace_fragment>
      }
    `,
  });
}

const CHAOS = 34;

/** Drones that each plan alone: loops cross each other and the towers, conflicts flash red. */
function ChaosDrones({ city }: { city: City }) {
  const { params, drones, mat, loops, conflicts } = useMemo(() => {
    let seed = 21;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const params = Array.from({ length: CHAOS }, () => {
      const z = (rand() * 2 - 1) * city.halfLength * 0.8;
      return {
        x: axisX(city, z) + (rand() * 2 - 1) * 3,
        z,
        ax: 1.5 + rand() * 3,
        az: 3 + rand() * 9,
        fx: 0.05 + rand() * 0.1,
        fz: 0.03 + rand() * 0.06,
        ph: rand() * 6.28,
        y: 0.8 + rand() * 2.6,
      };
    });
    const loopPts: number[] = [];
    for (const p of params) {
      const N = 80;
      for (let k = 0; k < N; k++) {
        const a = (k / N) * Math.PI * 2;
        const b = ((k + 1) / N) * Math.PI * 2;
        loopPts.push(p.x + Math.sin(a) * p.ax, p.y, p.z + Math.cos(a) * p.az, p.x + Math.sin(b) * p.ax, p.y, p.z + Math.cos(b) * p.az);
      }
    }
    const loops = new THREE.BufferGeometry();
    loops.setAttribute("position", new THREE.Float32BufferAttribute(loopPts, 3));
    const drones = new THREE.BufferGeometry();
    drones.setAttribute("position", new THREE.BufferAttribute(new Float32Array(CHAOS * 3), 3));
    const conflicts = new THREE.BufferGeometry();
    conflicts.setAttribute("position", new THREE.BufferAttribute(new Float32Array(12 * 3), 3));
    return { params, drones, mat: droneMaterial(NIGHT, 0.3), loops, conflicts };
  }, [city]);
  const loopMat = useRef<THREE.LineBasicMaterial>(null);
  const conflictMat = useMemo(() => droneMaterial(RED, 0.9), []);
  const t = useRef(0);

  useFrame((_, delta) => {
    const o = mix.chaos;
    mat.uniforms.uAlpha.value = o;
    conflictMat.uniforms.uAlpha.value = 0;
    if (loopMat.current) loopMat.current.opacity = 0.16 * o;
    if (o < 0.01) return;
    t.current += Math.min(delta, 0.1);
    const pos = drones.attributes.position as THREE.BufferAttribute;
    params.forEach((p, i) => {
      const a = p.ph + t.current * p.fx * 6;
      pos.setXYZ(i, p.x + Math.sin(a) * p.ax, p.y, p.z + Math.cos(a) * p.az);
    });
    pos.needsUpdate = true;
    const cpos = conflicts.attributes.position as THREE.BufferAttribute;
    let n = 0;
    for (let i = 0; i < CHAOS && n < 12; i++) {
      for (let j = i + 1; j < CHAOS && n < 12; j++) {
        const dx = pos.getX(i) - pos.getX(j);
        const dy = pos.getY(i) - pos.getY(j);
        const dz = pos.getZ(i) - pos.getZ(j);
        if (dx * dx + dz * dz < 1.2 && Math.abs(dy) < 1.2) {
          cpos.setXYZ(n++, (pos.getX(i) + pos.getX(j)) / 2, (pos.getY(i) + pos.getY(j)) / 2, (pos.getZ(i) + pos.getZ(j)) / 2);
        }
      }
    }
    conflicts.setDrawRange(0, n);
    cpos.needsUpdate = true;
    conflictMat.uniforms.uAlpha.value = o * (0.55 + 0.45 * Math.sin(t.current * 9));
  });

  return (
    <>
      <lineSegments geometry={loops} frustumCulled={false}>
        <lineBasicMaterial ref={loopMat} color={NIGHT} transparent opacity={0} depthWrite={false} />
      </lineSegments>
      <points geometry={drones} material={mat} frustumCulled={false} />
      <points geometry={conflicts} material={conflictMat} frustumCulled={false} />
    </>
  );
}

const PER_ROUTE = 6;

/** Regular traffic on three planned corridors. It holds still while an emergency mission flies. */
function Traffic({ city, hold }: { city: City; hold: boolean }) {
  const { curves, tubes, drones, mat } = useMemo(() => {
    const curves = [planRoute(city, 0, 1, 2, 2), planRoute(city, 1, 0, -1, 0), planRoute(city, 2, -2, -3, -2)];
    const drones = new THREE.BufferGeometry();
    drones.setAttribute("position", new THREE.BufferAttribute(new Float32Array(curves.length * PER_ROUTE * 3), 3));
    return {
      curves,
      tubes: curves.map((c) => new THREE.TubeGeometry(c, 300, 0.018, 5, false)),
      drones,
      mat: droneMaterial(NIGHT, 0.26),
    };
  }, [city]);
  const tubeMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const speed = useRef(1);
  const clock = useRef(0);
  const p = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const o = mix.traffic;
    const holding = hold && deckState.slide === 3;
    mat.uniforms.uAlpha.value = o * (holding ? 0.45 : 1);
    for (const m of tubeMats.current) if (m) m.opacity = 0.28 * o * (holding ? 0.4 : 1);
    if (o < 0.01) return;
    speed.current += ((holding ? 0 : 1) - speed.current) * (1 - Math.exp(-dt * 3));
    clock.current += dt * speed.current;
    const pos = drones.attributes.position as THREE.BufferAttribute;
    curves.forEach((curve, layer) => {
      for (let k = 0; k < PER_ROUTE; k++) {
        const f = (clock.current / 70 + k / PER_ROUTE + layer * 0.09) % 1;
        curve.getPointAt(f, p);
        pos.setXYZ(layer * PER_ROUTE + k, p.x, p.y, p.z);
      }
    });
    pos.needsUpdate = true;
  });

  return (
    <>
      {tubes.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial
            ref={(el) => {
              tubeMats.current[i] = el;
            }}
            color="#1E8FB0"
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}
      <points geometry={drones} material={mat} frustumCulled={false} />
    </>
  );
}

/** The planned route of the selected mission: its cells, the path, the drone and both ends. */
function MissionRoute({ city, mission, route }: { city: City; mission: Mission; route: PlannedRoute }) {
  const tubeMat = useRef<THREE.MeshBasicMaterial>(null);
  const cellMat = useRef<THREE.LineBasicMaterial>(null);
  const hitMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const tags = useRef<(HTMLDivElement | null)[]>([]);
  const draw = useRef(0);
  const clock = useRef(0);
  const { tube, cells, drone, mat, start, goal } = useMemo(() => {
    const curve = route.curve;
    const tube = curve ? new THREE.TubeGeometry(curve, Math.max(60, route.cells * 8), 0.07, 8, false) : null;
    const out: number[] = [];
    if (curve) {
      for (const pt of curve.points) prism(city.hexRadius * 0.93, pt.y - LAYER_HEIGHT / 2, pt.x, pt.z, out);
    }
    const cells = new THREE.BufferGeometry();
    cells.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
    const drone = new THREE.BufferGeometry();
    drone.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3), 3));
    return {
      tube,
      cells,
      drone,
      mat: droneMaterial(mission.color, 0.6),
      start: curve?.points[0],
      goal: curve?.points[curve.points.length - 1],
    };
  }, [city, mission, route]);

  useEffect(() => {
    draw.current = 0;
    clock.current = 0;
  }, [route]);

  const p = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const o = mix.mission;
    draw.current = Math.min(1, draw.current + dt / 1.6);
    if (tube) tube.setDrawRange(0, Math.floor((tube.index?.count ?? 0) * draw.current / 3) * 3);
    if (tubeMat.current) tubeMat.current.opacity = 0.95 * o;
    if (cellMat.current) cellMat.current.opacity = 0.5 * o * draw.current;
    for (const m of hitMats.current) if (m) m.opacity = o * draw.current * (0.6 + 0.4 * Math.sin(clock.current * 8));
    for (const el of tags.current) if (el) el.style.opacity = String(o);
    mat.uniforms.uAlpha.value = o * (draw.current >= 1 ? 1 : 0);
    if (!route.curve) return;
    clock.current += dt;
    if (draw.current >= 1) {
      const len = route.curve.getLength();
      const f = ((clock.current - 1.6) * 1.6) / len;
      route.curve.getPointAt(Math.min(1, ((f % 1.15) + 1.15) % 1.15), p);
      (drone.attributes.position as THREE.BufferAttribute).setXYZ(0, p.x, p.y, p.z);
      drone.attributes.position.needsUpdate = true;
    }
  });

  return (
    <>
      {tube && (
        <mesh geometry={tube} frustumCulled={false}>
          <meshBasicMaterial ref={tubeMat} color={mission.color} transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
      <lineSegments geometry={cells} frustumCulled={false}>
        <lineBasicMaterial ref={cellMat} color={mission.color} transparent opacity={0} depthWrite={false} />
      </lineSegments>
      <points geometry={drone} material={mat} frustumCulled={false} />
      {route.hits.map((h, i) => (
        <mesh key={i} position={h}>
          <sphereGeometry args={[0.22, 16, 12]} />
          <meshBasicMaterial
            ref={(el) => {
              hitMats.current[i] = el;
            }}
            color={RED}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}
      {[start, goal].map(
        (pt, i) =>
          pt && (
            <group key={i} position={pt}>
              <mesh position-y={-pt.y / 2}>
                <cylinderGeometry args={[0.025, 0.025, pt.y, 6]} />
                <meshBasicMaterial color={mission.color} transparent opacity={0.6} />
              </mesh>
              <Html position={[0, 0.25, 0]} center zIndexRange={[7, 0]} style={{ pointerEvents: "none" }}>
                <div
                  ref={(el) => {
                    tags.current[i] = el;
                  }}
                  className="pitch-tag pitch-tag--solid"
                  style={{ opacity: 0, ["--tag" as string]: mission.color }}
                >
                  {i === 0 ? mission.startLabel : mission.goalLabel}
                </div>
              </Html>
            </group>
          ),
      )}
    </>
  );
}

/* ---------- Scene ---------- */

export type SceneProps = {
  mission: Mission;
  enabled: Set<EntityId>;
  slide: number;
  reducedMotion: boolean;
  onReady: () => void;
  onRoute: (r: PlannedRoute) => void;
};

function Content({ city, mission, enabled, slide, onRoute }: Omit<SceneProps, "reducedMotion" | "onReady"> & { city: City }) {
  const route = useMemo(() => planMission(city, mission, zones, enabled), [city, mission, enabled]);
  useEffect(() => onRoute(route), [route, onRoute]);
  const hold = mission.priority && enabled.has("civil");
  const compact = useThree((s) => s.size.width < 700);
  return (
    <>
      <LightCity city={city} ghost={!enabled.has("twin")} />
      <SkyCells city={city} />
      <Zones city={city} enabled={enabled} slide={slide} />
      <ChaosDrones city={city} />
      <Traffic city={city} hold={hold} />
      {(slide === 3 || slide === 4 || !compact) && <MissionRoute city={city} mission={mission} route={route} />}
    </>
  );
}

export default function PitchScene(props: SceneProps) {
  const [city, setCity] = useState<City | null>(null);
  useEffect(() => {
    let alive = true;
    loadCity().then((c) => alive && setCity(c));
    return () => {
      alive = false;
    };
  }, []);
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ fov: 40, near: 0.05, far: 500, position: KEYS[0].at }}
      onCreated={props.onReady}
    >
      <color attach="background" args={[SAND]} />
      <fog attach="fog" args={[SAND, 38, 110]} />
      <hemisphereLight args={["#ffffff", "#E3D9C6", 1.6]} />
      <directionalLight position={[20, 30, 12]} intensity={1.6} />
      <Rig reducedMotion={props.reducedMotion} />
      {city && <Content city={city} mission={props.mission} enabled={props.enabled} slide={props.slide} onRoute={props.onRoute} />}
    </Canvas>
  );
}
