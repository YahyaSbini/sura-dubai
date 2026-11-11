"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { STAR_GLSL, u } from "./uniforms";

const STAR_COUNT = 2600;

/** Background stars: they stay in the sky for the whole journey. */
export function Stars() {
  const { geometry, material } = useMemo(() => {
    const pos = new Float32Array(STAR_COUNT * 3);
    const rnd = new Float32Array(STAR_COUNT * 3);
    let seed = 11;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < STAR_COUNT; i++) {
      const az = rand() * Math.PI * 2;
      const el = Math.asin(-0.02 + rand() * 1.02);
      const rad = 230 + rand() * 60;
      pos[i * 3] = Math.cos(az) * Math.cos(el) * rad;
      pos[i * 3 + 1] = Math.sin(el) * rad;
      pos[i * 3 + 2] = Math.sin(az) * Math.cos(el) * rad;
      rnd[i * 3] = rand();
      rnd[i * 3 + 1] = rand();
      rnd[i * 3 + 2] = rand();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute("aRnd", new THREE.BufferAttribute(rnd, 3));
    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: u.uTime, uPx: u.uPx, uSand: u.uSand, uGold: u.uGold },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uPx;
        attribute vec3 aRnd;
        varying float vAlpha;
        varying float vBig;
        varying float vTint;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          vBig = step(0.965, aRnd.x);
          float size = mix(1.0 + aRnd.x * 1.8, 9.0 + aRnd.y * 7.0, vBig);
          gl_PointSize = size * uPx;
          float twinkle = 0.72 + 0.28 * sin(uTime * (0.6 + aRnd.y * 1.4) + aRnd.z * 60.0);
          vAlpha = (0.35 + aRnd.z * 0.55) * twinkle;
          vTint = step(0.9, aRnd.y);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uSand;
        uniform vec3 uGold;
        varying float vAlpha;
        varying float vBig;
        varying float vTint;
        ${STAR_GLSL}
        void main() {
          vec2 uv = gl_PointCoord * 2.0 - 1.0;
          float disc = 1.0 - smoothstep(0.55, 1.0, length(uv));
          float shape = mix(disc, suraStar(uv), vBig);
          gl_FragColor = vec4(mix(uSand, uGold, max(vTint, vBig * 0.6)), shape * vAlpha);
          #include <colorspace_fragment>
        }
      `,
    });
    return { geometry, material };
  }, []);
  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

export const GUIDE_STAR = new THREE.Vector3(30, 34, -25);
const PATH_START = new THREE.Vector3(1.1, 0.3, 21);
const PATH_DOTS = 44;

/** The logo in space: a guiding star and the dotted path that rises to it from the road. */
export function GuideStar() {
  const { star, path } = useMemo(() => {
    // A camera-facing quad rather than a point: point sizes are capped on many GPUs.
    const starGeo = new THREE.PlaneGeometry(2, 2);
    const starMat = new THREE.ShaderMaterial({
      uniforms: { uGuide: u.uGuide, uGold: u.uGold, uNight: u.uNight },
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        uniform float uGuide;
        varying vec2 vUv;
        void main() {
          vUv = position.xy;
          vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          mv.xy += position.xy * 5.2 * (0.6 + 0.4 * uGuide);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uGold;
        uniform vec3 uNight;
        uniform float uGuide;
        varying vec2 vUv;
        ${STAR_GLSL}
        void main() {
          float s = suraStar(vUv);
          float hole = 1.0 - smoothstep(0.085, 0.11, length(vUv));
          gl_FragColor = vec4(mix(uGold, uNight, hole), s * uGuide);
          #include <colorspace_fragment>
        }
      `,
    });

    const curve = new THREE.QuadraticBezierCurve3(PATH_START, new THREE.Vector3(14, 5, 2), GUIDE_STAR);
    const pos = new Float32Array(PATH_DOTS * 3);
    const idx = new Float32Array(PATH_DOTS);
    for (let i = 0; i < PATH_DOTS; i++) {
      curve.getPoint((i / (PATH_DOTS - 1)) * 0.84).toArray(pos, i * 3);
      idx[i] = i / (PATH_DOTS - 1);
    }
    const pathGeo = new THREE.BufferGeometry();
    pathGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    pathGeo.setAttribute("aIndex", new THREE.BufferAttribute(idx, 1));
    const pathMat = new THREE.ShaderMaterial({
      uniforms: { uPx: u.uPx, uScale: u.uScale, uPath: u.uPath, uGuide: u.uGuide, uGold: u.uGold },
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        uniform float uScale;
        uniform float uPx;
        uniform float uPath;
        attribute float aIndex;
        varying float vAlpha;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          float world = aIndex == 0.0 ? 1.0 : 0.36;
          gl_PointSize = clamp(world * uScale / -mv.z, 2.0 * uPx, (aIndex == 0.0 ? 22.0 : 9.0) * uPx);
          vAlpha = smoothstep(aIndex - 0.02, aIndex + 0.02, uPath * 1.04);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uGold;
        uniform float uGuide;
        varying float vAlpha;
        void main() {
          float disc = 1.0 - smoothstep(0.7, 1.0, length(gl_PointCoord * 2.0 - 1.0));
          gl_FragColor = vec4(uGold, disc * vAlpha * uGuide);
          #include <colorspace_fragment>
        }
      `,
    });
    return { star: { geometry: starGeo, material: starMat }, path: { geometry: pathGeo, material: pathMat } };
  }, []);
  return (
    <>
      <mesh geometry={star.geometry} material={star.material} position={GUIDE_STAR} frustumCulled={false} />
      <points geometry={path.geometry} material={path.material} frustumCulled={false} />
    </>
  );
}
