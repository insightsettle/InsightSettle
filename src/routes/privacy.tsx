import { createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy policy | Insight" },
      {
        name: "description",
        content:
          "What personal data Insight collects, why it is needed, how long it is kept, and your rights over it.",
      },
      { property: "og:title", content: "Insight privacy policy" },
      { property: "og:description", content: "How Insight handles your personal data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrivacyPage,
});

const sections = [
  {
    h: "What we collect",
    p: "Account details (name, email, phone), identity or business documents you upload for verification, deal content you enter, messages exchanged inside a deal, and technical records such as sign-in times needed to keep the account secure.",
  },
  {
    h: "Why we use it",
    p: "To operate escrow deals, verify identities, prevent fraud and money laundering, resolve disputes, meet legal record-keeping duties, and send notifications about your deals.",
  },
  {
    h: "Who can see it",
    p: "The other party in a deal sees the deal content and messages, not your identity documents. Identity documents can be opened only by you and the Insight review team. Service providers that process payments or store data see only what they need to provide that service.",
  },
  {
    h: "How it is protected",
    p: "Data is encrypted in transit and at rest, documents are stored in a private area with per-account access rules, and staff access is limited to the team handling verification and disputes.",
  },
  {
    h: "How long we keep it",
    p: "Deal and payment records are retained for the period required by financial record-keeping rules. Verification documents are kept for the same period and then deleted.",
  },
  {
    h: "Your rights",
    p: "You can request a copy of your data, correct inaccurate details, or ask for deletion once you have no open deals and the legal retention period has passed.",
  },
  {
    h: "Cookies",
    p: "We use only the cookies needed to keep you signed in and to keep the service secure. We do not sell your data or use it for third-party advertising.",
  },
];

function PrivacyPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-14">
        <h1 className="text-4xl font-extrabold">Privacy policy</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We collect the minimum needed to hold money safely and prove who is on each side of a deal.
        </p>
        <div className="mt-8 space-y-7">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-lg font-bold">{s.h}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.p}</p>
            </section>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
