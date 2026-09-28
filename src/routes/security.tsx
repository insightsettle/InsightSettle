import { createFileRoute } from "@tanstack/react-router";

import { InfoPage, infoHead } from "@/components/site/InfoPage";

export const Route = createFileRoute("/security")({
  head: () => infoHead("Security", "How Insight protects your money, identity and deal records."),
  component: () => (
    <InfoPage
      eyebrow="Security"
      title="Built so money can't move by mistake"
      intro="Insight doesn't hold customer money itself. Funds are secured and settled by licensed payment providers; Insight manages the agreement, the evidence and the release rules."
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
