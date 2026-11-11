import * as THREE from "three";
import { palette } from "@/lib/palette";

/** Uniforms shared by every material in the scene; `Rig` updates them once per frame. */
export const u = {
  uTime: { value: 0 },
  /** Device pixel ratio of the drawing buffer. */
  uPx: { value: 1 },
  /** Pixels covered by one scene unit at distance 1. */
  uScale: { value: 1000 },
  uHalf: { value: 28.66 },
  uMorph: { value: 0 },
  uCity: { value: 0 },
  uRoads: { value: 0 },
  uCells: { value: 0 },
  uRoutes: { value: 0 },
  uDrones: { value: 0 },
  uGuide: { value: 0 },
  uPath: { value: 0 },
  uDim: { value: 1 },
  uNight: { value: new THREE.Color(palette.night) },
  uIndigo: { value: new THREE.Color(palette.indigo) },
  uGold: { value: new THREE.Color(palette.gold) },
  uCyan: { value: new THREE.Color(palette.cyan) },
  uSand: { value: new THREE.Color(palette.sand) },
};

/** GLSL: four-pointed SURA star, 1 inside and 0 outside, for uv in -1..1. */
export const STAR_GLSL = /* glsl */ `
float suraStar(vec2 uv) {
  float d = pow(abs(uv.x), 0.56) + pow(abs(uv.y), 0.56);
  return 1.0 - smoothstep(0.9, 1.0, d);
}
`;

/** GLSL: how far the build-up wave has reached a point at depth z (0 = not yet, 1 = done). */
export const WAVE_GLSL = /* glsl */ `
uniform float uHalf;
float wave(float progress, float z, float jitter) {
  float d = clamp((uHalf - z) / (2.0 * uHalf), 0.0, 1.0) * 0.72 + jitter * 0.28;
  return clamp(progress * 1.7 - d * 0.7, 0.0, 1.0);
}
`;
