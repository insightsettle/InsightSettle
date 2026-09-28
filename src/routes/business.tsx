import { createFileRoute } from "@tanstack/react-router";

import { InfoPage, infoHead } from "@/components/site/InfoPage";

export const Route = createFileRoute("/business")({
  head: () => infoHead("Insight Business", "Protected supplier payments for Gulf companies, with tax invoices and full records."),
  component: () => (
    <InfoPage
      eyebrow="Insight Business"
      title="Protected supplier payments for companies"
      intro="Register your company with its commercial registration and VAT number, and run every cross-border supplier payment through a documented, protected process."
      sections={[
        { h: "Verified company profile", p: "Commercial registration, VAT number, authorised person and settlement account, reviewed by the Insight compliance team." },
        { h: "Tax invoices", p: "A simplified tax invoice with a ZATCA QR code is issued for the Insight fee on every completed deal." },
        { h: "Full records", p: "Every term version, message, file and payment movement is kept with a timestamp for audits and disputes." },
        { h: "Coming next", p: "Team members, approval workflows, spending limits, supplier management and accounting/ERP connections." },
      ]}
    />
  ),
});
