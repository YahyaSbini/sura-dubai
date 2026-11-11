"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { type City, loadCity } from "@/lib/city";
import { palette } from "@/lib/palette";
import { FocusCell, Routes, SkyCells } from "./Airspace";
import { Buildings, CityParticles, Roads, TowerLabels } from "./CityScene";
import { Rig } from "./Rig";
import { GuideStar, Stars } from "./Sky";
import { u } from "./uniforms";

export default function Scene({ reducedMotion, onReady }: { reducedMotion: boolean; onReady: () => void }) {
  const [city, setCity] = useState<City | null>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    setCompact(window.matchMedia("(max-width: 767px)").matches);
    let alive = true;
    loadCity().then((c) => {
      if (!alive) return;
      u.uHalf.value = c.halfLength;
      setCity(c);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Canvas
      dpr={[1, compact ? 1.5 : 1.75]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ fov: 42, near: 0.05, far: 700, position: [0, 30, 62] }}
      flat
      onCreated={onReady}
    >
      <color attach="background" args={[palette.night]} />
      <Rig reducedMotion={reducedMotion} />
      <Stars />
      <GuideStar />
      {city && (
        <>
          <Roads city={city} />
          <Buildings city={city} />
          <CityParticles city={city} count={compact ? 30000 : 70000} />
          <SkyCells city={city} />
          <FocusCell city={city} />
          <Routes city={city} />
          {!compact && <TowerLabels city={city} />}
        </>
      )}
    </Canvas>
  );
}
