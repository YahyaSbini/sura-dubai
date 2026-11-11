"use client";

import { useEffect, useState } from "react";
import { human } from "@/content/pitch";
import { Eyebrow, FullPanel, Line, Slide } from "./Slides";

/** Counts up while `on`, one tick every `ms`. Resets when switched off. */
function useTicker(on: boolean, ms: number) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!on) {
      setN(0);
      return;
    }
    const id = window.setInterval(() => setN((v) => v + 1), ms);
    return () => window.clearInterval(id);
  }, [on, ms]);
  return n;
}

function useCount(target: number, on: boolean, ms: number) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!on) {
      setV(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      setV(target * k);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, on, ms]);
  return v;
}

const SEG_COLOR: Record<string, string> = {
  prep: "rgb(11 27 51 / 0.22)",
  road: "#6b7f99",
  air: "#5EC8E5",
  walk: "#D4A54A",
  wait: "#E39A8F",
  hand: "rgb(11 27 51 / 0.45)",
};

/* ---------- 1. Door to hand ---------- */

function DoorToHand({ on }: { on: boolean }) {
  const max = Math.max(...human.doorToHand.rows.map((r) => r.segs.reduce((a, s) => a + s.min, 0)));
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_15rem] lg:items-center">
      <div className="space-y-5">
        {human.doorToHand.rows.map((r, ri) => {
          const total = r.segs.reduce((a, s) => a + s.min, 0);
          let before = 0;
          return (
            <div key={r.label}>
              <div className="mb-1.5 flex items-baseline justify-between text-sm">
                <span className="font-medium">{r.label}</span>
                <span className="tabular-nums text-ink-soft">
                  <b className="text-night">{total}</b> min to the hand
                </span>
              </div>
              <div className="relative h-9 overflow-hidden rounded-lg bg-night/[0.05]">
                {r.segs.map((s, si) => {
                  const left = (before / max) * 100;
                  before += s.min;
                  return (
                    <div
                      key={si}
                      className="absolute inset-y-0 flex items-center overflow-hidden px-2 text-[0.75rem] font-medium whitespace-nowrap text-night/80"
                      style={{
                        left: `${left}%`,
                        width: on ? `${(s.min / max) * 100}%` : "0%",
                        background: SEG_COLOR[s.kind],
                        boxShadow: "inset -1px 0 0 rgb(255 255 255 / 0.7)",
                        transition: `width 700ms cubic-bezier(.2,.7,.2,1) ${ri * 450 + si * 220}ms`,
                      }}
                    >
                      {s.min >= 6 ? s.name : ""}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1 text-[0.8125rem] text-ink-soft">
          {human.doorToHand.legend.map((l) => (
            <span key={l.kind} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SEG_COLOR[l.kind] }} />
              {l.name}
            </span>
          ))}
        </div>
      </div>
      <div
        className={`rounded-xl bg-night p-5 text-sand transition-all duration-700 ${on ? "translate-y-0 opacity-100 delay-[1600ms]" : "translate-y-3 opacity-0"}`}
      >
        <p className="text-[0.8125rem] text-sand/70">{human.doorToHand.calloutKicker}</p>
        <p className="mt-1 text-lg leading-snug font-medium">{human.doorToHand.callout}</p>
      </div>
    </div>
  );
}

/* ---------- 2. Access for everyone ---------- */

function Access({ on }: { on: boolean }) {
  const tick = useTicker(on, 1400);
  const pick = tick % 3;
  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-center">
      <div className="relative mx-auto aspect-[16/10] w-full max-w-xl">
        <svg viewBox="0 0 320 200" className="absolute inset-0 h-full w-full" aria-hidden="true">
          {[70, 48, 26].map((r, i) => (
            <circle
              key={r}
              cx="160"
              cy="100"
              r={r}
              fill="none"
              stroke="#5EC8E5"
              strokeOpacity={0.25 + i * 0.2}
              strokeDasharray={i === 0 ? "3 4" : undefined}
              className="transition-opacity duration-700"
              style={{ opacity: on ? 1 : 0, transitionDelay: `${i * 150}ms` }}
            />
          ))}
          {human.access.people.map((p, i) => (
            <path
              key={p.id}
              d={`M${p.x} ${p.y} Q ${(p.x + 160) / 2} ${p.y < 100 ? p.y + 30 : p.y - 30} 160 100`}
              fill="none"
              stroke="#D4A54A"
              strokeWidth="1.6"
              strokeDasharray="4 4"
              pathLength={1}
              style={{
                strokeDasharray: "1",
                strokeDashoffset: on ? 0 : 1,
                transition: `stroke-dashoffset 1.1s ease-out ${300 + i * 250}ms`,
              }}
            />
          ))}
          <circle cx="160" cy="100" r="13" fill="#0B1B33" />
          <path d="M154 96h12v9h-12z M157 96v-3h6v3" fill="none" stroke="#F3EDE2" strokeWidth="1.6" strokeLinejoin="round" />
          <text x="160" y="128" textAnchor="middle" className="fill-night text-[9px] font-medium">
            {human.access.point}
          </text>
          <text x="160" y="22" textAnchor="middle" className="fill-ink-soft text-[8px]">
            {human.access.radius}
          </text>
        </svg>
        {human.access.people.map((p, i) => (
          <div
            key={p.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-500"
            style={{ left: `${(p.x / 320) * 100}%`, top: `${(p.y / 200) * 100}%`, opacity: on ? 1 : 0, transitionDelay: `${200 + i * 250}ms` }}
          >
            <div className="pitch-card flex max-w-[11rem] items-start gap-2 rounded-xl px-3 py-2">
              <span className="mt-1 h-2 w-2 flex-none rounded-full bg-gold" />
              <span className="text-[0.75rem] leading-tight">
                <b className="block font-medium">{p.who}</b>
                <span className="text-ink-soft">{p.need}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
      <div
        className={`pitch-card p-5 transition-all duration-700 ${on ? "translate-y-0 opacity-100 delay-[1100ms]" : "translate-y-3 opacity-0"}`}
      >
        <p className="flex items-center gap-2 text-sm font-medium text-alert">
          <span className="h-2 w-2 rounded-full bg-alert" />
          {human.access.changeTitle}
        </p>
        <p className="mt-1 text-[0.9375rem] text-ink-soft">{human.access.changeBody}</p>
        <div className="mt-4 grid gap-2">
          {human.access.options.map((o, i) => (
            <div
              key={o}
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-[0.9375rem] transition-colors duration-300 ${
                pick === i ? "bg-night text-sand" : "bg-night/[0.05]"
              }`}
            >
              {o}
              <span className={`h-2 w-2 rounded-full ${pick === i ? "bg-gold" : "bg-night/20"}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- 3. Emergency ---------- */

function Emergency({ on }: { on: boolean }) {
  const e = human.emergency;
  const slow = useCount(e.normal, on, 5200);
  const fast = useCount(e.priority, on, 5200 * (e.priority / e.normal));
  const lanes = [
    { label: e.normalLabel, v: slow, total: e.normal, color: "#6b7f99", dur: 5200, holds: e.holds },
    { label: e.priorityLabel, v: fast, total: e.priority, color: "#D9473A", dur: 5200 * (e.priority / e.normal), holds: [] as number[] },
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_15rem] lg:items-center">
      <div className="space-y-7">
        {lanes.map((l) => (
          <div key={l.label}>
            <div className="mb-2 flex items-baseline justify-between text-sm">
              <span className="font-medium">{l.label}</span>
              <span className="text-2xl font-medium tabular-nums" style={{ color: l.color }}>
                {l.v.toFixed(1)}
                <span className="ml-1 text-sm text-ink-soft">min</span>
              </span>
            </div>
            <div className="relative h-10">
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-night/20" />
              <span className="absolute top-1/2 left-0 z-10 -translate-y-1/2 rounded-full bg-night px-2 py-0.5 text-[0.6875rem] text-sand">{e.from}</span>
              <span className="absolute top-1/2 right-0 z-10 flex -translate-y-1/2 items-center gap-1 rounded-full bg-alert px-2 py-0.5 text-[0.6875rem] text-white">
                <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" aria-hidden="true">
                  <path d="M4 1h2v3h3v2H6v3H4V6H1V4h3z" fill="currentColor" />
                </svg>
                {e.to}
              </span>
              {l.holds.map((h) => (
                <span
                  key={h}
                  className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-mist-deep bg-sand"
                  style={{ left: `${h}%` }}
                  title="Hold"
                />
              ))}
              <span
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: on ? "78%" : "12%",
                  transition: on ? `left ${l.dur}ms linear` : "none",
                }}
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
                  <path d="M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z" fill={l.color} />
                </svg>
              </span>
            </div>
          </div>
        ))}
        <p className="text-[0.8125rem] text-ink-soft">{e.note}</p>
      </div>
      <div className={`rounded-xl bg-alert p-5 text-white transition-all duration-700 ${on ? "translate-y-0 opacity-100 delay-[2600ms]" : "translate-y-3 opacity-0"}`}>
        <p className="text-[0.8125rem] text-white/80">{e.savedKicker}</p>
        <p className="mt-1 text-4xl font-medium tabular-nums">
          {(e.normal - e.priority).toFixed(1)}
          <span className="ml-1 text-lg">min</span>
        </p>
        <p className="mt-1 text-[0.9375rem]">{e.savedBody}</p>
      </div>
    </div>
  );
}

/* ---------- 4. Neighbourhoods ---------- */

const COLS = 14;
const ROWS = 7;

function Neighbourhoods({ on }: { on: boolean }) {
  const tick = useTicker(on, 3200);
  const balanced = on && tick % 2 === 1;
  const n = human.neighbourhoods;
  const lanes = balanced ? [1, 3, 5] : [3];
  const load = (r: number) => {
    if (!lanes.includes(r)) return Math.abs(lanes[0] - r) === 1 && !balanced ? 0.12 : 0;
    return balanced ? 0.32 : 0.85;
  };
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
      <div className="relative">
        <svg viewBox={`0 0 ${COLS * 22 + 10} ${ROWS * 22 + 10}`} className="w-full" aria-hidden="true">
          {Array.from({ length: ROWS }, (_, r) =>
            Array.from({ length: COLS }, (_, c) => (
              <rect
                key={`${r}-${c}`}
                x={6 + c * 22}
                y={6 + r * 22}
                width="16"
                height="16"
                rx="3"
                fill="#D9473A"
                fillOpacity={on ? load(r) : 0}
                stroke="rgb(11 27 51 / 0.25)"
                style={{ transition: "fill-opacity 900ms ease-out" }}
              />
            )),
          )}
          {[1, 3, 5].map((r) => (
            <line
              key={r}
              x1="0"
              x2={COLS * 22 + 10}
              y1={14 + r * 22}
              y2={14 + r * 22}
              stroke="#0B1B33"
              strokeWidth="2.2"
              strokeDasharray="6 5"
              style={{ opacity: on && lanes.includes(r) ? 1 : 0, transition: "opacity 700ms" }}
            >
              <animate attributeName="stroke-dashoffset" from="22" to="0" dur="1s" repeatCount="indefinite" />
            </line>
          ))}
          <g transform={`translate(${6 + 11 * 22} ${6 + 6 * 22})`}>
            <rect width="38" height="16" rx="3" fill="#0B1B33" />
            {Array.from({ length: 9 }, (_, i) => (
              <circle
                key={i}
                r="2.6"
                fill="#D4A54A"
                cx={balanced ? -40 - (i % 3) * 36 - Math.floor(i / 3) * 8 : 4 + (i % 5) * 7}
                cy={balanced ? -6 - Math.floor(i / 3) * 3 : -5 - Math.floor(i / 5) * 6}
                style={{ transition: "cx 900ms ease-out, cy 900ms ease-out", opacity: on ? 1 : 0 }}
              />
            ))}
          </g>
        </svg>
      </div>
      <div className="space-y-3">
        {[n.fast, n.balanced].map((s, i) => {
          const cur = (i === 1) === balanced;
          return (
            <div key={s.title} className={`rounded-xl p-4 transition-all duration-500 ${cur && on ? "bg-night text-sand" : "pitch-card opacity-60"}`}>
              <p className="text-sm font-medium">{s.title}</p>
              <p className={`mt-1 text-[0.875rem] ${cur && on ? "text-sand/75" : "text-ink-soft"}`}>{s.body}</p>
              <div className="mt-3 flex gap-5 text-[0.8125rem]">
                {s.stats.map((st) => (
                  <span key={st.label}>
                    <b className="block text-xl font-medium tabular-nums">{st.value}</b>
                    {st.label}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- 5. Field trial loop ---------- */

function FieldTrial({ on }: { on: boolean }) {
  const tick = useTicker(on, 1500);
  const cur = tick % human.trial.steps.length;
  const pos = [
    [50, 6],
    [94, 50],
    [50, 94],
    [6, 50],
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-center">
      <div className="relative mx-auto aspect-square w-full max-w-[19rem]">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <circle cx="50" cy="50" r="44" fill="none" stroke="rgb(11 27 51 / 0.15)" strokeWidth="0.6" />
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="#D4A54A"
            strokeWidth="1.4"
            strokeLinecap="round"
            pathLength={4}
            strokeDasharray="1 3"
            transform="rotate(-90 50 50)"
            style={{ strokeDashoffset: -cur, transition: "stroke-dashoffset 600ms ease-out", opacity: on ? 1 : 0 }}
          />
        </svg>
        <div className="absolute inset-[30%] grid place-items-center rounded-full bg-night text-center text-[0.75rem] leading-tight text-sand">
          {human.trial.center}
        </div>
        {human.trial.steps.map((s, i) => (
          <div
            key={s.name}
            className={`absolute w-[8.5rem] -translate-x-1/2 -translate-y-1/2 rounded-xl px-3 py-2 text-center transition-all duration-500 ${
              cur === i && on ? "scale-105 bg-night text-sand" : "pitch-card"
            }`}
            style={{ left: `${pos[i][0]}%`, top: `${pos[i][1]}%`, opacity: on ? 1 : 0, transitionDelay: on ? "0ms" : "0ms" }}
          >
            <p className="text-sm font-medium">{s.name}</p>
            <p className={`text-[0.6875rem] leading-tight ${cur === i && on ? "text-sand/75" : "text-ink-soft"}`}>{s.detail}</p>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <div className={`flex items-center gap-3 rounded-xl bg-ok/10 p-4 transition-all duration-700 ${on ? "opacity-100 delay-700" : "opacity-0"}`}>
          <svg viewBox="0 0 24 24" className="h-6 w-6 flex-none text-ok" aria-hidden="true">
            <path d="M4 12h13m-5-6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-[0.9375rem] font-medium text-night">{human.trial.expand}</p>
        </div>
        <div className={`pitch-card p-4 transition-all duration-700 ${on ? "opacity-100 delay-1000" : "opacity-0"}`}>
          <p className="text-sm font-medium">{human.trial.openTitle}</p>
          <p className="mt-1 text-[0.875rem] text-ink-soft">{human.trial.openBody}</p>
        </div>
      </div>
    </div>
  );
}

const BEATS = [DoorToHand, Access, Emergency, Neighbourhoods, FieldTrial];
export const HUMAN_BEATS = BEATS.length;

export function HumanSlide({ active, n, beat, onBeat }: { active: boolean; n: number; beat: number; onBeat: (b: number) => void }) {
  return (
    <Slide active={active}>
      <FullPanel>
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <div>
            <Line>
              <Eyebrow n={n}>{human.eyebrow}</Eyebrow>
            </Line>
            <Line i={1}>
              <h2 lang="ar" dir="rtl" className="mt-4 font-kufi text-[clamp(2.25rem,4.6vw,4rem)] leading-[1.15] font-extrabold">
                {human.titleAr}
              </h2>
            </Line>
          </div>
          <Line i={2} className="max-w-lg">
            <p lang="ar" dir="rtl" className="font-kufi text-[clamp(1.125rem,1.7vw,1.5rem)] leading-snug font-semibold text-gold-deep">
              «{human.questionAr}»
            </p>
            <p className="mt-1 text-right text-[0.9375rem] text-ink-soft">{human.question}</p>
          </Line>
        </div>

        <Line i={3} className="pitch-card mt-8 p-5 md:p-7">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label={human.eyebrow}>
            {human.beats.map((b, i) => (
              <button
                key={b}
                type="button"
                role="tab"
                aria-selected={beat === i}
                onClick={() => onBeat(i)}
                className={`flex min-h-10 items-center gap-2 rounded-full px-4 text-sm transition-colors duration-200 ${
                  beat === i ? "bg-night text-sand" : "bg-night/[0.05] text-night hover:bg-night/10"
                }`}
              >
                <span className={`tabular-nums ${beat === i ? "text-gold" : "text-ink-soft"}`}>{i + 1}</span>
                {b}
              </button>
            ))}
          </div>
          <div className="relative mt-7 grid">
            {BEATS.map((Beat, i) => {
              const on = active && beat === i;
              return (
                <div
                  key={i}
                  role="tabpanel"
                  aria-hidden={!on}
                  className={`col-start-1 row-start-1 transition-opacity duration-500 ${on ? "opacity-100" : "pointer-events-none opacity-0"}`}
                >
                  <Beat on={on} />
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-[0.75rem] text-ink-soft">{human.note}</p>
        </Line>
      </FullPanel>
    </Slide>
  );
}
