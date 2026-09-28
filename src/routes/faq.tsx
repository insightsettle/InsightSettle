import { createFileRoute } from "@tanstack/react-router";

import { InfoPage, infoHead } from "@/components/site/InfoPage";

export const Route = createFileRoute("/faq")({
  head: () => infoHead("FAQ", "Answers to common questions about Insight escrow payments in Saudi Arabia and the Gulf."),
  component: () => (
    <InfoPage
      eyebrow="FAQ"
      title="Frequently asked questions"
      intro="Short answers about payments, currencies, fees and disputes."
      sections={[
        { h: "Who holds my money?", p: "A licensed payment provider. Insight tells it when to release or refund, based on the agreed terms." },
        { h: "Which currencies are supported?", p: "Saudi riyal, UAE dirham, Bahraini dinar, Qatari riyal, Kuwaiti dinar and Omani rial, plus USD, EUR and GBP." },
        { h: "How are fees charged?", p: "A percentage of the deal value with a minimum and a cap, plus VAT on the fee. Choose whether the buyer, the seller, or both pay it." },
        { h: "How long is the inspection period?", p: "Agreed per deal, usually 2–7 days. If no dispute is opened in time, the funds release automatically (unless auto-release is off)." },
        { h: "Can I cancel?", p: "Before payment: yes, instantly. After payment but before shipping: under the agreed cancellation terms. After shipping or during a dispute: no." },
        { h: "What happens in a dispute?", p: "The funds are frozen, the other side has 48 hours to respond, both add evidence within 72 hours, and Insight decides within 7 days." },
      ]}
    />
  ),
});
