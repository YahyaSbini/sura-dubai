"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { type EntityId, entities, type Mission, missions, slideNames } from "@/content/pitch";
import { deckState, type PlannedRoute } from "@/lib/pitch";
import { Mark } from "../Logo";
import {
  AskSlide,
  BusinessSlide,
  CompetitionSlide,
  FinancialsSlide,
  GoToMarketSlide,
  HookSlide,
  IntroSlide,
  MarketSlide,
  ProblemSlide,
  ProductSlide,
  SolutionSlide,
  TeamSlide,
  TractionSlide,
} from "./Slides";
import { HUMAN_BEATS, HumanSlide } from "./HumanSlide";

const PitchScene = dynamic(() => import("./PitchScene"), { ssr: false });

const LAST = slideNames.length - 1;
const HUMAN = slideNames.indexOf("From Dubai to the human");

/** Slides whose text sits in a left panel over the scene. */
const LEFT_PANEL = new Set([1, 2, 4]);

export default function Pitch() {
  const [slide, setSlide] = useState(0);
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [mission, setMission] = useState<Mission>(missions[0]);
  const [enabled, setEnabled] = useState<Set<EntityId>>(() => new Set(entities.map((e) => e.id)));
  const [route, setRoute] = useState<PlannedRoute | null>(null);
  const [beat, setBeat] = useState(0);
  const pos = useRef({ slide: 0, beat: 0 });
  const wheel = useRef({ sum: 0, lock: 0 });
  const touch = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    pos.current = { slide, beat };
  }, [slide, beat]);

  const go = useCallback((n: number) => {
    setBeat(0);
    setSlide(Math.max(0, Math.min(LAST, n)));
  }, []);
  /** On the human slide, next/prev step through its beats before leaving it. */
  const next = useCallback(() => {
    const { slide: s, beat: b } = pos.current;
    if (s === HUMAN && b < HUMAN_BEATS - 1) return setBeat(b + 1);
    setBeat(0);
    setSlide(Math.min(LAST, s + 1));
  }, []);
  const prev = useCallback(() => {
    const { slide: s, beat: b } = pos.current;
    if (s === HUMAN && b > 0) return setBeat(b - 1);
    setBeat(s - 1 === HUMAN ? HUMAN_BEATS - 1 : 0);
    setSlide(Math.max(0, s - 1));
  }, []);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const fromHash = Number.parseInt(window.location.hash.slice(1), 10);
    if (Number.isFinite(fromHash)) setSlide(Math.max(0, Math.min(LAST, fromHash)));
  }, []);

  useEffect(() => {
    deckState.slide = slide;
    window.history.replaceState(null, "", slide ? `#${slide}` : window.location.pathname);
  }, [slide]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const onButton = (e.target as HTMLElement)?.closest("button, a, input");
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
          e.preventDefault();
          next();
          break;
        case " ":
          if (onButton) return;
          e.preventDefault();
          next();
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          prev();
          break;
        case "Home":
          go(0);
          break;
        case "End":
          go(LAST);
          break;
        case "f":
        case "F":
          toggleFullscreen();
          break;
      }
    };
    const scrollable = (el: EventTarget | null, dy: number) => {
      const box = (el as HTMLElement)?.closest?.("[data-scroll]") as HTMLElement | null;
      if (!box || box.scrollHeight <= box.clientHeight + 1) return false;
      return dy > 0 ? box.scrollTop + box.clientHeight < box.scrollHeight - 1 : box.scrollTop > 0;
    };
    const onWheel = (e: WheelEvent) => {
      if (scrollable(e.target, e.deltaY)) return;
      const w = wheel.current;
      const now = performance.now();
      if (now < w.lock) return;
      w.sum += e.deltaY + e.deltaX;
      if (Math.abs(w.sum) > 60) {
        if (w.sum > 0) next();
        else prev();
        w.sum = 0;
        w.lock = now + 900;
      }
    };
    const onTouchStart = (e: TouchEvent) => {
      touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onTouchEnd = (e: TouchEvent) => {
      const t = touch.current;
      touch.current = null;
      if (!t) return;
      const dx = e.changedTouches[0].clientX - t.x;
      const dy = e.changedTouches[0].clientY - t.y;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        if (dx < 0) next();
        else prev();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [go, next, prev, toggleFullscreen]);

  const toggleEntity = useCallback((id: EntityId) => {
    setEnabled((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const onReady = useCallback(() => setReady(true), []);
  const wash = slide >= 5 ? "full" : LEFT_PANEL.has(slide) ? "left" : slide === 3 ? "top" : "none";

  const slides = [
    <HookSlide key="hook" active={slide === 0} onDone={next} />,
    <IntroSlide key="intro" active={slide === 1} />,
    <ProblemSlide key="problem" active={slide === 2} />,
    <SolutionSlide
      key="solution"
      active={slide === 3}
      mission={mission}
      onMission={setMission}
      enabled={enabled}
      onToggle={toggleEntity}
      route={route}
    />,
    <ProductSlide key="product" active={slide === 4} />,
    <MarketSlide key="market" active={slide === 5} />,
    <BusinessSlide key="business" active={slide === 6} />,
    <TractionSlide key="traction" active={slide === 7} />,
    <GoToMarketSlide key="gtm" active={slide === 8} />,
    <CompetitionSlide key="competition" active={slide === 9} />,
    <FinancialsSlide key="financials" active={slide === 10} />,
    <TeamSlide key="team" active={slide === 11} />,
    <HumanSlide key="human" active={slide === HUMAN} n={HUMAN} beat={beat} onBeat={setBeat} />,
    <AskSlide key="ask" active={slide === LAST} onRestart={() => go(0)} />,
  ];

  return (
    <main className="pitch fixed inset-0 overflow-hidden bg-sand text-night">
      <div
        className={`absolute inset-0 transition-opacity duration-[1200ms] ease-out ${ready ? "opacity-100" : "opacity-0"}`}
        aria-hidden="true"
      >
        <PitchScene
          slide={slide}
          mission={mission}
          enabled={enabled}
          reducedMotion={reducedMotion}
          onReady={onReady}
          onRoute={setRoute}
        />
      </div>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className={`pitch-wash pitch-wash--left ${wash === "left" ? "opacity-100" : "opacity-0"}`} />
        <div className={`pitch-wash pitch-wash--full ${wash === "full" ? "opacity-100" : "opacity-0"}`} />
        <div className={`pitch-wash pitch-wash--top ${wash === "top" ? "opacity-100" : "opacity-0"}`} />
      </div>

      <div className="absolute inset-0">{slides}</div>

      <header
        className={`absolute inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-4 transition-opacity duration-500 md:px-10 md:py-6 ${
          slide === 0 ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <button
          type="button"
          onClick={() => go(1)}
          tabIndex={slide === 0 ? -1 : 0}
          className="flex min-h-11 items-center gap-3 transition-opacity duration-200 hover:opacity-75"
          aria-label="SURA Dubai, go to the introduction"
        >
          <Mark className="h-8 w-8" color="#0B1B33" hole="#F3EDE2" />
          <span className="flex items-baseline gap-2">
            <span className="text-sm font-bold tracking-[0.3em]">SURA</span>
            <span className="text-xs font-medium tracking-[0.35em] text-gold-deep">DUBAI</span>
          </span>
        </button>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-ink-soft sm:inline">
            <span className="font-medium text-night tabular-nums">{String(slide).padStart(2, "0")}</span>
            <span className="mx-1.5 text-mist">/</span>
            <span className="tabular-nums">{String(LAST).padStart(2, "0")}</span>
            <span className="ml-3">{slideNames[slide]}</span>
          </span>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="ml-3 hidden min-h-11 items-center gap-2 rounded-full border border-night/15 bg-white/60 px-4 text-sm backdrop-blur transition-colors hover:bg-white md:flex"
            aria-label="Toggle fullscreen (F)"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M1 5V1h4M11 1h4v4M15 11v4h-4M5 15H1v-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            Present
          </button>
        </div>
      </header>

      <nav
        aria-label="Slides"
        className={`absolute inset-x-0 bottom-0 z-30 flex items-center gap-3 px-5 pb-4 transition-opacity duration-500 md:gap-5 md:px-10 md:pb-6 ${
          slide === 0 ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <button type="button" onClick={prev} className="pitch-arrow" aria-label="Previous slide" tabIndex={slide === 0 ? -1 : 0}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M10 3 5 8l5 5" />
          </svg>
        </button>
        <ol className="flex flex-1 items-center gap-1">
          {slideNames.map((name, i) => (
            <li key={name} className="flex-1">
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={`${String(i).padStart(2, "0")} ${name}`}
                aria-current={slide === i ? "step" : undefined}
                tabIndex={slide === 0 ? -1 : 0}
                className="group relative flex h-8 w-full items-center"
              >
                <span
                  className={`block h-1 w-full rounded-full transition-colors duration-300 ${
                    i < slide ? "bg-night/55" : i === slide ? "bg-gold" : "bg-night/12 group-hover:bg-night/30"
                  }`}
                />
                <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 rounded-md bg-night px-2 py-1 text-xs whitespace-nowrap text-sand opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 md:block">
                  {name}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <button type="button" onClick={next} className="pitch-arrow pitch-arrow--next" aria-label="Next slide" tabIndex={slide === 0 ? -1 : 0}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="m6 3 5 5-5 5" />
          </svg>
        </button>
      </nav>
    </main>
  );
}
