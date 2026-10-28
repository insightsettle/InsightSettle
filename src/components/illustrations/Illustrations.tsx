/**
 * Insight line illustrations (founder, 28 Oct 2026: a story-like, calm customer experience).
 * Drawn for Insight in one style: round-capped lines in brand green, mint accents, soft blobs behind.
 * Lines "draw themselves" on mount (pathLength=1 + CSS), staggered with --d. Reduced motion shows them still.
 * Decorative: every illustration is aria-hidden; the text next to it carries the meaning.
 */
import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

type P = { className?: string | undefined; still?: boolean };
const d = (s: number): CSSProperties => ({ ["--d" as string]: `${s}s` });

function Frame({ children, className, still }: P & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 240 180" fill="none" aria-hidden className={cn("ill h-auto w-full", still && "ill-still", className)}>
      {children}
    </svg>
  );
}

/** Soft background blob. */
const Blob = ({ cx = 120, cy = 92, r = 70, tone = "mint" }: { cx?: number; cy?: number; r?: number; tone?: "mint" | "teal" | "gold" }) => (
  <circle cx={cx} cy={cy} r={r} className={cn("ill-fill", tone === "mint" ? "fill-brand-mint/15" : tone === "teal" ? "fill-brand-teal/15" : "fill-gold/15")} />
);

/** 1 · Agree: a one-page agreement with ticks, a pen and a seal. */
export function IllAgree(p: P) {
  return (
    <Frame {...p}>
      <Blob />
      <rect x="72" y="28" width="96" height="124" rx="12" pathLength={1} className="ill-line stroke-primary" strokeWidth="3" style={d(0)} />
      {[52, 72, 92].map((y, i) => (
        <g key={y}>
          <path d={`M88 ${y} l5 5 l9 -10`} pathLength={1} className="ill-line stroke-brand-mint" strokeWidth="3.5" style={d(0.35 + i * 0.18)} />
          <path d={`M110 ${y} H150`} pathLength={1} className="ill-line stroke-primary/40" strokeWidth="3" style={d(0.45 + i * 0.18)} />
        </g>
      ))}
      <path d="M88 118 H132" pathLength={1} className="ill-line stroke-primary/30" strokeWidth="3" style={d(1)} />
      <circle cx="160" cy="138" r="18" pathLength={1} className="ill-line stroke-brand-mint" strokeWidth="3" style={d(1.1)} />
      <path d="M152 138 l6 6 l11 -12" pathLength={1} className="ill-line stroke-primary" strokeWidth="3.5" style={d(1.35)} />
      <path d="M186 40 L150 104 l-6 14 l12 -9 l36 -64 z" pathLength={1} className="ill-line stroke-primary" strokeWidth="3" style={d(0.8)} />
    </Frame>
  );
}

/** 2 · Held: buyer and seller, the amount waits in a locked box between them. */
export function IllHeld(p: P) {
  return (
    <Frame {...p}>
      <Blob r={62} />
      {/* buyer */}
      <circle cx="40" cy="70" r="11" pathLength={1} className="ill-line stroke-primary" strokeWidth="3" style={d(0)} />
      <path d="M22 112 a18 18 0 0 1 36 0" pathLength={1} className="ill-line stroke-primary" strokeWidth="3" style={d(0.15)} />
      {/* seller */}
      <circle cx="200" cy="70" r="11" pathLength={1} className="ill-line stroke-primary" strokeWidth="3" style={d(0.1)} />
      <path d="M182 112 a18 18 0 0 1 36 0" pathLength={1} className="ill-line stroke-primary" strokeWidth="3" style={d(0.25)} />
      {/* route */}
      <path id="ill-held-route" d="M58 96 C80 60 96 62 104 84" className="ill-dash stroke-brand-mint" strokeWidth="3" />
      <path d="M136 84 C144 62 160 60 182 96" className="ill-dash stroke-primary/25" strokeWidth="3" />
      {/* box with lock */}
      <rect x="100" y="84" width="40" height="34" rx="8" pathLength={1} className="ill-line stroke-primary" strokeWidth="3" style={d(0.45)} />
      <path d="M110 84 v-8 a10 10 0 0 1 20 0 v8" pathLength={1} className="ill-line stroke-primary" strokeWidth="3" style={d(0.7)} />
      <circle cx="120" cy="100" r="3.5" className="ill-fill fill-brand-mint" />
      <path d="M120 103 v6" pathLength={1} className="ill-line stroke-brand-mint" strokeWidth="3" style={d(0.9)} />
      {/* a coin travelling into the box */}
      <circle r="6" className="ill-coin fill-gold">
        <animateMotion dur="2.6s" repeatCount="indefinite" path="M58 96 C80 60 96 62 104 84" />
      </circle>
      <path d="M70 140 H170" pathLength={1} className="ill-line stroke-primary/20" strokeWidth="3" style={d(1)} />
    </Frame>
  );
}

