"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  ask,
  businessModel,
  competition,
  type EntityId,
  entities,
  financials,
  goToMarket,
  hook,
  intro,
  market,
  type Mission,
  missions,
  problem,
  product,
  SHOW_PLACEHOLDER_TAGS,
  solution,
  sources,
  team,
  traction,
} from "@/content/pitch";
import type { PlannedRoute } from "@/lib/pitch";
import { Lockup, Mark } from "../Logo";

/* ---------- Shared pieces ---------- */

export function Slide({ active, className = "", children }: { active: boolean; className?: string; children: ReactNode }) {
  return (
    <section
      data-active={active}
      aria-hidden={!active}
      inert={!active}
      className={`chapter absolute inset-0 transition-opacity duration-500 ${active ? "z-20 opacity-100" : "pointer-events-none z-10 opacity-0"} ${className}`}
    >
      {children}
    </section>
  );
}

export function Line({ i = 0, className = "", children }: { i?: number; className?: string; children: ReactNode }) {
  return (
    <div data-line style={{ ["--i" as string]: i }} className={className}>
      {children}
    </div>
  );
}

export function Eyebrow({ n, children, tone = "text-cyan-deep" }: { n: number; children: ReactNode; tone?: string }) {
  return (
    <p className={`eyebrow flex items-center gap-3 ${tone}`}>
      <span className="tabular-nums">{String(n).padStart(2, "0")}</span>
      <span className="h-px w-8 bg-current opacity-50" />
      {children}
    </p>
  );
}

function Placeholder({ show = true }: { show?: boolean }) {
  if (!SHOW_PLACEHOLDER_TAGS || !show) return null;
  return (
    <span className="ml-3 inline-flex items-center rounded-full border border-dashed border-gold-deep/60 px-2.5 py-0.5 align-middle text-[0.6875rem] font-medium tracking-[0.12em] text-gold-deep uppercase">
      Placeholder
    </span>
  );
}

function Sup({ src }: { src: number[] }) {
  if (!src.length) return null;
  return <sup className="ml-0.5 text-[0.6em] font-medium text-cyan-deep">[{src.join(",")}]</sup>;
}

const titleClass = "mt-4 text-[clamp(1.75rem,3.3vw,3.1rem)] leading-[1.08] font-medium tracking-[-0.015em] text-balance";

/** Left column over the 3D scene. */
function LeftPanel({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div
      data-scroll
      className={`absolute inset-y-0 left-0 flex w-full flex-col overflow-y-auto px-5 pt-24 pb-24 md:px-[5vw] ${
        wide ? "md:w-[54vw]" : "md:w-[48vw]"
      }`}
    >
      <div className="my-auto">{children}</div>
    </div>
  );
}

/** Full-width content over the washed-out scene. */
export function FullPanel({ children }: { children: ReactNode }) {
  return (
    <div data-scroll className="absolute inset-0 flex flex-col overflow-y-auto px-5 pt-24 pb-24 md:px-[6vw]">
      <div className="mx-auto my-auto w-full max-w-6xl">{children}</div>
    </div>
  );
}

