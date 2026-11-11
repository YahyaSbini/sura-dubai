"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import {
  cellAt,
  cellCenter,
  cellCode,
  type City,
  isCellOpen,
  LAYER_ALTITUDES,
  LAYER_HEIGHT,
  planRoute,
} from "@/lib/city";
import { ramp, scrollState } from "@/lib/state";
import { STAR_GLSL, u } from "./uniforms";

const CELL_INSET = 0.93;

function hexRing(radius: number, y: number, out: number[]) {
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3;
    const b = ((k + 1) * Math.PI) / 3;
    out.push(Math.sin(a) * radius, y, Math.cos(a) * radius, Math.sin(b) * radius, y, Math.cos(b) * radius);
  }
}

function prismLines(radius: number, height: number) {
  const out: number[] = [];
  hexRing(radius, 0, out);
  hexRing(radius, height, out);
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3;
    out.push(Math.sin(a) * radius, 0, Math.cos(a) * radius, Math.sin(a) * radius, height, Math.cos(a) * radius);
  }
  return out;
}

/** Three altitude layers of hexagonal sky cells. Cells already occupied by a tower are left out. */
export function SkyCells({ city }: { city: City }) {
  const { geometry, material } = useMemo(() => {
    const base: number[] = [];
    hexRing(city.hexRadius * CELL_INSET, 0, base);
    const offsets: number[] = [];
    const info: number[] = [];
    const focus = [-1, -6];
    let seed = 3;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    LAYER_ALTITUDES.forEach((alt, layer) => {
      for (let r = -city.hexRows; r <= city.hexRows; r++) {
        for (let q = -city.hexCols; q <= city.hexCols; q++) {
          if (!isCellOpen(city, layer, q, r)) continue;
          const [x, z] = cellCenter(city, q, r);
          offsets.push(x, alt, z);
          const d = Math.hypot(x - focus[0], z - focus[1]) / 36;
          info.push(Math.min(1, d * 0.82 + layer * 0.09), rand());
        }
      }
    });
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(base, 3));
    geometry.setAttribute("aOffset", new THREE.InstancedBufferAttribute(new Float32Array(offsets), 3));
    geometry.setAttribute("aInfo", new THREE.InstancedBufferAttribute(new Float32Array(info), 2));
    geometry.instanceCount = offsets.length / 3;
    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: u.uTime, uCells: u.uCells, uCyan: u.uCyan },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uCells;
        attribute vec3 aOffset;
        attribute vec2 aInfo;
        varying float vAlpha;
        void main() {
          float r = clamp(uCells * 2.4 - aInfo.x * 1.4, 0.0, 1.0);
          float e = 1.0 - pow(1.0 - r, 3.0);
          vec3 p = position * mix(0.15, 1.0, e) + aOffset;
          p.y += (1.0 - e) * 0.5;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float breathe = 0.78 + 0.22 * sin(uTime * 0.7 + aInfo.y * 6.283);
          vAlpha = e * 0.36 * breathe * (1.0 - smoothstep(40.0, 115.0, -mv.z));
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uCyan;
        varying float vAlpha;
        void main() {
          gl_FragColor = vec4(uCyan, vAlpha);
          #include <colorspace_fragment>
        }
      `,
    });
    return { geometry, material };
  }, [city]);
  return <lineSegments geometry={geometry} material={material} frustumCulled={false} />;
}

/** One highlighted cell with its address, shown while the cells are introduced. */
export function FocusCell({ city }: { city: City }) {
  const label = useRef<HTMLDivElement>(null);
  const { position, code, lines, fill, lineMat, fillMat } = useMemo(() => {
    const layer = 1;
    const [q0, r] = cellAt(city, 0.4, -4.6);
    let q = q0;
    for (let d = 0; d < 6 && !isCellOpen(city, layer, q, r); d++) q += 1;
    const [x, z] = cellCenter(city, q, r);
    const lines = new THREE.BufferGeometry();
    lines.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(prismLines(city.hexRadius * CELL_INSET, LAYER_HEIGHT), 3),
    );
    const fill = new THREE.CylinderGeometry(city.hexRadius * CELL_INSET, city.hexRadius * CELL_INSET, LAYER_HEIGHT, 6);
    fill.translate(0, LAYER_HEIGHT / 2, 0);
    return {
      position: new THREE.Vector3(x, LAYER_ALTITUDES[layer], z),
      code: cellCode(city, layer, q, r),
      lines,
      fill,
      lineMat: new THREE.LineBasicMaterial({ color: u.uGold.value, transparent: true, opacity: 0, depthWrite: false }),
      fillMat: new THREE.MeshBasicMaterial({
        color: u.uGold.value,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    };
  }, [city]);
  useFrame(() => {
    const t = scrollState.t;
    const o = ramp(t, 3.7, 3.95) * (1 - ramp(t, 4.4, 4.6));
    lineMat.opacity = o;
    fillMat.opacity = o * 0.14;
    if (label.current) label.current.style.opacity = String(o);
  });
  return (
    <group position={position}>
      <lineSegments geometry={lines} material={lineMat} />
      <mesh geometry={fill} material={fillMat} />
      <Html position={[0, LAYER_HEIGHT, 0]} zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
        <div ref={label} className="cell-tag" style={{ opacity: 0 }}>
          {code}
        </div>
      </Html>
    </group>
  );
}

const DRONES_PER_ROUTE = 5;
const LOOP_SECONDS = 95;

/** Corridors planned through open cells, with drones that light up the cell they are in. */
export function Routes({ city }: { city: City }) {
  const label = useRef<HTMLDivElement>(null);
  const labelAnchor = useRef<THREE.Group>(null);
  const lastCode = useRef("");

  const { curves, tubes, tubeMat, drones, droneMat, prisms, prismMat } = useMemo(() => {
    const curves = [planRoute(city, 0, 1, 2, 2), planRoute(city, 1, 0, -1, 0), planRoute(city, 2, -2, -3, -2)];
    const tubes = curves.map((c) => new THREE.TubeGeometry(c, 420, 0.022, 6, false));
    const tubeMat = new THREE.ShaderMaterial({
      uniforms: { uTime: u.uTime, uRoutes: u.uRoutes, uCyan: u.uCyan, uSand: u.uSand },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying float vFade;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vFade = 1.0 - smoothstep(45.0, 120.0, -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uRoutes;
        uniform vec3 uCyan;
        uniform vec3 uSand;
        varying vec2 vUv;
        varying float vFade;
        void main() {
          float drawn = 1.0 - smoothstep(uRoutes - 0.01, uRoutes, vUv.x);
          float pulse = pow(fract(vUv.x * 26.0 - uTime * 0.35), 5.0);
          vec3 col = mix(uCyan, uSand, pulse * 0.7);
          gl_FragColor = vec4(col, drawn * (0.55 + 0.45 * pulse) * vFade * step(0.001, uRoutes));
          #include <colorspace_fragment>
        }
      `,
    });

    const n = curves.length * DRONES_PER_ROUTE;
    const drones = new THREE.BufferGeometry();
    drones.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const droneMat = new THREE.ShaderMaterial({
      uniforms: { uPx: u.uPx, uScale: u.uScale, uDrones: u.uDrones, uGold: u.uGold, uSand: u.uSand },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      vertexShader: /* glsl */ `
        uniform float uPx;
        uniform float uScale;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp(0.42 * uScale / -mv.z, 9.0 * uPx, 30.0 * uPx);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uDrones;
        uniform vec3 uGold;
        uniform vec3 uSand;
        ${STAR_GLSL}
        void main() {
          vec2 uv = gl_PointCoord * 2.0 - 1.0;
          float s = suraStar(uv);
          float core = 1.0 - smoothstep(0.0, 0.3, length(uv));
          gl_FragColor = vec4(mix(uGold, uSand, core), s * uDrones);
          #include <colorspace_fragment>
        }
      `,
    });

    const prisms = new THREE.InstancedBufferGeometry();
    prisms.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(prismLines(city.hexRadius * CELL_INSET, LAYER_HEIGHT), 3),
    );
    prisms.setAttribute("aOffset", new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3));
    prisms.instanceCount = n;
    const prismMat = new THREE.ShaderMaterial({
      uniforms: { uDrones: u.uDrones, uGold: u.uGold },
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        attribute vec3 aOffset;
        varying float vFade;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position + aOffset, 1.0);
          vFade = 1.0 - smoothstep(45.0, 120.0, -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uDrones;
        uniform vec3 uGold;
        varying float vFade;
        void main() {
          gl_FragColor = vec4(uGold, 0.85 * uDrones * vFade);
          #include <colorspace_fragment>
        }
      `,
    });
    return { curves, tubes, tubeMat, drones, droneMat, prisms, prismMat };
  }, [city]);

  const point = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (u.uDrones.value <= 0.001) {
      if (label.current) label.current.style.opacity = "0";
      return;
    }
    const dronePos = drones.attributes.position as THREE.BufferAttribute;
    const prismPos = prisms.attributes.aOffset as THREE.InstancedBufferAttribute;
    const time = u.uTime.value;
    curves.forEach((curve, layer) => {
      for (let k = 0; k < DRONES_PER_ROUTE; k++) {
        const i = layer * DRONES_PER_ROUTE + k;
        const f = (time / LOOP_SECONDS + k / DRONES_PER_ROUTE + layer * 0.07) % 1;
        curve.getPointAt(f, point);
        dronePos.setXYZ(i, point.x, point.y, point.z);
        const [q, r] = cellAt(city, point.x, point.z);
        const [cx, cz] = cellCenter(city, q, r);
        prismPos.setXYZ(i, cx, LAYER_ALTITUDES[layer], cz);
        if (layer === 1 && k === 0) {
          labelAnchor.current?.position.copy(point);
          const code = cellCode(city, layer, q, r);
          if (label.current && code !== lastCode.current) {
            label.current.textContent = code;
            lastCode.current = code;
          }
        }
      }
    });
    dronePos.needsUpdate = true;
    prismPos.needsUpdate = true;
    if (label.current) {
      const t = scrollState.t;
      label.current.style.opacity = String(u.uDrones.value * (1 - ramp(t, 5.45, 5.7)));
    }
  });

  return (
    <>
      {tubes.map((g, i) => (
        <mesh key={i} geometry={g} material={tubeMat} frustumCulled={false} />
      ))}
      <lineSegments geometry={prisms} material={prismMat} frustumCulled={false} />
      <points geometry={drones} material={droneMat} frustumCulled={false} />
      <group ref={labelAnchor}>
        <Html zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
          <div ref={label} className="cell-tag" style={{ opacity: 0 }} />
        </Html>
      </group>
    </>
  );
}
