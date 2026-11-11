"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { CHAPTER_COUNT, clamp01, pointer, ramp, scrollState } from "@/lib/state";
import { u } from "./uniforms";

/** Camera position and look-at target for each chapter (1 unit = 100 m). */
const KEYS: { at: [number, number, number]; look: [number, number, number] }[] = [
  { at: [0, 30, 62], look: [0, 92, -40] }, // night sky
  { at: [-7, 10, 60], look: [5, 12, 0] }, // the guiding star and its path
  { at: [8.5, 4.4, 34], look: [-2.6, 2.1, 4] }, // the city forms
  { at: [1.0, 0.5, 17], look: [-0.45, 2.2, -12] }, // down on the road
  { at: [6.2, 4.7, 8.5], look: [-2, 1.8, -8] }, // sky cells
  { at: [0.15, 2.46, 3], look: [-0.6, 2.35, -22] }, // inside a corridor
  { at: [12, 41, 14], look: [-5.5, 0, 0] }, // the whole system
];

export function Rig({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera, gl, size } = useThree();
  const curves = useMemo(
    () => ({
      at: new THREE.CatmullRomCurve3(KEYS.map((k) => new THREE.Vector3(...k.at)), false, "catmullrom", 0.35),
      look: new THREE.CatmullRomCurve3(KEYS.map((k) => new THREE.Vector3(...k.look)), false, "catmullrom", 0.35),
    }),
    [],
  );
  const smooth = useRef(0);
  const sway = useRef(new THREE.Vector2());
  const at = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    if (!reducedMotion) u.uTime.value += dt;
    const t = scrollState.t;
    smooth.current += (t - smooth.current) * (1 - Math.exp(-dt * 7));
    const s = smooth.current;

    // Linger near each chapter, move faster between them.
    const i = Math.min(Math.floor(s), CHAPTER_COUNT - 2);
    const f = clamp01(s - i);
    const eased = f + (f * f * (3 - 2 * f) - f) * 0.7;
    const p = (i + eased) / (CHAPTER_COUNT - 1);
    curves.at.getPoint(p, at);
    curves.look.getPoint(p, look);

    const cam = camera as THREE.PerspectiveCamera;
    const portrait = size.width < size.height;
    const fov = portrait ? 64 : 42;
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }

    sway.current.x += (pointer.x - sway.current.x) * (1 - Math.exp(-dt * 3));
    sway.current.y += (pointer.y - sway.current.y) * (1 - Math.exp(-dt * 3));
    cam.position.copy(at);
    cam.lookAt(look);
    const reach = Math.min(at.distanceTo(look) * 0.012, 0.5);
    right.setFromMatrixColumn(cam.matrixWorld, 0);
    cam.position.addScaledVector(right, sway.current.x * reach);
    cam.position.y += sway.current.y * reach * 0.6;
    cam.lookAt(look);

    u.uPx.value = gl.getPixelRatio();
    u.uScale.value = (size.height * gl.getPixelRatio()) / (2 * Math.tan((fov * Math.PI) / 360));

    u.uGuide.value = ramp(s, 0.2, 0.6) * (1 - ramp(s, 1.45, 1.85));
    u.uPath.value = ramp(s, 0.45, 1.35);
    u.uMorph.value = clamp01((s - 1.2) / 0.95);
    u.uCity.value = clamp01((s - 1.45) / 0.85);
    u.uRoads.value = ramp(s, 1.9, 2.5);
    u.uCells.value = clamp01((s - 3.3) / 0.8);
    u.uRoutes.value = clamp01((s - 4.35) / 0.7);
    u.uDrones.value = ramp(s, 4.55, 4.95);
    u.uDim.value = 1 - 0.45 * ramp(s, 3.3, 4.0);
  });
  return null;
}
