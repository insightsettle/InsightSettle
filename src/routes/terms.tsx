import { createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of service | Insight" },
      {
        name: "description",
        content: "The terms that govern using Insight escrow accounts, deals, fees and payouts.",
      },
      { property: "og:title", content: "Insight terms of service" },
      { property: "og:description", content: "Rights and obligations of buyers and sellers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TermsPage,
});

const sections = [
  {
    h: "1. About these terms",
    p: "These terms govern your use of the Insight escrow service. By creating an account or joining a deal you agree to them. If you use Insight on behalf of a company, you confirm you are authorised to bind it.",
  },
  {
    h: "2. Accounts and verification",
    p: "You must provide accurate information and keep your login credentials private. Insight may request identity or business documents before allowing you to fund, release or receive funds, and may limit an account until verification is complete.",
  },
  {
    h: "3. How a deal works",
    p: "A deal records the value, the description of what is delivered, who pays the escrow fee, the inspection period, and the delivery date. Both parties must accept the terms before funding. Once funded, neither party can move the money alone.",
  },
  {
    h: "4. Funding, release and refunds",
    p: "Funds are released to the seller when the buyer accepts delivery, when the agreed inspection period ends without action, or under a dispute decision. Refunds, whole or partial, are recorded against the deal with the reason.",
  },
  {
    h: "5. Fees",
    p: "The escrow fee is shown before the deal is funded and is charged to the party agreed in the deal. Currency conversion, where used, includes a margin shown in the final amount.",
  },
  {
    h: "6. Prohibited use",
    p: "Insight may not be used for illegal goods or services, sanctioned parties, money laundering, fraud, or any transaction we reasonably believe carries unacceptable risk. We may suspend a deal or an account for these reasons.",
  },
  {
    h: "7. Disputes",
    p: "Disputes are handled under the published dispute and refund policy. Insight reviews evidence supplied by both parties and records the decision; the payment provider handles any release or refund. Either party keeps the right to go to court.",
  },
  {
    h: "8. Liability",
    p: "At launch, funds will be held by a licensed payment provider; in this demo the provider is simulated and no real money moves. Insight runs the deal rules and keeps the record. We are not a party to the underlying commercial agreement, do not guarantee the quality of goods or services, and our liability is limited to the value of the funds held in the affected deal.",
  },
  {
    h: "9. Changes and termination",
    p: "We may update these terms and will notify account holders of material changes. You may close your account when you have no open deals.",
  },
  {
    h: "10. Contact",
    p: "For questions about these terms, use the note box on any deal or the contact details published on the Insight website.",
  },
];

function TermsPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-14">
        <h1 className="text-4xl font-extrabold">Terms of service</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Plain-language summary of the rules that apply to every Insight deal.
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