/** 3 · Deliver: the parcel travels along a dashed route to its pin. */
export function IllDeliver(p: P) {
  return (
    <Frame {...p}>
      <Blob tone="teal" />
      <path d="M44 120 l30 -14 l30 14 l-30 14 z" pathLength={1} className="ill-line stroke-primary" strokeWidth="3" style={d(0)} />
      <path d="M44 120 v26 l30 14 v-26 M104 120 v26 l-30 14" pathLength={1} className="ill-line stroke-primary" strokeWidth="3" style={d(0.25)} />
      <path d="M59 113 l30 14" pathLength={1} className="ill-line stroke-brand-mint" strokeWidth="3" style={d(0.5)} />
      <path d="M112 112 C140 100 150 70 176 66" className="ill-dash stroke-brand-mint" strokeWidth="3" />
      <path d="M188 30 a16 16 0 0 1 16 16 c0 14 -16 28 -16 28 s-16 -14 -16 -28 a16 16 0 0 1 16 -16 z" pathLength={1} className="ill-line stroke-primary" strokeWidth="3" style={d(0.7)} />
      <circle cx="188" cy="46" r="5" pathLength={1} className="ill-line stroke-brand-mint" strokeWidth="3" style={d(1)} />
      <path d="M150 150 H206" pathLength={1} className="ill-line stroke-primary/20" strokeWidth="3" style={d(1)} />
    </Frame>
  );
}

/** 4 · Paid out: the check, a little sparkle, the amount on its way. */
export function IllRelease(p: P) {
  return (
    <Frame {...p}>
      <Blob r={64} />
      <circle cx="120" cy="84" r="40" pathLength={1} className="ill-line stroke-primary" strokeWidth="3.5" style={d(0)} />
      <path d="M102 85 l12 12 l26 -28" pathLength={1} className="ill-line stroke-brand-mint" strokeWidth="5" style={d(0.45)} />
      {([[60, 46], [184, 52], [176, 128], [62, 124]] as const).map(([x, y], i) => (
        <path key={i} d={`M${x} ${y - 7} v14 M${x - 7} ${y} h14`} pathLength={1} className="ill-line stroke-gold" strokeWidth="3" style={d(0.8 + i * 0.12)} />
      ))}
      <ellipse cx="120" cy="150" rx="22" ry="6" pathLength={1} className="ill-line stroke-primary/40" strokeWidth="3" style={d(1.1)} />
      <ellipse cx="120" cy="143" rx="22" ry="6" pathLength={1} className="ill-line stroke-primary/60" strokeWidth="3" style={d(1.2)} />
    </Frame>
  );
}

/** Empty: a blank page with the sun rising behind it. */
export function IllEmpty(p: P) {
  return (
    <Frame {...p}>
      <Blob tone="gold" r={58} cy={96} />
      <path d="M78 108 a42 42 0 0 1 84 0" pathLength={1} className="ill-line stroke-gold" strokeWidth="3" style={d(0)} />
      {[-60, -30, 0, 30, 60].map((a, i) => {
        const r = (a - 90) * (Math.PI / 180);
        return <path key={a} d={`M${120 + Math.cos(r) * 52} ${108 + Math.sin(r) * 52} L${120 + Math.cos(r) * 62} ${108 + Math.sin(r) * 62}`} pathLength={1} className="ill-line stroke-gold" strokeWidth="3" style={d(0.3 + i * 0.08)} />;
      })}
      <path d="M40 108 H200" pathLength={1} className="ill-line stroke-primary/40" strokeWidth="3" style={d(0.2)} />
      <path d="M92 116 h56 v42 h-56 z" pathLength={1} className="ill-line stroke-primary" strokeWidth="3" style={d(0.6)} />
      <path d="M104 130 h32 M104 142 h20" pathLength={1} className="ill-line stroke-primary/30" strokeWidth="3" style={d(0.9)} />
    </Frame>
  );
}

/** Calm: balanced scales, for "no disputes". */
export function IllCalm(p: P) {
  return (
    <Frame {...p}>
      <Blob />
      <path d="M120 40 V146 M92 146 h56" pathLength={1} className="ill-line stroke-primary" strokeWidth="3" style={d(0)} />
      <path d="M68 62 H172" pathLength={1} className="ill-line stroke-primary" strokeWidth="3" style={d(0.3)} />
      <path d="M68 62 l-16 36 h32 z M172 62 l-16 36 h32 z" pathLength={1} className="ill-line stroke-brand-mint" strokeWidth="3" style={d(0.55)} />
      <circle cx="120" cy="40" r="6" pathLength={1} className="ill-line stroke-primary" strokeWidth="3" style={d(0.2)} />
    </Frame>
  );
}

/** Share: one link, many buyers. */
export function IllLink(p: P) {
  return (
    <Frame {...p}>
      <Blob tone="teal" />
      <rect x="62" y="74" width="56" height="30" rx="15" pathLength={1} className="ill-line stroke-primary" strokeWidth="3.5" style={d(0)} />
      <rect x="104" y="74" width="56" height="30" rx="15" pathLength={1} className="ill-line stroke-brand-mint" strokeWidth="3.5" style={d(0.3)} />
      {([[186, 44], [196, 90], [184, 136]] as const).map(([x, y], i) => (
        <g key={i}>
          <path d={`M162 89 L${x - 12} ${y}`} className="ill-dash stroke-primary/30" strokeWidth="2.5" />
          <circle cx={x} cy={y} r="9" pathLength={1} className="ill-line stroke-primary" strokeWidth="3" style={d(0.6 + i * 0.15)} />
        </g>
      ))}
    </Frame>
  );
}
