import { Link } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";

export type InfoSection = { h: string; p: string; points?: string[] };

export function InfoPage({ eyebrow, title, intro, sections }: { eyebrow: string; title: string; intro: string; sections: InfoSection[] }) {
  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-4 py-14">
        <p className="text-sm font-semibold text-primary">{eyebrow}</p>
        <h1 className="mt-2 text-4xl font-extrabold">{title}</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">{intro}</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {sections.map((s) => (
            <section key={s.h} className="rounded-xl border border-border p-6">
              <h2 className="text-lg font-bold">{s.h}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.p}</p>
              {s.points && (
                <ul className="mt-3 list-disc space-y-1 ps-5 text-sm">
                  {s.points.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/auth" search={{ mode: "signup" }}>
              Create account
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/pricing">Fee calculator</Link>
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
