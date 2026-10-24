import { createFileRoute } from "@tanstack/react-router";

import { InfoPage, infoHead } from "@/components/site/InfoPage";

export const Route = createFileRoute("/for-buyers")({
  head: () => infoHead("For buyers", "Pay suppliers in the Gulf and abroad knowing your money is released only after you inspect and accept."),
  component: () => (
    <InfoPage
      eyebrow="For buyers"
      title="Pay only for what actually arrives"
      intro="At launch, your payment will be held by a licensed payment provider, never by Insight, and paid to the supplier only when you accept the delivery or the inspection period ends without a dispute. In this demo the provider is simulated."
      sections={[
        { h: "Agree the terms first", p: "Product, quantity, price, delivery date, inspection period, refund and cancellation conditions — every change is saved as a new version." },
        { h: "Locked exchange rate", p: "Buying from Bahrain, the UAE or abroad? Get a rate quote locked for 15 minutes and pay in riyals with the total shown up front." },
        { h: "Inspect before release", p: "Track the shipment, then inspect the item. Accept to release, or open a dispute with photos, videos and documents." },
        { h: "Disputes and refunds", p: "A dispute freezes the funds immediately. Insight reviews the evidence and decides a full refund, full release or a fair split.", points: ["Supplier response within 48 hours", "Evidence within 72 hours", "Decision within 7 days"] },
      ]}
    />
  ),
});
