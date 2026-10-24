import { createFileRoute } from "@tanstack/react-router";

import { InfoPage, infoHead } from "@/components/site/InfoPage";

export const Route = createFileRoute("/for-suppliers")({
  head: () => infoHead("For suppliers", "Ship with confidence: you see the buyer's payment confirmed by the payment provider before you send anything."),
  component: () => (
    <InfoPage
      eyebrow="For suppliers"
      title="Ship only after the payment is confirmed"
      intro="Accept, negotiate or reject each request. You see the payment provider's confirmation before you ship, and at launch the provider pays out to your verified GCC bank account. In this demo the provider is simulated."
      sections={[
        { h: "Review every request", p: "See the buyer, product, amount, currency, delivery terms and inspection period. Accept, request changes or reject." },
        { h: "Proof of shipment", p: "Add the carrier, tracking number, shipment date, estimated delivery and shipping documents so the buyer can't dispute without evidence." },
        { h: "Automatic release", p: "When the inspection period ends without a dispute, Insight instructs the payment provider to pay out automatically." },
        { h: "Settlement to your IBAN", p: "Add a Saudi, UAE, Bahraini, Qatari, Kuwaiti or Omani IBAN. Every payout is recorded in the ledger with a reference." },
      ]}
    />
  ),
});
