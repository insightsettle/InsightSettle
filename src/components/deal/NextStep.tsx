import { ArrowDown, BadgeCheck, CircleCheckBig, Clock3, PackageCheck, Scale, Truck, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/locale";
import { nextStepFor, type NextStep, type NextStepAction } from "@/lib/next-step";

/**
 * The first thing on a deal page: one sentence on what happens now and, when it is the viewer's turn, one
 * primary button. The buttons call the page's existing handlers; no rule lives here (C04 redesign).
 */
export function NextStepCard({ step, onAction, busy }: { step: NextStep | null; onAction: (a: NextStepAction) => void; busy?: boolean }) {
  const { text } = useLocale();
  if (!step) return null;
  const icon: Record<NextStep["icon"], ReactNode> = {
    terms: <BadgeCheck className="size-6 text-primary" />, pay: <Wallet className="size-6 text-primary" />,
    ship: <Truck className="size-6 text-primary" />, inspect: <PackageCheck className="size-6 text-primary" />,
    wait: <Clock3 className="size-6 text-muted-foreground" />, done: <CircleCheckBig className="size-6 text-primary" />,
    dispute: <Scale className="size-6 text-warning" />,
  };
  const yourTurn = step.mine;
  return (
    <section data-no-localize aria-labelledby="next-step-title" className={`relative overflow-hidden rounded-2xl border bg-card p-5 animate-in fade-in slide-in-from-bottom-2 duration-500 sm:p-7 ${yourTurn ? "border-2 border-brand-mint shadow-[0_18px_40px_-28px_rgb(19_128_101/0.8)]" : "border-border"}`}>
      {yourTurn && <span aria-hidden className="pointer-events-none absolute -end-16 -top-16 size-48 rounded-full bg-brand-mint/15 blur-2xl" />}
      <div className="relative flex items-start gap-4">
        <span className={`relative grid size-12 shrink-0 place-items-center rounded-xl ${yourTurn ? "bg-accent" : "bg-surface"}`}>{yourTurn && <span className="absolute inset-0 rounded-xl bg-brand-mint/40 motion-safe:animate-ping [animation-duration:2.2s]" />}<span className="relative">{icon[step.icon]}</span></span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${yourTurn ? "text-primary" : "text-muted-foreground"}`}>{yourTurn ? text("Your next step", "خطوتك التالية") : text("What happens now", "ماذا يحدث الآن")}</p>
          <h2 id="next-step-title" className="mt-1 text-xl font-bold leading-snug sm:text-2xl">{text(step.title[0], step.title[1])}</h2>
          <p className="mt-3 max-w-3xl leading-8 text-foreground/80">{text(step.body[0], step.body[1])}</p>
          {step.note && <p className="mt-4 rounded-xl bg-warning-subtle px-4 py-3 text-sm leading-7 text-warning">{text(step.note[0], step.note[1])}</p>}
          {(step.primary || step.secondary) && (
            <div className="mt-5 flex flex-wrap gap-3">
              {step.primary && <Button size="lg" className="group relative h-12 overflow-hidden px-6 text-base shadow-[0_12px_26px_-14px_rgb(19_128_101/0.85)] enabled:hover:-translate-y-0.5" disabled={busy} onClick={() => onAction(step.primary!.action)}>{text(step.primary.label[0], step.primary.label[1])}{step.primary.action.startsWith("scroll") && <ArrowDown className="size-4 transition-transform group-hover:translate-y-0.5" />}{!busy && <span className="checkout-sheen pointer-events-none absolute inset-0" />}</Button>}
              {step.secondary && <Button size="lg" variant="outline" className="h-12 px-6 text-base" onClick={() => onAction(step.secondary!.action)}>{text(step.secondary.label[0], step.secondary.label[1])}</Button>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export { nextStepFor };
