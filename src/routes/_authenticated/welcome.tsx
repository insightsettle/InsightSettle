import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { ArrowLeft, ArrowRight, Plus } from "@/components/icons";
import { IllAgree, IllDeliver, IllHeld, IllRelease } from "@/components/illustrations/Illustrations";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/locale";
import { markWelcomeSeen as markSeen } from "@/lib/welcome";

export const Route = createFileRoute("/_authenticated/welcome")({
  head: () => ({ meta: [{ title: "Welcome | Insight" }, { name: "description", content: "How a deal on Insight works, in four short steps." }] }),
  component: Welcome,
});


type Slide = { art: ReactNode; title: [string, string]; body: [string, string] };
const SLIDES: Slide[] = [
  { art: <IllHeld />, title: ["Your money waits in the middle", "مبلغك ينتظر في المنتصف"],
    body: ["You pay into the deal, not to the other party. The amount is held until each side does what you agreed.", "تدفع في الصفقة لا للطرف الآخر، ويبقى المبلغ محفوظاً حتى يفي كل طرف بما اتفقتما عليه."] },
  { art: <IllAgree />, title: ["Clear terms from the start", "اتفاق واضح من البداية"],
    body: ["What is delivered, by when, and how it is accepted: one page that both of you accept before anyone pays.", "ما يُسلَّم، ومتى، وكيف يُقبل: صفحة واحدة يوافق عليها الطرفان قبل أي دفع."] },
  { art: <IllDeliver />, title: ["Follow every step", "تتابع كل خطوة"],
    body: ["Shipping, delivery and your checking time, on one page, with an update the moment something changes.", "الشحن والتسليم ومدة الفحص في صفحة واحدة، ويصلك تحديث فور أي تغيير."] },
  { art: <IllRelease />, title: ["You check, then it is paid out", "تتأكد، ثم يُحوَّل المبلغ"],
    body: ["The seller is paid only after you receive and check. If something is wrong, you open a case before the money moves.", "لا يُحوَّل المبلغ للبائع إلا بعد أن تستلم وتفحص، وإن كان هناك خطأ تفتح طلباً قبل أن يتحرك المبلغ."] },
];

function Welcome() {
  const { text, direction } = useLocale();
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const go = useCallback((n: number) => setI(Math.max(0, Math.min(SLIDES.length - 1, n))), []);
  const finish = useCallback((to: "/dashboard" | "/deals/new") => { markSeen(); void navigate({ to, replace: true }); }, [navigate]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const fwd = direction === "rtl" ? "ArrowLeft" : "ArrowRight"; const back = direction === "rtl" ? "ArrowRight" : "ArrowLeft";
      if (e.key === fwd) go(i + 1); else if (e.key === back) go(i - 1); else if (e.key === "Escape") finish("/dashboard");
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [i, go, finish, direction]);
  // Swipe: forward is towards the reading direction.
  const start = useRef<number | null>(null);
  const onDown = (e: React.PointerEvent) => { start.current = e.clientX; };
  const onUp = (e: React.PointerEvent) => {
    if (start.current == null) return; const dx = e.clientX - start.current; start.current = null;
    if (Math.abs(dx) < 50) return; const forward = direction === "rtl" ? dx > 0 : dx < 0; go(i + (forward ? 1 : -1));
  };
  const s = SLIDES[i]!;
  const Next = direction === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <div data-no-localize className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background" onPointerDown={onDown} onPointerUp={onUp}>
      <div aria-hidden className="blob-drift pointer-events-none absolute -top-32 -end-24 size-[26rem] rounded-full bg-brand-mint/15 blur-3xl" />
      <div aria-hidden className="blob-drift pointer-events-none absolute -bottom-40 -start-24 size-[24rem] rounded-full bg-brand-teal/10 blur-3xl [animation-delay:2s]" />
      <header className="relative flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <img src="/brand/insight-logo.svg" alt="Insight" className="h-8 w-auto" />
        <button type="button" onClick={() => finish("/dashboard")} className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-primary">{text("Skip", "تخطي")}</button>
      </header>

      <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6">
        <div key={i} className="story-in flex flex-col items-center text-center">
          <div className="w-full max-w-[320px]">{s.art}</div>
          <h1 className="mt-4 text-[1.75rem] font-bold leading-snug sm:text-3xl">{text(s.title[0], s.title[1])}</h1>
          <p className="mt-3 text-base leading-8 text-muted-foreground">{text(s.body[0], s.body[1])}</p>
          <span className="mt-4 rounded-full bg-accent px-3 py-1 text-[11px] font-medium text-accent-foreground">{text("Demo: the payment provider is simulated", "نسخة تجريبية: مزوّد الدفع محاكى")}</span>
        </div>
      </main>

      <footer className="relative mx-auto w-full max-w-md px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mb-5 flex items-center justify-center gap-2" role="tablist" aria-label={text("Steps", "الخطوات")}>
          {SLIDES.map((_, k) => (
            <button key={k} type="button" role="tab" aria-selected={k === i} aria-label={`${k + 1}`} onClick={() => go(k)}
              className={`h-2 rounded-full transition-all duration-300 ${k === i ? "w-7 bg-primary" : k < i ? "w-2 bg-primary/50" : "w-2 bg-border"}`} />
          ))}
        </div>
        {last ? (
          <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Button size="lg" className="h-14 rounded-2xl text-base shadow-[0_14px_30px_-14px_rgb(19_128_101/0.85)]" onClick={() => finish("/deals/new")}><Plus />{text("Start your first deal", "ابدأ صفقتك الأولى")}</Button>
            <Button size="lg" variant="ghost" className="h-12 rounded-2xl" onClick={() => finish("/dashboard")}>{text("Go to my dashboard", "اذهب إلى لوحتي")}</Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => go(i - 1)} disabled={i === 0} className="h-12 rounded-2xl px-4 text-sm font-medium text-muted-foreground disabled:opacity-0">{text("Back", "رجوع")}</button>
            <Button size="lg" className="group h-14 w-14 rounded-full p-0 shadow-[0_14px_30px_-14px_rgb(19_128_101/0.85)]" aria-label={text("Next", "التالي")} onClick={() => go(i + 1)}>
              <Next className="size-6 transition-transform group-hover:scale-110" />
            </Button>
          </div>
        )}
        <p className="mt-4 text-center text-xs text-muted-foreground"><Link to="/how-it-works" className="underline-offset-4 hover:underline">{text("How Insight works, in detail", "كيف تعمل إنسايت بالتفصيل")}</Link></p>
      </footer>
    </div>
  );
}
