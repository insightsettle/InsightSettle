export type DealStatus =
  "pending_funding" | "held" | "delivered" | "under_review" | "released" | "refunded" | "disputed";

export const statusLabels: Record<DealStatus, string> = {
  pending_funding: "Pending funding",
  held: "Funds held",
  delivered: "Delivered",
  under_review: "Under review",
  released: "Released",
  refunded: "Refunded",
  disputed: "Disputed",
};

export const statusTone: Record<DealStatus, "muted" | "primary" | "warning" | "destructive"> = {
  pending_funding: "muted",
  held: "primary",
  delivered: "primary",
  under_review: "warning",
  released: "primary",
  refunded: "warning",
  disputed: "destructive",
};

export type Stage = {
  name: string;
  amount: number;
  status: DealStatus;
};

export type TimelineEvent = {
  title: string;
  at: string;
  note?: string;
};

export type Deal = {
  id: string;
  title: string;
  description: string;
  amount: number;
  buyer: string;
  seller: string;
  role: "buyer" | "seller";
  status: DealStatus;
  createdAt: string;
  dueAt: string;
  stages: Stage[];
  timeline: TimelineEvent[];
  attachments: { name: string; size: string }[];
  messages: { from: string; at: string; body: string }[];
  actionRequired?: string;
};

/** Fee model from the design document (sample data) */
export const feeTiers = [
  { from: 0, to: 5000, rate: 0.03, min: 15, label: "Up to SAR 5,000" },
  { from: 5001, to: 50000, rate: 0.025, min: 0, label: "SAR 5,001 to 50,000" },
  { from: 50001, to: Infinity, rate: 0.018, min: 0, label: "Above SAR 50,000" },
];

export function calcFee(amount: number) {
  const tier = feeTiers.find((t) => amount >= t.from && amount <= t.to) ?? feeTiers[0];
  if (!tier)
    return { fee: 0, rate: 0, tier: { from: 0, to: 0, rate: 0, min: 0, label: "Unavailable" } };
  const fee = Math.max(amount * tier.rate, tier.min);
  return { fee: Math.round(fee * 100) / 100, rate: tier.rate, tier };
}

export function formatSAR(amount: number) {
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(iso));
}
