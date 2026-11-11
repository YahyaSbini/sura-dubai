"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import {
  axisX,
  buildEdgeGeometry,
  buildParticleGeometry,
  buildRoadGeometry,
  buildSolidGeometry,
  type City,
} from "@/lib/city";
import { ramp, scrollState } from "@/lib/state";
import { u, WAVE_GLSL } from "./uniforms";

/** Stars that fall from the sky and land on the walls of the real buildings. */
export function CityParticles({ city, count }: { city: City; count: number }) {
  const { geometry, material } = useMemo(() => {
    const geometry = buildParticleGeometry(city, count);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: u.uTime,
        uPx: u.uPx,
        uScale: u.uScale,
        uHalf: u.uHalf,
        uMorph: u.uMorph,
        uDim: u.uDim,
        uSand: u.uSand,
        uGold: u.uGold,
        uCyan: u.uCyan,
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uPx;
        uniform float uScale;
        uniform float uMorph;
        uniform float uDim;
        uniform vec3 uSand;
        uniform vec3 uGold;
        uniform vec3 uCyan;
        attribute vec3 aSky;
        attribute vec4 aRnd;
        varying vec4 vColor;
        ${WAVE_GLSL}
        void main() {
          float m = wave(uMorph, position.z, aRnd.x);
          float e = m * m * m * (m * (m * 6.0 - 15.0) + 10.0);
          vec3 p = mix(aSky, position, e);
          float arc = sin(m * 3.14159);
          p.x += sin(aRnd.z * 40.0 + m * 5.0) * arc * 4.0;
          p.z += cos(aRnd.z * 31.0 + m * 4.0) * arc * 4.0;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;

          float dist = -mv.z;
          float cityPx = (0.026 + aRnd.y * 0.02) * uScale / dist;
          float skyPx = (1.0 + aRnd.y * 1.6) * uPx;
          float px = mix(skyPx, min(cityPx, 4.5 * uPx), e);
          gl_PointSize = max(px, 1.0);

          float twinkle = 0.7 + 0.3 * sin(uTime * (0.5 + aRnd.w * 1.5) + aRnd.z * 80.0);
          float skyAlpha = step(0.82, aRnd.w) * 0.55;
          float cityAlpha = (0.45 + aRnd.y * 0.55) * clamp(px, 0.35, 1.0) * uDim;
          cityAlpha *= 1.0 - smoothstep(55.0, 130.0, dist);
          float alpha = mix(skyAlpha, cityAlpha, smoothstep(0.0, 0.25, m)) * twinkle;

          vec3 tint = uSand;
          if (aRnd.w < 0.1) tint = uGold;
          else if (aRnd.w < 0.15) tint = uCyan;
          vColor = vec4(mix(uSand, tint, smoothstep(0.3, 1.0, m)), alpha);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec4 vColor;
        void main() {
          float disc = 1.0 - smoothstep(0.45, 1.0, length(gl_PointCoord * 2.0 - 1.0));
          gl_FragColor = vec4(vColor.rgb, vColor.a * disc);
          #include <colorspace_fragment>
        }
      `,
    });
    return { geometry, material };
  }, [city, count]);
  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

/** Dark solid towers (they hide what is behind them) with thin roof and corner lines. */
export function Buildings({ city }: { city: City }) {
  const { solid, edges } = useMemo(() => {
    const solidMat = new THREE.ShaderMaterial({
      uniforms: { uHalf: u.uHalf, uCity: u.uCity, uNight: u.uNight, uIndigo: u.uIndigo },
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 2,
      vertexShader: /* glsl */ `
        uniform float uCity;
        varying vec3 vNormal;
        varying vec3 vWorld;
        varying float vDist;
        ${WAVE_GLSL}
        void main() {
          float w = wave(uCity, position.z, 0.5);
          vec3 p = position;
          p.y *= 1.0 - pow(1.0 - w, 3.0);
          vNormal = normal;
          vWorld = p;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vDist = -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uNight;
        uniform vec3 uIndigo;
        varying vec3 vNormal;
        varying vec3 vWorld;
        varying float vDist;
        void main() {
          vec3 n = normalize(vNormal);
          float roof = step(0.5, n.y);
          float light = max(dot(n, normalize(vec3(0.55, 0.6, 0.4))), 0.0);
          vec3 col = mix(uNight * 0.78, uIndigo * 1.2, light * 0.8 + roof * 0.2);
          // Floor lines on the walls, faded with distance so they never shimmer.
          float band = abs(fract(vWorld.y / 0.042) - 0.5) * 2.0;
          float line = (1.0 - smoothstep(0.0, 0.16, band)) * (1.0 - roof);
          line *= 1.0 - smoothstep(4.0, 16.0, vDist);
          col = mix(col, uIndigo * 1.9, line * 0.45);
          col *= 0.72 + 0.28 * smoothstep(0.0, 1.6, vWorld.y);
          col = mix(col, uNight, smoothstep(45.0, 125.0, vDist));
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }
      `,
    });
    const edgeMat = new THREE.ShaderMaterial({
      uniforms: { uHalf: u.uHalf, uCity: u.uCity, uSand: u.uSand, uDim: u.uDim },
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        uniform float uCity;
        uniform float uDim;
        attribute float aWeight;
        varying float vAlpha;
        ${WAVE_GLSL}
        void main() {
          float w = wave(uCity, position.z, 0.5);
          vec3 p = position;
          p.y *= 1.0 - pow(1.0 - w, 3.0);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          vAlpha = aWeight * 0.5 * w * (0.55 + 0.45 * uDim) * (1.0 - smoothstep(45.0, 125.0, -mv.z));
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uSand;
        varying float vAlpha;
        void main() {
          gl_FragColor = vec4(uSand, vAlpha);
          #include <colorspace_fragment>
        }
      `,
    });
    return {
      solid: { geometry: buildSolidGeometry(city), material: solidMat },
      edges: { geometry: buildEdgeGeometry(city), material: edgeMat },
    };
  }, [city]);
  return (
    <>
      <mesh geometry={solid.geometry} material={solid.material} frustumCulled={false} />
      <lineSegments geometry={edges.geometry} material={edges.material} frustumCulled={false} />
    </>
  );
}