function useCountUp(value: number, active: boolean, decimals = 0) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!active) {
      setShown(0);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now() + 250;
    const step = (now: number) => {
      const f = Math.min(1, Math.max(0, (now - t0) / 1400));
      setShown(value * (1 - Math.pow(1 - f, 3)));
      if (f < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, active]);
  return shown.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function Counter({ value, active, decimals = 0, prefix = "", suffix = "" }: { value: number; active: boolean; decimals?: number; prefix?: string; suffix?: string }) {
  const n = useCountUp(value, active, decimals);
  return (
    <span className="tabular-nums">
      {prefix}
      {n}
      {suffix}
    </span>
  );
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/* ---------- 00 Hook ---------- */

export function HookSlide({ active, onDone }: { active: boolean; onDone: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState<boolean | null>(null);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [line, setLine] = useState(0);

  useEffect(() => {
    let live = true;
    fetch(`${basePath}${hook.video}`, { method: "HEAD" })
      .then((r) => live && setHasVideo(r.ok))
      .catch(() => live && setHasVideo(false));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (active) return;
    video.current?.pause();
    setPlaying(false);
  }, [active]);

  const play = () => {
    const v = video.current;
    if (!v) return;
    v.currentTime = 0;
    v.muted = false;
    setMuted(false);
    setPlaying(true);
    v.play().catch(() => {
      v.muted = true;
      setMuted(true);
      v.play().catch(() => setPlaying(false));
    });
  };

  useEffect(() => {
    if (!active || hasVideo !== false) return;
    setLine(0);
    const id = window.setInterval(() => setLine((l) => Math.min(l + 1, hook.lines.length)), 2600);
    return () => window.clearInterval(id);
  }, [active, hasVideo]);

  const finished = hasVideo === false && line >= hook.lines.length;

  return (
    <Slide active={active} className="bg-transparent">
      {hasVideo !== false && (
        <video
          ref={video}
          src={`${basePath}${hook.video}`}
          poster={hook.poster ? `${basePath}${hook.poster}` : undefined}
          muted={muted}
          playsInline
          preload="auto"
          onError={() => setHasVideo(false)}
          onEnded={onDone}
          className={`absolute inset-0 h-full w-full bg-night object-cover transition-opacity duration-700 ${
            hasVideo ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      {hasVideo && (
        <div
          className={`absolute inset-0 grid place-items-center bg-night/35 transition-opacity duration-500 ${
            playing ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <button
            type="button"
            onClick={play}
            tabIndex={playing || !active ? -1 : 0}
            className="flex min-h-14 items-center gap-4 rounded-full bg-sand py-2 pr-8 pl-2 text-lg font-medium text-night shadow-[0_20px_50px_-20px_rgb(0_0_0/0.6)] transition-transform duration-200 hover:scale-[1.03]"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-night text-sand">
              <svg viewBox="0 0 16 16" className="ml-0.5 h-4 w-4" aria-hidden="true">
                <path d="M4 2.5v11l9-5.5z" fill="currentColor" />
              </svg>
            </span>
            Play intro
          </button>
        </div>
      )}

      {hasVideo === false && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <div className="pitch-hook-glow" aria-hidden="true" />
          <div className="relative h-[9rem] w-full max-w-4xl md:h-[11rem]">
            {hook.lines.map((l, i) => (
              <p
                key={l}
                className={`absolute inset-0 flex items-center justify-center text-[clamp(2rem,5.4vw,4.75rem)] leading-[1.05] font-medium tracking-[-0.02em] text-balance transition-all duration-700 ${
                  line === i ? "translate-y-0 opacity-100" : line > i ? "-translate-y-6 opacity-0" : "translate-y-6 opacity-0"
                } ${i === hook.lines.length - 1 ? "text-night" : "text-night/85"}`}
              >
                {l}
              </p>
            ))}
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center gap-6 transition-all duration-700 ${
                finished ? "opacity-100" : "pointer-events-none translate-y-6 opacity-0"
              }`}
            >
              <div className="text-[clamp(3.5rem,8vw,6rem)]">
                <Lockup tone="light" />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onDone}
            className={`relative mt-10 flex min-h-12 items-center gap-3 rounded-full bg-night px-7 text-sand transition-all duration-500 hover:bg-deep ${
              finished ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            tabIndex={finished ? 0 : -1}
          >
            Start the pitch
            <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
              <path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </button>
        </div>
      )}

      <div className={`absolute right-5 bottom-5 z-10 flex items-center gap-2 transition-opacity duration-500 md:right-10 md:bottom-8 ${active ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        {hasVideo && playing && (
          <button type="button" onClick={() => setMuted((m) => !m)} className="pitch-chip">
            {muted ? "Sound on" : "Sound off"}
          </button>
        )}
        <button type="button" onClick={onDone} className="pitch-chip">
          Skip intro
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </button>
      </div>
    </Slide>
  );
}

/* ---------- 01 Introduction ---------- */

export function IntroSlide({ active }: { active: boolean }) {
  return (
    <Slide active={active}>
      <LeftPanel>
        <Line>
          <Eyebrow n={1}>Introduction</Eyebrow>
        </Line>
        <Line i={1} className="mt-8 text-[clamp(3.5rem,7vw,6.25rem)]">
          <h1>
            <Lockup tone="light" />
          </h1>
        </Line>
        <Line i={2} className="mt-8">
          <p lang="ar" dir="rtl" className="text-right font-kufi text-[clamp(1.25rem,2.2vw,1.875rem)] font-semibold md:text-left">
            {intro.taglineAr}
          </p>
          <p className="mt-2 text-[clamp(1.125rem,1.6vw,1.375rem)] text-ink-soft">{intro.tagline}</p>
          <p className="eyebrow mt-4 text-gold-deep">{intro.descriptor}</p>
        </Line>
      </LeftPanel>
    </Slide>
  );
}

/* ---------- 02 Problem ---------- */

export function ProblemSlide({ active }: { active: boolean }) {
  return (
    <Slide active={active}>
      <LeftPanel>
        <Line>
          <Eyebrow n={2} tone="text-alert">
            Problem
          </Eyebrow>
        </Line>
        <Line i={1}>
          <h2 className={titleClass}>{problem.title}</h2>
        </Line>
        <Line i={2}>
          <p className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-ink-soft">{problem.body}</p>
        </Line>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {problem.points.map((p, i) => (
            <Line key={p.k} i={3 + i} className="pitch-card p-4">
              <p className="flex items-center gap-2.5 font-medium">
                <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-alert/12 text-xs text-alert tabular-nums">
                  {i + 1}
                </span>
                {p.k}
              </p>
              <p className="mt-2 text-[0.9375rem] leading-snug text-ink-soft">{p.v}</p>
            </Line>
          ))}
        </div>
        <Line i={7} className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-alert" /> Drones in conflict
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full border border-alert" /> Zones with unclear rules
          </span>
        </Line>
      </LeftPanel>
    </Slide>
  );
}

/* ---------- 03 Solution ---------- */

const entityById = Object.fromEntries(entities.map((e) => [e.id, e])) as Record<EntityId, (typeof entities)[number]>;

export function SolutionSlide({
  active,
  mission,
  onMission,
  enabled,
  onToggle,
  route,
}: {
  active: boolean;
  mission: Mission;
  onMission: (m: Mission) => void;
  enabled: Set<EntityId>;
  onToggle: (id: EntityId) => void;
  route: PlannedRoute | null;
}) {
  const found = !!route?.curve;
  const collisions = route?.collisions ?? 0;
  const status = !found
    ? { text: "No legal path. An exemption is needed.", tone: "text-alert", dot: "bg-alert" }
    : collisions > 0
      ? { text: `The path crosses ${collisions} tower cell${collisions > 1 ? "s" : ""}.`, tone: "text-alert", dot: "bg-alert" }
      : { text: "Legal path found", tone: "text-ok", dot: "bg-ok" };
  const priority = mission.priority
    ? enabled.has("civil")
      ? "Priority on: every other drone holds."
      : "No priority: Civil Defence rules are off."
    : "Normal traffic: shares the sky in its layer.";

  return (
    <Slide active={active}>
      <div data-scroll className="absolute inset-0 flex flex-col gap-5 overflow-y-auto px-5 pt-24 pb-24 md:px-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-[36rem]">
            <Line>
              <Eyebrow n={3}>Solution</Eyebrow>
            </Line>
            <Line i={1}>
              <h2 className="mt-3 text-[clamp(1.5rem,2.6vw,2.4rem)] leading-[1.1] font-medium tracking-[-0.015em] text-balance">
                {solution.title}
              </h2>
            </Line>
            <Line i={2}>
              <p className="mt-3 text-[0.9875rem] leading-relaxed text-ink-soft">{solution.body}</p>
            </Line>
            <Line i={3}>
              <ol className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2 text-[0.8125rem]">
                {solution.steps.map((s, i) => (
                  <li key={s} className="flex items-center gap-2">
                    <span className="rounded-full bg-white/80 px-3 py-1.5 shadow-[0_0_0_1px_rgb(11_27_51/0.1)]">{s}</span>
                    {i < solution.steps.length - 1 && <span className="text-gold-deep">→</span>}
                  </li>
                ))}
              </ol>
            </Line>
          </div>

          <Line i={4} className="pitch-card w-full p-5 lg:w-[22rem] lg:flex-none">
            <p className="text-xs tracking-[0.16em] text-ink-soft uppercase">Planned route</p>
            <p className="mt-1 flex items-center gap-2 text-lg font-medium">
              <span className="h-3 w-3 rounded-full" style={{ background: mission.color }} />
              {mission.name}
            </p>
            <p className={`mt-3 flex items-center gap-2 text-[0.9375rem] font-medium ${status.tone}`} role="status">
              <span className={`h-2 w-2 rounded-full ${status.dot}`} />
              {status.text}
            </p>
            {!enabled.has("twin") && collisions > 0 && (
              <p className="mt-1 text-sm text-ink-soft">Without the Digital Twin, SURA cannot see the towers.</p>
            )}
            {found && (
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  ["Length", `${route!.lengthKm.toFixed(1)} km`],
                  ["Sky cells", String(route!.cells)],
                  ["Zones avoided", String(route!.avoided)],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-sand/70 px-2 py-2">
                    <dd className="text-lg font-medium tabular-nums">{v}</dd>
                    <dt className="text-[0.6875rem] text-ink-soft">{k}</dt>
                  </div>
                ))}
              </dl>
            )}
            <p className="mt-4 text-sm text-ink-soft">{priority}</p>
            <ul className="mt-4 space-y-2 border-t border-night/10 pt-4">
              {mission.rules.map((r) => {
                const e = entityById[r.by];
                const on = enabled.has(r.by);
                return (
                  <li key={r.text} className={`flex gap-2.5 text-[0.875rem] leading-snug transition-opacity ${on ? "" : "line-through opacity-40"}`}>
                    <span className="mt-1.5 h-2 w-2 flex-none rounded-full" style={{ background: e.color }} />
                    <span>
                      <span className="font-medium">{e.short}:</span> {r.text}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[0.6875rem] text-mist-deep">Rules are illustrative.</p>
          </Line>
        </div>

        <Line i={5} className="mt-auto flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="pitch-card p-3">
            <p className="px-1 pb-2 text-xs tracking-[0.16em] text-ink-soft uppercase">Mission</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Mission">
              {missions.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={mission.id === m.id}
                  onClick={() => onMission(m)}
                  className={`flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors ${
                    mission.id === m.id ? "bg-night text-sand" : "bg-white text-night hover:bg-sand"
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
                  {m.name}
                </button>
              ))}
            </div>
          </div>
          <div className="pitch-card p-3">
            <p className="px-1 pb-2 text-xs tracking-[0.16em] text-ink-soft uppercase">Data and rules from</p>
            <div className="flex flex-wrap gap-2">
              {entities.map((e) => {
                const on = enabled.has(e.id);
                return (
                  <button
                    key={e.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onToggle(e.id)}
                    title={e.gives}
                    className={`flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-sm transition-colors ${
                      on ? "border-transparent bg-white text-night" : "border-night/15 bg-transparent text-ink-soft line-through"
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full border"
                      style={{ background: on ? e.color : "transparent", borderColor: e.color }}
                    />
                    {e.short}
                  </button>
                );
              })}
            </div>
          </div>
        </Line>
      </div>
    </Slide>
  );
}

/* ---------- 04 Product ---------- */

const productIcons = [
  // Sky OS: hex grid
  <path key="os" d="M12 3 19 7v8l-7 4-7-4V7z M12 3v16 M5 7l14 8 M19 7 5 15" />,
  // SURA Link: chip
  <path key="link" d="M7 7h10v10H7z M10 3v4 M14 3v4 M10 17v4 M14 17v4 M3 10h4 M3 14h4 M17 10h4 M17 14h4" />,
  // App: phone
  <path key="app" d="M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M11 18h2" />,
  // API: brackets
  <path key="api" d="M8 6 3 12l5 6 M16 6l5 6-5 6 M14 4l-4 16" />,
];

export function ProductSlide({ active }: { active: boolean }) {
  return (
    <Slide active={active}>
      <LeftPanel wide>
        <Line>
          <Eyebrow n={4}>Product</Eyebrow>
        </Line>
        <Line i={1}>
          <h2 className={titleClass}>
            {product.title}
            <Placeholder show={product.placeholder} />
          </h2>
        </Line>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {product.items.map((p, i) => (
            <Line key={p.name} i={2 + i} className="pitch-card flex flex-col p-5">
              <div className="flex items-center justify-between">
                <svg viewBox="0 0 24 24" className="h-7 w-7 text-cyan-deep" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
                  {productIcons[i]}
                </svg>
                <span className="rounded-full bg-sand px-2.5 py-1 text-[0.6875rem] tracking-[0.12em] text-ink-soft uppercase">{p.who}</span>
              </div>
              <p className="mt-4 text-lg font-medium">{p.name}</p>
              <p className="mt-1.5 flex-1 text-[0.9375rem] leading-snug text-ink-soft">{p.text}</p>
              <p className="mt-4 text-sm font-medium text-gold-deep">{p.stat}</p>
            </Line>
          ))}
        </div>
      </LeftPanel>
    </Slide>
  );
}

/* ---------- 05 Market ---------- */

function UaeBars({ active }: { active: boolean }) {
  const u = market.uae;
  const max = Math.max(...u.bars.map((b) => b.value));
  return (
    <div className="grid h-full gap-4 sm:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <p className="text-sm font-medium">{u.title}</p>
        <div className="mt-3 flex h-36 items-end gap-3 md:gap-6">
          {u.bars.map((b, i) => (
            <div key={b.year} className="flex h-full flex-1 flex-col justify-end">
              <p className="text-[clamp(1rem,1.6vw,1.375rem)] font-medium">
                <Counter value={b.value} active={active} decimals={1} prefix="$" suffix="M" />
              </p>
              <div
                className={`mt-1 rounded-t-md ${i === u.bars.length - 1 ? "bg-gold" : "bg-cyan"}`}
                style={{
                  height: active ? `${Math.max(4, (b.value / max) * 70)}%` : "0%",
                  transition: `height 1.1s cubic-bezier(.2,.7,.2,1) ${400 + i * 250}ms`,
                }}
              />
              <p className="mt-2 text-[0.8125rem]">
                <span className="font-medium">{b.year}</span> <span className="text-ink-soft">{b.kind}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl bg-night px-4 py-4 text-center text-sand">
        <p className="text-[clamp(1.5rem,2.4vw,2.25rem)] leading-none font-medium">
          <Counter value={u.cagr} active={active} decimals={1} suffix="%" />
        </p>
        <p className="mt-1 text-[0.75rem] text-sand/70">Forecast CAGR</p>
      </div>
    </div>
  );
}

function ShareRing({ value, active }: { value: number; active: boolean }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-28 w-28 flex-none">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgb(11 27 51 / 0.08)" strokeWidth="11" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#D4A54A"
          strokeWidth="11"
          strokeDasharray={c}
          strokeDashoffset={active ? c * (1 - value / 100) : c}
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(.2,.7,.2,1) 600ms" }}
        />
      </svg>
      <p className="absolute inset-0 grid place-items-center text-2xl font-medium">
        <Counter value={value} active={active} suffix="%" />
      </p>
    </div>
  );
}

export function MarketSlide({ active }: { active: boolean }) {
  return (
    <Slide active={active}>
      <FullPanel>
        <Line>
          <Eyebrow n={5}>Market opportunity</Eyebrow>
        </Line>
        <Line i={1}>
          <h2 className={titleClass}>{market.title}</h2>
        </Line>
        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {market.stats.map((s, i) => (
            <Line key={s.label} i={2 + i} className="pitch-card p-5">
              <p className="text-[clamp(2.25rem,4.2vw,3.5rem)] leading-none font-medium tracking-[-0.03em]">
                <Counter value={s.value} active={active} decimals={s.decimals} prefix={s.prefix} suffix={s.suffix} />
              </p>
              <p className="mt-3 text-[0.9375rem] text-ink-soft">
                {s.label}
                <Sup src={s.src} />
              </p>
            </Line>
          ))}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-[2fr_1fr]">
          <Line i={5} className="pitch-card p-5">
            <UaeBars active={active} />
          </Line>
          <Line i={6} className="pitch-card flex items-center gap-5 p-5">
            <ShareRing value={market.uae.dubaiShare} active={active} />
            <p className="text-[0.9375rem] text-ink-soft">{market.uae.shareLabel}</p>
          </Line>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {market.notes.map((n, i) => (
            <Line key={n.text} i={7 + i} className="flex items-start gap-3 rounded-2xl bg-night p-4 text-sand">
              <Mark className="mt-0.5 h-5 w-5 flex-none" hole="#0B1B33" />
              <p className="text-[0.9375rem]">
                {n.text}
                <Sup src={n.src} />
              </p>
            </Line>
          ))}
        </div>
        <Line i={10}>
          <ol className="mt-6 space-y-1 text-xs text-ink-soft">
            {sources.map((s) => (
              <li key={s.id}>
                [{s.id}] {s.text}
              </li>
            ))}
          </ol>
        </Line>
      </FullPanel>
    </Slide>
  );
}

/* ---------- 06 Business model ---------- */

export function BusinessSlide({ active }: { active: boolean }) {
  return (
    <Slide active={active}>
      <FullPanel>
        <Line>
          <Eyebrow n={6}>Business model</Eyebrow>
        </Line>
        <Line i={1}>
          <h2 className={titleClass}>{businessModel.title}</h2>
        </Line>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {businessModel.streams.map((s, i) => (
            <Line key={s.name} i={2 + i} className="pitch-card flex flex-col p-5">
              <span className="text-sm text-gold-deep tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-3 text-lg leading-tight font-medium">{s.name}</p>
              <p className="mt-2 flex-1 text-[0.9375rem] leading-snug text-ink-soft">{s.text}</p>
              <div className="mt-5">
                <div className="flex justify-between text-xs text-ink-soft">
                  <span>Share of revenue</span>
                  <span className="tabular-nums">{s.share}%</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-night/10">
                  <div
                    className="h-full origin-left rounded-full bg-night transition-transform delay-500 duration-1000 ease-out"
                    style={{ width: `${s.share * 2.5}%`, transform: active ? "scaleX(1)" : "scaleX(0)" }}
                  />
                </div>
              </div>
            </Line>
          ))}
        </div>
        <Line i={8} className="mt-5 text-sm text-ink-soft">
          Revenue split is an estimate.
          <Placeholder show={businessModel.placeholder} />
        </Line>
      </FullPanel>
    </Slide>
  );
}

/* ---------- 07 Traction ---------- */

export function TractionSlide({ active }: { active: boolean }) {
  return (
    <Slide active={active}>
      <FullPanel>
        <Line>
          <Eyebrow n={7}>Traction</Eyebrow>
        </Line>
        <Line i={1}>
          <h2 className={titleClass}>
            {traction.title}
            <Placeholder show={traction.placeholder} />
          </h2>
        </Line>
        <div className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {traction.stats.map((s, i) => (
            <Line key={s.label} i={2 + i} className="pitch-card p-5">
              <p className="text-[clamp(2.25rem,4.4vw,3.75rem)] leading-none font-medium tracking-[-0.03em]">
                <Counter value={s.value} active={active} />
              </p>
              <p className="mt-3 text-[0.9375rem] text-ink-soft">{s.label}</p>
            </Line>
          ))}
        </div>
        <Line i={6}>
          <ol className="relative mt-10 grid gap-6 md:grid-cols-3">
            <span className="absolute top-[0.6rem] right-0 left-0 hidden border-t-2 border-dotted border-night/25 md:block" aria-hidden="true" />
            {traction.milestones.map((m) => (
              <li key={m.text} className="relative">
                <span className="relative block h-5 w-5 rounded-full border-4 border-sand bg-gold" />
                <p className="mt-3 text-sm font-medium text-gold-deep">{m.when}</p>
                <p className="mt-1 text-[1.0625rem]">{m.text}</p>
              </li>
            ))}
          </ol>
        </Line>
      </FullPanel>
    </Slide>
  );
}

/* ---------- 08 Go-to-market ---------- */

export function GoToMarketSlide({ active }: { active: boolean }) {
  return (
    <Slide active={active}>
      <FullPanel>
        <Line>
          <Eyebrow n={8}>Go-to-market strategy</Eyebrow>
        </Line>
        <Line i={1}>
          <h2 className={titleClass}>{goToMarket.title}</h2>
        </Line>
        <ol className="relative mt-12 grid gap-6 md:grid-cols-5 md:gap-4">
          <svg className="pointer-events-none absolute top-0 left-0 hidden h-8 w-full md:block" preserveAspectRatio="none" viewBox="0 0 100 10" aria-hidden="true">
            <path
              d="M2 8 C 30 8, 60 6, 98 2"
              fill="none"
              stroke="#0B1B33"
              strokeOpacity="0.35"
              strokeWidth="0.6"
              strokeDasharray="0.4 2"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              style={{ strokeWidth: 3 }}
            />
          </svg>
          {goToMarket.steps.map((s, i) => (
            <Line key={s.name} i={2 + i}>
              <li className="relative">
                <div className="flex h-8 items-center">
                  {i === goToMarket.steps.length - 1 ? (
                    <Mark className="h-9 w-9" color="#B88324" hole="#F3EDE2" />
                  ) : (
                    <span className="block h-4 w-4 rounded-full border-[3px] border-sand bg-night" />
                  )}
                </div>
                <div className="pitch-card mt-4 p-5">
                  <p className="text-sm font-medium text-gold-deep">{s.when}</p>
                  <p className="mt-2 text-lg leading-tight font-medium">{s.name}</p>
                  <p className="mt-2 text-[0.9375rem] leading-snug text-ink-soft">{s.text}</p>
                </div>
              </li>
            </Line>
          ))}
        </ol>
      </FullPanel>
    </Slide>
  );
}

/* ---------- 09 Competition ---------- */

export function CompetitionSlide({ active }: { active: boolean }) {
  return (
    <Slide active={active}>
      <FullPanel>
        <Line>
          <Eyebrow n={9}>Competition</Eyebrow>
        </Line>
        <Line i={1}>
          <h2 className={titleClass}>{competition.title}</h2>
        </Line>
        <Line i={2} className="mt-10 grid grid-cols-2 gap-3">
          <div className="pitch-card overflow-hidden">
            <p className="border-b border-night/10 px-5 py-4 text-sm tracking-[0.16em] text-ink-soft uppercase">Others</p>
            <ul>
              {competition.rows.map(([o]) => (
                <li key={o} className="flex min-h-14 items-center gap-3 border-b border-night/5 px-5 py-3 text-ink-soft last:border-0">
                  <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-night/6 text-xs" aria-hidden="true">
                    ✕
                  </span>
                  {o}
                </li>
              ))}
            </ul>
          </div>
          <div className="overflow-hidden rounded-2xl bg-night text-sand shadow-[0_20px_60px_-30px_rgb(11_27_51/0.6)]">
            <p className="flex items-center gap-2 border-b border-sand/10 px-5 py-4 text-sm font-bold tracking-[0.2em] uppercase">
              <Mark className="h-5 w-5" hole="#0B1B33" /> SURA
            </p>
            <ul>
              {competition.rows.map(([, s], i) => (
                <li
                  key={s}
                  className="flex min-h-14 items-center gap-3 border-b border-sand/8 px-5 py-3 font-medium transition-all duration-500 last:border-0"
                  style={{ transitionDelay: `${400 + i * 90}ms`, opacity: active ? 1 : 0, transform: active ? "none" : "translateX(12px)" }}
                >
                  <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-gold text-xs text-night" aria-hidden="true">
                    ✓
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </Line>
      </FullPanel>
    </Slide>
  );
}

/* ---------- 10 Financials ---------- */

export function FinancialsSlide({ active }: { active: boolean }) {
  const max = Math.ceil(Math.max(...financials.years.map((y) => Math.max(y.revenue, y.cost))) / 5) * 5;
  const W = 640;
  const H = 300;
  const pad = { l: 36, r: 10, t: 16, b: 30 };
  const bw = (W - pad.l - pad.r) / financials.years.length;
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const costPath = financials.years.map((d, i) => `${i ? "L" : "M"}${pad.l + bw * (i + 0.5)} ${y(d.cost)}`).join(" ");
  return (
    <Slide active={active}>
      <FullPanel>
        <Line>
          <Eyebrow n={10}>Financials</Eyebrow>
        </Line>
        <Line i={1}>
          <h2 className={titleClass}>
            {financials.title}
            <Placeholder show={financials.placeholder} />
          </h2>
        </Line>
        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_18rem]">
          <Line i={2} className="pitch-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-soft">
              <span>{financials.unit}</span>
              <span className="flex items-center gap-4">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-night" /> Revenue
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-0.5 w-4 bg-gold-deep" /> Costs
                </span>
              </span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label="Revenue and costs per year">
              {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                <g key={f}>
                  <line x1={pad.l} x2={W - pad.r} y1={y(max * f)} y2={y(max * f)} stroke="#0B1B33" strokeOpacity="0.08" />
                  <text x={pad.l - 8} y={y(max * f) + 4} textAnchor="end" className="fill-ink-soft text-[11px]">
                    {max * f}
                  </text>
                </g>
              ))}
              {financials.years.map((d, i) => {
                const x = pad.l + bw * i + bw * 0.22;
                const h = H - pad.b - y(d.revenue);
                return (
                  <g key={d.year}>
                    <rect
                      x={x}
                      y={y(d.revenue)}
                      width={bw * 0.56}
                      height={h}
                      rx="4"
                      className="fill-night"
                      style={{
                        transformBox: "fill-box",
                        transformOrigin: "bottom",
                        transform: active ? "scaleY(1)" : "scaleY(0)",
                        transition: `transform 900ms cubic-bezier(0.2,0.7,0.2,1) ${300 + i * 120}ms`,
                      }}
                    />
                    <text x={x + bw * 0.28} y={y(d.revenue) - 7} textAnchor="middle" className="fill-night text-[12px] font-medium">
                      {d.revenue}
                    </text>
                    <text x={x + bw * 0.28} y={H - 8} textAnchor="middle" className="fill-ink-soft text-[12px]">
                      {d.year}
                    </text>
                  </g>
                );
              })}
              <path
                d={costPath}
                fill="none"
                stroke="#A87B22"
                strokeWidth="2.5"
                strokeDasharray="6 5"
                style={{ opacity: active ? 1 : 0, transition: "opacity 600ms ease-out 1200ms" }}
              />
            </svg>
          </Line>
          <div className="grid gap-3">
            {financials.kpis.map((k, i) => (
              <Line key={k.label} i={3 + i} className="pitch-card p-5">
                <p className="text-[2rem] leading-none font-medium tracking-[-0.02em]">{k.value}</p>
                <p className="mt-2 text-sm text-ink-soft">{k.label}</p>
              </Line>
            ))}
          </div>
        </div>
      </FullPanel>
    </Slide>
  );
}

/* ---------- 11 Team ---------- */

export function TeamSlide({ active }: { active: boolean }) {
  return (
    <Slide active={active}>
      <FullPanel>
        <Line>
          <Eyebrow n={11}>Team</Eyebrow>
        </Line>
        <Line i={1}>
          <h2 className={titleClass}>{team.title}</h2>
        </Line>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {team.members.map((m, i) => (
            <Line key={m.name} i={2 + i} className="pitch-card p-5">
              <div className="grid aspect-square w-16 place-items-center rounded-full bg-gradient-to-br from-deep to-night text-xl font-medium text-sand">
                {m.initials}
              </div>
              <p className="mt-5 text-lg leading-tight font-medium">{m.name}</p>
              <p lang="ar" dir="rtl" className="mt-1 text-right font-kufi text-[0.9375rem] text-ink-soft">
                {m.nameAr}
              </p>
            </Line>
          ))}
        </div>
      </FullPanel>
    </Slide>
  );
}

/* ---------- 12 The ask and closing ---------- */

function Donut({ active }: { active: boolean }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <svg viewBox="0 0 140 140" className="h-36 w-36 flex-none -rotate-90" aria-hidden="true">
      {ask.use.map((u, i) => {
        const len = (u.share / 100) * C;
        const off = acc;
        acc += len;
        return (
          <circle
            key={u.name}
            cx="70"
            cy="70"
            r={R}
            fill="none"
            stroke={u.color}
            strokeWidth="18"
            strokeDasharray={`${active ? len - 2 : 0} ${C}`}
            strokeDashoffset={-off}
            style={{ transition: `stroke-dasharray 800ms ease-out ${400 + i * 150}ms` }}
          />
        );
      })}
    </svg>
  );
}

export function AskSlide({ active, onRestart }: { active: boolean; onRestart: () => void }) {
  const c = intro.contact;
  return (
    <Slide active={active}>
      <FullPanel>
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
          <div>
            <Line>
              <Eyebrow n={13}>The ask</Eyebrow>
            </Line>
            <Line i={1}>
              <h2 className={titleClass}>
                {ask.title}
                <Placeholder show={ask.placeholder} />
              </h2>
            </Line>
            <Line i={2} className="mt-8 flex items-baseline gap-4">
              <span className="text-[clamp(3.5rem,7vw,6rem)] leading-none font-medium tracking-[-0.03em]">{ask.amount}</span>
              <span className="text-lg text-ink-soft">{ask.round}</span>
            </Line>
            <Line i={3} className="pitch-card mt-6 flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
              <Donut active={active} />
              <ul className="space-y-2">
                {ask.use.map((u) => (
                  <li key={u.name} className="flex items-center gap-3 text-[0.9375rem]">
                    <span className="h-3 w-3 rounded-sm" style={{ background: u.color }} />
                    <span className="flex-1">{u.name}</span>
                    <span className="font-medium tabular-nums">{u.share}%</span>
                  </li>
                ))}
              </ul>
            </Line>
            <Line i={4}>
              <p className="mt-5 max-w-lg text-[1rem] text-ink-soft">{ask.partners}</p>
            </Line>
          </div>
          <div>
            <Line i={5}>
              <p lang="ar" dir="rtl" className="font-kufi text-[clamp(1.75rem,3.4vw,3.25rem)] leading-[1.4] font-extrabold">
                {ask.verseAr.map((l, i) => (
                  <span key={l} className={`block ${i < ask.verseAr.length - 1 ? "text-night/40" : "text-night"}`}>
                    {l}
                  </span>
                ))}
              </p>
            </Line>
            <Line i={6}>
              <p className="mt-5 text-[1.0625rem] leading-relaxed text-ink-soft">{ask.verseEn}</p>
            </Line>
            <Line i={7} className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-night/15 pt-5 text-sm">
              <span className="font-medium">{c.email}</span>
              <span className="text-ink-soft">{c.web}</span>
              <button
                type="button"
                onClick={onRestart}
                className="ml-auto flex min-h-11 items-center underline decoration-night/30 underline-offset-4 hover:decoration-night"
              >
                Replay from the start
              </button>
            </Line>
            <Line i={8}>
              <ol className="mt-4 space-y-1 text-[0.6875rem] text-ink-soft">
                {sources.map((s) => (
                  <li key={s.id}>
                    [{s.id}] {s.text}
                  </li>
                ))}
                <li>Building data © OpenStreetMap contributors.</li>
              </ol>
            </Line>
          </div>
        </div>
      </FullPanel>
    </Slide>
  );
}
