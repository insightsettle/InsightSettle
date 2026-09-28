import { createFileRoute } from "@tanstack/react-router";

import { InfoPage, infoHead } from "@/components/site/InfoPage";

export const Route = createFileRoute("/for-suppliers")({
  head: () => infoHead("For suppliers", "Ship with confidence: the buyer's payment is secured before you send anything."),
  component: () => (
    <InfoPage
      eyebrow="For suppliers"
      title="Ship only after the money is secured"
      intro="Accept, negotiate or reject each request. You see “Payment secured” before you ship, and settlement goes to your verified GCC bank account."
      sections={[
        { h: "Review every request", p: "See the buyer, product, amount, currency, delivery terms and inspection period. Accept, request changes or reject." },
        { h: "Proof of shipment", p: "Add the carrier, tracking number, shipment date, estimated delivery and shipping documents so the buyer can't dispute without evidence." },
        { h: "Automatic release", p: "When the inspection period ends without a dispute, the release starts automatically." },
        { h: "Settlement to your IBAN", p: "Add a Saudi, UAE, Bahraini, Qatari, Kuwaiti or Omani IBAN. Every payout is recorded in the ledger with a reference." },
      ]}
    />
  ),
});
