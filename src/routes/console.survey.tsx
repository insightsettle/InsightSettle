import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { useLocale } from "@/lib/locale";
import { getSurveyResults } from "@/lib/survey.functions";

export const Route = createFileRoute("/console/survey")({
  head: () => ({ meta: [
    { title: "Market survey | Insight staff console" },
    { name: "description", content: "Totals from the public market survey." },
    { property: "og:title", content: "Market survey | Insight" },
    { property: "og:description", content: "Survey results for staff." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: SurveyResults,
});

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleString("en-GB", { timeZone: "Asia/Riyadh", dateStyle: "medium", timeStyle: "short" }) : "—");

function SurveyResults() {
  const { text } = useLocale();
  const get = useServerFn(getSurveyResults);
  const q = useQuery({ queryKey: ["survey-results"], queryFn: () => get(), refetchInterval: 60_000 });
  const link = "https://insightsettle.com/survey";
  return (
    <div data-no-localize className="mt-6 min-w-0">
      <h2 className="text-2xl font-bold">{text("Market survey", "استبيان السوق")}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {text("Public link: ", "الرابط العام: ")}<a className="font-medium text-primary underline" dir="ltr" href={link} target="_blank" rel="noreferrer">{link}</a>
        {text(" — add ?src=whatsapp (or any label) to see where answers came from.", " — أضف ‎?src=whatsapp‎ (أو أي وسم) لمعرفة مصدر الإجابات.")}
      </p>
      {q.isPending && <p className="mt-6">{text("Loading…", "جارٍ التحميل…")}</p>}
      {q.isError && <p role="alert" className="mt-6 text-destructive">{(q.error as Error).message}</p>}
      {q.data && (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            {[[text("Responses (n)", "عدد الإجابات (n)"), String(q.data.n)], [text("Want the pilot", "يريدون التجربة"), String(q.data.pilot)],
              [text("First", "الأولى"), fmtDate(q.data.first)], [text("Latest", "الأحدث"), fmtDate(q.data.last)]].map(([k, v]) => (
              <div key={k} className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{k}</p><p className="mt-1 text-xl font-bold">{v}</p></div>
            ))}
          </div>
          {q.data.bySource.length > 0 && <p className="mt-3 text-xs text-muted-foreground">{text("By source: ", "حسب المصدر: ")}{q.data.bySource.map(([s, c]) => `${s} ${c}`).join(" · ")}</p>}
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {q.data.questions.map((qq, i) => {
              const total = q.data.n || 1;
              return (
                <section key={qq.id} className="rounded-xl border bg-card p-5">
                  <h3 className="font-semibold leading-7">{i + 1}. {text(qq.en, qq.ar)}</h3>
                  {qq.multi && <p className="text-xs text-muted-foreground">{text("Several answers allowed; % of respondents.", "يُسمح بأكثر من إجابة؛ النسبة من عدد المشاركين.")}</p>}
                  <ul className="mt-3 space-y-2">
                    {qq.options.map((o) => {
                      const pct = Math.round((o.count / total) * 100);
                      return (
                        <li key={o.key} className="text-sm">
                          <div className="flex justify-between gap-3"><span>{text(o.en, o.ar)}</span><span className="tabular-nums text-muted-foreground" dir="ltr">{o.count} · {q.data.n ? pct : 0}%</span></div>
                          <div className="mt-1 h-2 rounded-full bg-secondary"><div className="h-2 rounded-full bg-primary" style={{ width: `${q.data.n ? pct : 0}%` }} /></div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
          <section className="mt-6 rounded-xl border bg-card p-5">
            <h3 className="font-semibold">{text("Comments", "التعليقات")}</h3>
            {q.data.comments.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{text("No comments yet.", "لا توجد تعليقات بعد.")}</p> : (
              <ul className="mt-3 space-y-3">{q.data.comments.map((c, i) => <li key={i} className="border-b pb-3 text-sm last:border-0"><p dir="auto" className="leading-7">{c.text}</p><p className="mt-1 text-xs text-muted-foreground">{c.respondent} · {c.country} · {fmtDate(c.at)}</p></li>)}</ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
