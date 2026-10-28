/**
 * A full-screen moment for the big steps of a deal (founder, 28 Oct 2026): money held, received, paid out.
 * Confetti in brand colours, an illustration that draws itself, one sentence and one button.
 * Respects reduced motion (no confetti, still drawing). Closes on the button, the backdrop or Escape.
 */
import { useEffect, useMemo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COLORS = ["#55BD8A", "#5CC4BA", "#138065", "#E3A33B", "#F6FAF8"];

export function Confetti({ count = 70 }: { count?: number }) {
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => ({
    left: Math.random() * 100,
    x: `${(Math.random() - 0.5) * 40}vw`,
    r: `${(Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540)}deg`,
    t: `${2.2 + Math.random() * 1.6}s`,
    delay: `${Math.random() * 0.5}s`,
    w: 6 + Math.random() * 6,
    color: COLORS[i % COLORS.length],
    round: Math.random() > 0.7,
  })), [count]);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[71] overflow-hidden">
      {pieces.map((p, i) => (
        <span key={i} className="confetti-piece" style={{ left: `${p.left}%`, width: p.w, height: p.round ? p.w : p.w * 1.6, borderRadius: p.round ? 999 : 2, background: p.color, ["--x" as string]: p.x, ["--r" as string]: p.r, ["--t" as string]: p.t, ["--delay" as string]: p.delay }} />
      ))}
    </div>
  );
}

export function Celebrate({ open, onClose, art, title, body, action, confetti = true }: {
  open: boolean; onClose: () => void; art: ReactNode; title: string; body?: string; action: string; confetti?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    try { navigator.vibrate?.([18, 40, 28]); } catch { /* not supported */ }
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[70] grid place-items-center p-4">
      <button type="button" aria-label={action} className="absolute inset-0 bg-brand-strong/50 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      {confetti && <Confetti />}
      <div className={cn("relative w-full max-w-sm rounded-[28px] border bg-card p-6 text-center shadow-2xl animate-in zoom-in-90 fade-in duration-500")}>
        <div className="mx-auto w-56">{art}</div>
        <h2 className="mt-2 text-2xl font-bold">{title}</h2>
        {body && <p className="mt-2 leading-7 text-muted-foreground">{body}</p>}
        <Button size="lg" className="mt-5 h-12 w-full rounded-2xl text-base" onClick={onClose} autoFocus>{action}</Button>
      </div>
    </div>
  );
}
