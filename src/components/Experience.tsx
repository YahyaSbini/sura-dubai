"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { chapters, closing, hero } from "@/content/chapters";
import { CHAPTER_COUNT, pointer, scrollState } from "@/lib/state";
import { Lockup, Mark } from "./Logo";

const Scene = dynamic(() => import("./scene/Scene"), { ssr: false });

/** How close (in chapters) the scroll must be to a chapter for its text to show. */
const TEXT_WINDOW = 0.36;
const NAV = ["Night", ...chapters.map((c) => c.nav)];

export default function Experience() {
  const track = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const lenis = useRef<Lenis | null>(null);
  const [active, setActive] = useState(0);
  const [nearest, setNearest] = useState(0);
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReducedMotion(reduce);

    let tick: ((time: number) => void) | null = null;
    if (!reduce) {
      const l = new Lenis({ lerp: 0.085 });
      lenis.current = l;
      l.on("scroll", ScrollTrigger.update);
      tick = (time: number) => l.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    }

    const trigger = ScrollTrigger.create({
      trigger: track.current,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        const t = self.progress * (CHAPTER_COUNT - 1);
        scrollState.t = t;
        const near = Math.round(t);
        setNearest(near);
        setActive(Math.abs(t - near) < TEXT_WINDOW ? near : -1);
        if (bar.current) bar.current.style.transform = `scaleX(${self.progress})`;
      },
    });

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onPointer);
      trigger.kill();
      if (tick) gsap.ticker.remove(tick);
      lenis.current?.destroy();
      lenis.current = null;
    };
  }, []);

  const goTo = useCallback((index: number) => {
    const el = track.current;
    if (!el) return;
    const top = el.offsetTop + ((el.offsetHeight - window.innerHeight) * index) / (CHAPTER_COUNT - 1);
    if (lenis.current) lenis.current.scrollTo(top, { duration: 1.6 });
    else window.scrollTo({ top });
  }, []);

  const onReady = useCallback(() => setReady(true), []);

  return (
    <main>
      <div
        className={`fixed top-0 left-0 h-lvh w-full transition-opacity duration-[1400ms] ease-out ${
          ready ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden="true"
      >
        <Scene reducedMotion={reducedMotion} onReady={onReady} />
      </div>

      {/* Keeps the text readable over the scene. */}
      <div
        className={`pointer-events-none fixed inset-x-0 bottom-0 z-10 h-[55vh] bg-gradient-to-t from-night/85 to-transparent transition-opacity duration-500 ${
          active > 0 ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden="true"
      />

      <header
        className={`fixed top-0 left-0 z-20 px-5 py-5 transition-opacity duration-300 ease-out md:px-10 md:py-8 ${
          nearest === 0 ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <button
          type="button"
          onClick={() => goTo(0)}
          tabIndex={nearest === 0 ? -1 : 0}
          className="flex min-h-11 items-center gap-3 text-sand transition-opacity duration-200 hover:opacity-80 active:opacity-60"
          aria-label="SURA Dubai, back to the start"
        >
          <Mark className="h-9 w-9" />
          <span className="flex items-baseline gap-2">
            <span className="text-sm font-bold tracking-[0.3em]">SURA</span>
            <span className="text-xs font-medium tracking-[0.35em] text-gold">DUBAI</span>
          </span>
        </button>
      </header>

      <div className="fixed inset-x-0 top-0 z-20 h-0.5 md:hidden" aria-hidden="true">
        <div ref={bar} className="h-full origin-left scale-x-0 bg-gold" />
      </div>

      <nav
        aria-label="Chapters"
        className="fixed top-1/2 right-8 z-20 hidden -translate-y-1/2 md:block"
      >
        <ol className="flex flex-col items-end">
          {NAV.map((label, i) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-current={nearest === i ? "step" : undefined}
                className="group flex h-9 items-center justify-end gap-3 text-sm"
              >
                <span
                  className={`transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-visible:opacity-100 ${
                    nearest === i ? "text-sand opacity-100" : "text-mist opacity-0"
                  }`}
                >
                  {label}
                </span>
                <span
                  className={`block h-px transition-all duration-200 ease-out ${
                    nearest === i ? "w-10 bg-gold" : "w-5 bg-mist/60 group-hover:w-7 group-hover:bg-sand"
                  }`}
                />
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="pointer-events-none fixed inset-0 z-10">
        <section
          data-active={active === 0}
          className="chapter absolute inset-0 flex flex-col items-center justify-center px-5 text-center"
        >
          <h1 data-line className="text-[clamp(4.25rem,12vw,8.25rem)]">
            <Lockup animated />
          </h1>
          <div data-line style={{ ["--i" as string]: 1 }} className="mt-8 md:mt-12">
            <p
              lang="ar"
              dir="rtl"
              className="intro font-kufi text-[clamp(1.125rem,2.4vw,1.75rem)] font-semibold"
              style={{ ["--d" as string]: 1200 }}
            >
              {hero.taglineAr}
            </p>
            <p className="intro eyebrow mt-3 text-mist" style={{ ["--d" as string]: 1400 }}>
              {hero.descriptor}
            </p>
          </div>
          <div
            data-line
            style={{ ["--i" as string]: 2 }}
            className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3"
          >
            <span className="intro eyebrow text-mist" style={{ ["--d" as string]: 1900 }}>
              Scroll
            </span>
            <span className="scroll-cue relative block h-10 w-px overflow-hidden bg-mist/30" />
          </div>
        </section>

        {chapters.map((c, i) => (
          <section
            key={c.nav}
            data-active={active === i + 1}
            aria-hidden={active !== i + 1}
            className="chapter absolute bottom-[9vh] left-5 right-5 md:bottom-[12vh] md:left-[6vw] md:right-auto md:max-w-[36rem]"
          >
            <p data-line className="eyebrow text-cyan">
              {c.eyebrow}
            </p>
            <h2
              data-line
              style={{ ["--i" as string]: 1 }}
              className="mt-4 text-[clamp(1.75rem,3.4vw,3.25rem)] leading-[1.08] font-medium tracking-[-0.01em] text-balance"
            >
              {c.title}
            </h2>
            {c.body && (
              <p data-line style={{ ["--i" as string]: 2 }} className="mt-4 max-w-[32rem] text-[1.0625rem] leading-relaxed text-mist">
                {c.body}
              </p>
            )}
            {c.meta && (
              <p data-line style={{ ["--i" as string]: 3 }} className="mt-6 text-sm tracking-[0.06em] text-cyan">
                {c.meta}
              </p>
            )}
          </section>
        ))}
      </div>

      <div ref={track} style={{ height: `${(CHAPTER_COUNT - 1) * 150 + 100}vh` }} />

      <section className="relative z-30 flex min-h-svh flex-col justify-between gap-16 rounded-t-3xl bg-sand px-5 pt-16 pb-8 text-night md:px-[6vw] md:pt-24 md:pb-10">
        <div className="text-[clamp(2.75rem,6vw,4.5rem)]">
          <Lockup tone="light" />
        </div>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-end lg:gap-16">
          <p className="order-2 max-w-[30rem] text-[1.0625rem] leading-relaxed text-ink-soft lg:order-1 lg:text-xl">
            {closing.verseEn}
          </p>
          <p
            lang="ar"
            dir="rtl"
            className="order-1 font-kufi text-[clamp(2rem,4.6vw,4rem)] leading-[1.35] font-extrabold lg:order-2"
          >
            {closing.verseAr.map((line, i) => (
              <span key={line} className={`block ${i < closing.verseAr.length - 1 ? "text-night/45" : ""}`}>
                {line}
              </span>
            ))}
          </p>
        </div>
        <footer className="flex flex-col gap-4 border-t border-night/15 pt-6 text-sm text-ink-soft md:flex-row md:items-center md:justify-between">
          <p>{closing.descriptor}</p>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 items-center underline decoration-night/30 underline-offset-4 transition-colors duration-200 hover:text-night hover:decoration-night"
            >
              Building data © OpenStreetMap contributors
            </a>
            <button
              type="button"
              onClick={() => goTo(0)}
              className="flex min-h-11 items-center font-medium text-night underline decoration-night/30 underline-offset-4 transition-colors duration-200 hover:decoration-night active:opacity-70"
            >
              Back to the start
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}
