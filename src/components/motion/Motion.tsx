/**
 * Shared motion and loading pieces (founder, 27 Oct: the whole platform should feel interactive and professional).
 * Everything here is presentation only and respects the viewer's reduced-motion setting.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Counts from the previous value to the new one (from 0 on first show). */
export function AnimatedNumber({ value, format = (n) => String(Math.round(n)), duration = 700, from = 0 }: {
  value: number; format?: (n: number) => string; duration?: number; from?: number;
}) {
  const [shown, setShown] = useState(reduced() ? value : from);
  const last = useRef(reduced() ? value : from);
  useEffect(() => {
    if (reduced()) { setShown(value); last.current = value; return; }
    const start = last.current; const t0 = performance.now(); let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration); const e = 1 - (1 - p) ** 3;
      setShown(start + (value - start) * e);
      if (p < 1) raf = requestAnimationFrame(step); else { last.current = value; setShown(value); }
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); last.current = value; };
  }, [value, duration]);
  return <>{format(shown)}</>;
}

/** A shimmering placeholder block. */
export function Shimmer({ className }: { className?: string | undefined }) {
  return <span aria-hidden className={cn("checkout-skeleton block", className)} />;
}

/** Page-level placeholder used instead of a bare "Loading…" line. */
export function PageSkeleton({ rows = 3, label = "Loading…" }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-label={label} className="space-y-4">
      <Shimmer className="h-8 w-56" />
      <Shimmer className="h-4 w-80 max-w-full" />
      <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <Shimmer key={i} className="h-24 rounded-2xl" />)}</div>
      {Array.from({ length: rows }, (_, i) => <Shimmer key={i} className="h-16 rounded-2xl" />)}
    </div>
  );
}

/** Compact placeholder for a list or table area. */
export function ListSkeleton({ rows = 4, label = "Loading…" }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-label={label} className="space-y-2.5">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border bg-card p-3">
          <Shimmer className="size-9 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2"><Shimmer className="h-3.5 w-2/5" /><Shimmer className="h-3 w-3/5" /></div>
          <Shimmer className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Friendly empty state with an icon, a line of help and an optional action. */
export function EmptyState({ icon: Icon, title, body, action, className }: { icon: LucideIcon; title: string; body?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-10 text-center animate-in fade-in zoom-in-95 duration-300", className)}>
      <span className="relative grid size-14 place-items-center">
        <span className="absolute inset-0 rounded-2xl bg-primary/10 motion-safe:animate-[float_4s_ease-in-out_infinite]" />
        <Icon className="relative size-6 text-primary" />
      </span>
      <p className="font-semibold">{title}</p>
      {body && <p className="max-w-md text-sm leading-6 text-muted-foreground">{body}</p>}
      {action}
    </div>
  );
}
