import { useLocale } from "@/lib/locale";
import { Link } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";

/** A string is translated through the shared dictionary; a pair gives the English and Arabic text directly. */
type Txt = string | readonly [string, string];
export type InfoSection = { h: Txt; p: Txt; points?: Txt[] };

export function InfoPage({ eyebrow, title, intro, sections }: { eyebrow: string; title: string; intro: string; sections: InfoSection[] }) {
  const { text: tr } = useLocale();
  const text = (v: Txt) => (typeof v === "string" ? tr(v) : tr(v[0], v[1]));
  return (
    <SiteShell>
      <div data-no-localize className="reveal mx-auto max-w-4xl px-4 py-14">
        <p className="text-sm font-semibold text-primary">{text(eyebrow)}</p>
        <h1 className="mt-2 text-4xl font-extrabold">{text(title)}</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">{text(intro)}</p>
        <div className="reveal mt-10 grid gap-6 sm:grid-cols-2">
          {sections.map((s) => (
            <section key={text(s.h)} className="lift rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold">{text(s.h)}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text(s.p)}</p>
              {s.points && (
                <ul className="mt-3 list-disc space-y-1 ps-5 text-sm">
                  {s.points.map((x) => (
                    <li key={text(x)}>{text(x)}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/auth" search={{ mode: "signup" }}>
              {tr("Create account", "إنشاء حساب")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/pricing">{tr("Fee calculator", "حاسبة الرسوم")}</Link>
          </Button>
        </div>
      </div>
    </SiteShell>
  );
}

export function infoHead(title: string, description: string) {
  return {
    meta: [
      { title: `${title} | Insight` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} | Insight` },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  };
}