const TRAFFIC = 280;

/** Ground, the real road network, and light moving along Sheikh Zayed Road. */
export function Roads({ city }: { city: City }) {
  const { ground, roads, traffic, cars } = useMemo(() => {
    const groundMat = new THREE.ShaderMaterial({
      uniforms: { uNight: u.uNight },
      vertexShader: /* glsl */ `
        varying vec2 vPos;
        void main() {
          vPos = position.xy;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uNight;
        varying vec2 vPos;
        void main() {
          float d = length(vPos * vec2(1.0, 0.55));
          vec3 col = mix(uNight * 0.74, uNight, smoothstep(8.0, 46.0, d));
          // Dither: a dark gradient this smooth shows banding otherwise.
          col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }
      `,
    });
    const roadMat = new THREE.ShaderMaterial({
      uniforms: { uTime: u.uTime, uRoads: u.uRoads, uGold: u.uGold, uCyan: u.uCyan, uSand: u.uSand },
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        attribute vec2 aInfo;
        varying vec2 vInfo;
        varying float vFade;
        void main() {
          vInfo = aInfo;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vFade = 1.0 - smoothstep(45.0, 125.0, -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uRoads;
        uniform vec3 uGold;
        uniform vec3 uCyan;
        uniform vec3 uSand;
        varying vec2 vInfo;
        varying float vFade;
        void main() {
          float motorway = 1.0 - step(0.5, vInfo.y);
          float pulse = pow(fract(vInfo.x * 0.45 - uTime * 0.22), 8.0);
          vec3 col = mix(uCyan, mix(uGold, uSand, pulse), motorway);
          float alpha = mix(0.16, 0.5 + 0.5 * pulse, motorway);
          gl_FragColor = vec4(col, alpha * uRoads * vFade);
          #include <colorspace_fragment>
        }
      `,
    });

    const cars = new Float32Array(TRAFFIC * 4);
    let seed = 5;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const tint = new Float32Array(TRAFFIC);
    for (let i = 0; i < TRAFFIC; i++) {
      const dir = i % 2 ? 1 : -1;
      cars[i * 4] = dir * (0.045 + rand() * 0.1);
      cars[i * 4 + 1] = rand();
      cars[i * 4 + 2] = dir * (0.012 + rand() * 0.008);
      tint[i] = dir > 0 ? 1 : 0;
    }
    const trafficGeo = new THREE.BufferGeometry();
    trafficGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TRAFFIC * 3), 3));
    trafficGeo.setAttribute("aTint", new THREE.BufferAttribute(tint, 1));
    const trafficMat = new THREE.ShaderMaterial({
      uniforms: { uPx: u.uPx, uScale: u.uScale, uRoads: u.uRoads, uGold: u.uGold, uSand: u.uSand },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        uniform float uPx;
        uniform float uScale;
        attribute float aTint;
        varying float vTint;
        varying float vFade;
        void main() {
          vTint = aTint;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp(0.05 * uScale / -mv.z, 1.5 * uPx, 7.0 * uPx);
          vFade = 1.0 - smoothstep(40.0, 110.0, -mv.z);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uRoads;
        uniform vec3 uGold;
        uniform vec3 uSand;
        varying float vTint;
        varying float vFade;
        void main() {
          float disc = 1.0 - smoothstep(0.3, 1.0, length(gl_PointCoord * 2.0 - 1.0));
          gl_FragColor = vec4(mix(uSand, uGold, vTint), disc * uRoads * vFade * 0.9);
          #include <colorspace_fragment>
        }
      `,
    });
    return {
      ground: { geometry: new THREE.PlaneGeometry(700, 700), material: groundMat },
      roads: { geometry: buildRoadGeometry(city), material: roadMat },
      traffic: { geometry: trafficGeo, material: trafficMat },
      cars,
    };
  }, [city]);

  useFrame(() => {
    if (u.uRoads.value <= 0.001) return;
    const pos = traffic.geometry.attributes.position as THREE.BufferAttribute;
    const span = city.halfLength * 2 - 6;
    for (let i = 0; i < TRAFFIC; i++) {
      const f = (((cars[i * 4 + 1] + cars[i * 4 + 2] * u.uTime.value) % 1) + 1) % 1;
      const z = -span / 2 + f * span;
      pos.setXYZ(i, axisX(city, z) + cars[i * 4], 0.012, z);
    }
    pos.needsUpdate = true;
  });

  return (
    <>
      <mesh geometry={ground.geometry} material={ground.material} rotation-x={-Math.PI / 2} position-y={-0.004} />
      <lineSegments geometry={roads.geometry} material={roads.material} frustumCulled={false} />
      <points geometry={traffic.geometry} material={traffic.material} frustumCulled={false} />
    </>
  );
}

const SHOWN = [
  ["Burj Khalifa", "Burj Khalifa"],
  ["Emirates Office Tower", "Emirates Towers"],
  ["Gevora Hotel", "Gevora Hotel"],
] as const;

/** Names and real heights of a few towers, shown while the city has just formed. */
export function TowerLabels({ city }: { city: City }) {
  const group = useRef<HTMLDivElement[]>([]);
  const labels = useMemo(
    () =>
      SHOWN.flatMap(([key, name]) => {
        const l = city.labels.find((x) => x.name === key);
        return l ? [{ ...l, name }] : [];
      }),
    [city],
  );
  useFrame(() => {
    const t = scrollState.t;
    const o = ramp(t, 2.0, 2.2) * (1 - ramp(t, 2.55, 2.75));
    for (const el of group.current) if (el) el.style.opacity = String(o);
  });
  return (
    <>
      {labels.map((l, i) => (
        <Html key={l.name} position={[l.x, l.h, l.z]} zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
          <div
            ref={(el) => {
              if (el) group.current[i] = el;
            }}
            className="tower-label"
            style={{ opacity: 0 }}
          >
            <span className="tower-label__name">{l.name}</span>
            <span className="tower-label__height">{Math.round(l.h * 100)} m</span>
          </div>
        </Html>
      ))}
    </>
  );
}
