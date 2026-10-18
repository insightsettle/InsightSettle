import { createFileRoute } from "@tanstack/react-router";

import { InfoPage, infoHead } from "@/components/site/InfoPage";

export const Route = createFileRoute("/security")({
  head: () => infoHead("Security", "How a licensed payment provider will hold funds at launch, and how Insight protects identity and deal records."),
  component: () => (
    <InfoPage
      eyebrow="Security"
      title="Built so money can't move by mistake"
      intro="Escrow demo. The payment provider is simulated and no real money moves. At launch, funds will be held by a licensed payment provider; Insight runs the deal rules and keeps the record."
      sections={[
        { h: "Licensed providers", p: "Payments go through a regulated payment provider. Card details are tokenised by the provider and never stored by Insight." },
        { h: "Strict deal rules", p: "Deal status can only move in the allowed order, core terms can't change after payment is secured, and a dispute freezes release immediately." },
        { h: "No double payments", p: "Each payment carries a unique key, so pressing Pay twice never charges twice." },
        { h: "Complete audit trail", p: "Every change to deals, payments, identity documents and roles is logged with the old and new value. Logs can't be deleted." },
        { h: "Protected accounts", p: "Encrypted connections and storage, private document storage, and mandatory two-step verification for Insight staff." },
        { h: "Your data", p: "Handled under the Saudi Personal Data Protection Law (PDPL). You can request a copy or deletion of your data." },
      ]}
    />
  ),
});
