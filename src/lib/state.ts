/** Scroll-driven state shared between the DOM and the WebGL scene (read every frame, never reactive). */
export const CHAPTER_COUNT = 7;

export const scrollState = {
  /** Chapter position: 0 at the first chapter, CHAPTER_COUNT - 1 at the last. */
  t: 0,
  /** 0..1 once the closing panel starts covering the scene. */
  closing: 0,
};

export const pointer = { x: 0, y: 0 };

export const sharedTime = { value: 0 };

export function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Smooth 0..1 ramp of `t` between `a` and `b`. */
export function ramp(t: number, a: number, b: number) {
  const x = clamp01((t - a) / (b - a));
  return x * x * (3 - 2 * x);
}
