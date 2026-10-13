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

export const deals: Deal[] = [
  {
    id: "DL-10428",
    title: "Brand identity for an online store",
    description:
      "Logo, brand guide, and social templates delivered under the agreed scope with two revisions each.",
    amount: 18000,
    buyer: "Raffa Store",
    seller: "Noon Studio",
    role: "buyer",
    status: "under_review",
    createdAt: "2026-08-28",
    dueAt: "2026-09-25",
    stages: [
      { name: "Deliverable — Logo", amount: 6000, status: "released" },
      { name: "Deliverable — Brand guide", amount: 7000, status: "under_review" },
      { name: "Deliverable — Templates", amount: 5000, status: "pending_funding" },
    ],
    timeline: [
      { title: "Deal created", at: "2026-08-28 10:12" },
      { title: "Invitation accepted", at: "2026-08-28 13:40" },
      { title: "Payment funding recorded", at: "2026-08-29 09:05", note: "Sample data" },
      { title: "Provider payment release recorded", at: "2026-09-06 16:22" },
      { title: "Brand guide delivered", at: "2026-09-17 11:48", note: "4 files attached" },
    ],
    attachments: [
      { name: "brand-guide-v2.pdf", size: "4.2 MB" },
      { name: "logo-final.svg", size: "312 KB" },
    ],
    messages: [
      {
        from: "Noon Studio",
        at: "2026-09-17 11:50",
        body: "The brand guide is uploaded and ready for your review.",
      },
      {
        from: "Raffa Store",
        at: "2026-09-18 08:30",
        body: "I will review it today and confirm receipt.",
      },
    ],
    actionRequired: "Review the brand guide or request changes",
  },
  {
    id: "DL-10391",
    title: "Appointment booking application",
    description: "Deliver a working first release with an admin area and payment integration.",
    amount: 62000,
    buyer: "Safa Clinic",
    seller: "Binyah Technology",
    role: "seller",
    status: "held",
    createdAt: "2026-08-10",
    dueAt: "2026-10-01",
    stages: [{ name: "Full payment", amount: 62000, status: "held" }],
    timeline: [
      { title: "Deal created", at: "2026-08-10 09:00" },
      { title: "Both parties verified", at: "2026-08-11 12:10" },
      { title: "Deal funded", at: "2026-08-12 15:31", note: "Sample data" },
    ],
    attachments: [{ name: "scope-of-work.pdf", size: "1.1 MB" }],
    messages: [{ from: "Safa Clinic", at: "2026-09-12 14:00", body: "Can we add weekly reports?" }],
    actionRequired: "Confirm delivery before 1 October",
  },
  {
    id: "DL-10355",
    title: "Purchase of used camera equipment",
    description: "Camera and two lenses, subject to inspection on receipt.",
    amount: 4200,
    buyer: "Faisal Alharbi",
    seller: "Al-Daw Studio",
    role: "buyer",
    status: "disputed",
    createdAt: "2026-07-30",
    dueAt: "2026-09-10",
    stages: [{ name: "Full payment", amount: 4200, status: "disputed" }],
    timeline: [
      { title: "Deal funded", at: "2026-08-01 10:20", note: "Sample data" },
      { title: "Seller confirmed delivery", at: "2026-09-05 17:02" },
      {
        title: "Dispute opened",
        at: "2026-09-08 09:14",
        note: "Reason: item differs from listing",
      },
    ],
    attachments: [
      { name: "damage-photo-1.jpg", size: "2.4 MB" },
      { name: "shipping-receipt.pdf", size: "220 KB" },
    ],
    messages: [
      {
        from: "Faisal Alharbi",
        at: "2026-09-08 09:20",
        body: "The lens has scratches that were not disclosed.",
      },
      {
        from: "Al-Daw Studio",
        at: "2026-09-08 12:05",
        body: "The scratches are superficial and visible in the listing photos.",
      },
    ],
    actionRequired: "Submit dispute evidence for mediation",
  },
  {
    id: "DL-10302",
    title: "Marketing content — 20 articles",
    description: "Search-optimized Arabic content with language review.",
    amount: 9600,
    buyer: "Tajr Platform",
    seller: "Dana Alotaibi",
    role: "buyer",
    status: "released",
    createdAt: "2026-06-18",
    dueAt: "2026-07-20",
    stages: [{ name: "Full payment", amount: 9600, status: "released" }],
    timeline: [
      { title: "Deal funded", at: "2026-06-19 11:00", note: "Sample data" },
      { title: "Receipt confirmed", at: "2026-07-18 19:40" },
      { title: "Funds released", at: "2026-07-18 19:41" },
    ],
    attachments: [{ name: "articles-final.zip", size: "8.7 MB" }],
    messages: [],
  },
  {
    id: "DL-10465",
    title: "Office furniture",
    description: "Supply and install office furniture with a one-year warranty.",
    amount: 27500,
    buyer: "Ofuq Consulting",
    seller: "Rukn Furniture",
    role: "buyer",
    status: "pending_funding",
    createdAt: "2026-09-16",
    dueAt: "2026-10-12",
    stages: [
      { name: "Furniture supply", amount: 15000, status: "pending_funding" },
      { name: "Installation deliverable", amount: 12500, status: "pending_funding" },
    ],
    timeline: [{ title: "Deal created and invitation sent", at: "2026-09-16 08:45" }],
    attachments: [],
    messages: [],
    actionRequired: "Fund the deal to start delivery",
  },
];

export function getDeal(id: string) {
  return deals.find((d) => d.id === id);
}

export const dashboardStats = {
  available: 14250,
  held: deals
    .filter((d) => ["held", "delivered", "under_review", "disputed"].includes(d.status))
    .reduce((s, d) => s + d.amount, 0),
  activeDeals: deals.filter((d) => !["released", "refunded"].includes(d.status)).length,
  openDisputes: deals.filter((d) => d.status === "disputed").length,
};

export const activity = [
  { at: "2026-09-18 08:30", text: "New message in deal DL-10428", tone: "primary" as const },
  {
    at: "2026-09-17 11:48",
    text: "Brand guide delivered — DL-10428",
    tone: "primary" as const,
  },
  {
    at: "2026-09-16 08:45",
    text: "Deal DL-10465 created and invitation sent",
    tone: "muted" as const,
  },
  {
    at: "2026-09-08 09:14",
    text: "Dispute opened on deal DL-10355",
    tone: "destructive" as const,
  },
  {
    at: "2026-09-06 16:22",
    text: "SAR 6,000 released to seller — DL-10428",
    tone: "primary" as const,
  },
];

export const monthlyVolume = [
  { month: "April", value: 38000, fees: 950 },
  { month: "May", value: 52000, fees: 1300 },
  { month: "June", value: 46500, fees: 1160 },
  { month: "July", value: 71000, fees: 1600 },
  { month: "August", value: 88000, fees: 1980 },
  { month: "September", value: 61500, fees: 1420 },
];
