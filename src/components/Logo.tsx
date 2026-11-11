type MarkProps = {
  color?: string;
  hole?: string;
  animated?: boolean;
  className?: string;
};

/** The SURA symbol: the guiding star and the dotted flight path that rises to it. */
export function Mark({ color = "#D4A54A", hole = "#0B1B33", animated = false, className }: MarkProps) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <path
        d="M22 182 C 50 150, 70 120, 104 96"
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="2 13"
        className={animated ? "intro-path" : undefined}
      />
      <circle cx="22" cy="182" r="7" fill={color} className={animated ? "intro-dot" : undefined} />
      <g className={animated ? "intro-star" : undefined}>
        <path
          d="M126 18 C 130 56 138 64 178 70 C 138 76 130 84 126 122 C 122 84 114 76 74 70 C 114 64 122 56 126 18 Z"
          fill={color}
        />
        <circle cx="126" cy="70" r="7" fill={hole} />
      </g>
    </svg>
  );
}

type LockupProps = {
  /** Light = for the sand background. */
  tone?: "dark" | "light";
  animated?: boolean;
  className?: string;
};

/** Full logo: Arabic wordmark, Latin name and the symbol. Scales with the font size of its container. */
export function Lockup({ tone = "dark", animated = false, className = "" }: LockupProps) {
  const light = tone === "light";
  return (
    <div
      role="img"
      aria-label="SURA Dubai"
      className={`flex items-center gap-[0.33em] ${light ? "text-night" : "text-sand"} ${className}`}
    >
      <div className="flex flex-col items-start gap-[0.045em]">
        <span
          lang="ar"
          dir="rtl"
          className={`font-kufi text-[1em] leading-none font-extrabold ${animated ? "intro" : ""}`}
          style={{ ["--d" as string]: 350 }}
        >
          سُرى
        </span>
        <span
          className={`flex items-baseline gap-[0.1em] ${animated ? "intro" : ""}`}
          style={{ ["--d" as string]: 550 }}
        >
          <span className="text-[0.3em] font-bold tracking-[0.3em]">SURA</span>
          <span className={`text-[0.15em] font-medium tracking-[0.4em] ${light ? "text-ink-soft" : "text-gold"}`}>
            DUBAI
          </span>
        </span>
      </div>
      <Mark
        animated={animated}
        color={light ? "#0B1B33" : "#D4A54A"}
        hole={light ? "#F3EDE2" : "#0B1B33"}
        className="h-[1.44em] w-[1.44em] flex-none"
      />
    </div>
  );
}
