import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { infoHead } from "@/components/site/InfoPage";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/lib/locale";
import { SURVEY_QUESTIONS, type SurveyField } from "@/lib/survey";
import { submitSurvey } from "@/lib/survey.functions";

export const Route = createFileRoute("/survey")({
  validateSearch: (s: Record<string, unknown>) => z.object({ src: z.string().max(40).optional(), lang: z.enum(["en", "ar"]).optional() }).parse(s),
  head: () => infoHead("Two-minute survey", "Help us understand how buyers, suppliers and contractors in the Gulf protect their payments today. Anonymous, 12 short questions."),
  component: SurveyPage,
});

type Answers = Partial<Record<SurveyField, string | string[]>>;

function SurveyPage() {
  const { text, locale } = useLocale();
  const { src } = Route.useSearch();
  const send = useServerFn(submitSurvey);
  const [a, setA] = useState<Answers>({});
  const [comment, setComment] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [tried, setTried] = useState(false);
  const missing = SURVEY_QUESTIONS.filter((q) => { const v = a[q.id]; return !v || (Array.isArray(v) && v.length === 0); }).map((q) => q.id);
  const m = useMutation({
    mutationFn: () => send({ data: {
      lang: locale === "en" ? "en" : "ar", ...(a as any), comment, pilot_email: email,
      source: (src ?? "link").replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "link", website,
    } }),
  });
  const pick = (q: (typeof SURVEY_QUESTIONS)[number], key: string) => setA((p) => {
    if (!q.multi) return { ...p, [q.id]: key };
    const cur = (p[q.id] as string[] | undefined) ?? [];
    let next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
    if (key === "none" && next.includes("none")) next = ["none"]; else next = next.filter((k) => k !== "none" || key === "none");
    return { ...p, [q.id]: next };
  });

  if (m.isSuccess) return (
    <SiteShell>
      <section key="done" data-no-localize className="mx-auto max-w-2xl px-4 py-20 text-center">
        <CheckCircle2 className="mx-auto size-12 text-primary" aria-hidden />
        <h1 className="mt-5 text-3xl font-bold">{text("Thank you", "شكراً لك")}</h1>
        <p className="mt-3 leading-8 text-muted-foreground">{text("Your answers were saved. They help us build a fairer way to pay people you have not dealt with before.", "حُفظت إجاباتك. تساعدنا على بناء طريقة أعدل للدفع لأطراف لم تتعامل معها من قبل.")}</p>
      </section>
    </SiteShell>
  );

  return (
    <SiteShell>
      <section key="form" data-no-localize className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
        <p className="text-sm font-semibold text-primary">{text("Insight survey", "استبيان إنسايت")}</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">{text("How do you protect your payments?", "كيف تحمي مدفوعاتك؟")}</h1>
        <p className="mt-3 leading-8 text-muted-foreground">{text("Twelve short questions, about three minutes. Anonymous: we do not ask for your name. Results are used only as totals.", "اثنا عشر سؤالاً قصيراً، ثلاث دقائق تقريباً. بدون اسم، ونستخدم النتائج كمجاميع فقط.")}</p>
        <form className="mt-8 space-y-5" onSubmit={(e) => { e.preventDefault(); setTried(true); if (missing.length === 0) m.mutate(); }}>
          {SURVEY_QUESTIONS.map((q, i) => {
            const v = a[q.id]; const bad = tried && missing.includes(q.id);
            return (
              <Card key={q.id} className={bad ? "border-destructive" : ""}>
                <CardContent className="p-5">
                  <fieldset>
                    <legend className="font-semibold leading-7"><span className="text-muted-foreground">{i + 1}. </span>{text(q.en, q.ar)}</legend>
                    <div className="mt-3 grid gap-2">
                      {q.options.map(([key, en, ar]) => {
                        const on = Array.isArray(v) ? v.includes(key) : v === key;
                        return (
                          <label key={key} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${on ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"}`}>
                            <input type={q.multi ? "checkbox" : "radio"} name={q.id} className="size-4 accent-[hsl(var(--primary))]" checked={on} onChange={() => pick(q, key)} />
                            <span>{text(en, ar)}</span>
                          </label>
                        );
                      })}
                    </div>
                    {bad && <p className="mt-2 text-sm text-destructive">{text("Please choose an answer.", "يرجى اختيار إجابة.")}</p>}
                  </fieldset>
                </CardContent>
              </Card>
            );
          })}
          <Card><CardContent className="space-y-4 p-5">
            <div>
              <Label htmlFor="sv-comment">{text("Anything else? (optional)", "أي شيء آخر؟ (اختياري)")}</Label>
              <Textarea id="sv-comment" className="mt-2" maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="sv-email">{text("Email, if you would like to try Insight early (optional)", "بريدك إن أردت تجربة إنسايت مبكراً (اختياري)")}</Label>
              <Input id="sv-email" type="email" dir="ltr" className="mt-2" maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} />
              <p className="mt-1 text-xs text-muted-foreground">{text("Used only to invite you to the pilot, never shared.", "يُستخدم فقط لدعوتك للتجربة ولا يُشارك مع أحد.")}</p>
            </div>
            <input aria-hidden tabIndex={-1} autoComplete="off" className="hidden" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" />
          </CardContent></Card>
          {tried && missing.length > 0 && <p role="alert" className="text-sm text-destructive">{text(`${missing.length} question(s) still need an answer.`, `بقي ${missing.length} سؤال بلا إجابة.`)}</p>}
          {m.isError && <p role="alert" className="text-sm text-destructive">{(m.error as Error).message}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={m.isPending}>{m.isPending ? text("Sending…", "جارٍ الإرسال…") : text("Send my answers", "أرسل إجاباتي")}</Button>
        </form>
      </section>
    </SiteShell>
  );
}
