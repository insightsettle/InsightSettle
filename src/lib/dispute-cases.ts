/** Dispute queue (sample data) used by the platform console. */
export type DisputeStage = "ai_review" | "awaiting_response" | "escalated" | "resolved";

export type DisputeCase = {
  id: string;
  dealId: string;
  dealTitle: string;
  amount: number;
  buyer: string;
  seller: string;
  reason: string;
  openedAt: string;
  stage: DisputeStage;
  aiRecommendation: string;
  arbitrator?: string;
  resolution?: string;
};

export const disputeStageLabels: Record<DisputeStage, string> = {
  ai_review: "AI mediation window",
  awaiting_response: "Awaiting party response",
  escalated: "Dispute review",
  resolved: "Resolved",
};

const iso = (daysAgo: number) =>
  new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 19).replace("T", " ");

export const disputeCases: DisputeCase[] = [
  {
    id: "DS-4410",
    dealId: "DL-10355",
    dealTitle: "Purchase of used camera equipment",
    amount: 4200,
    buyer: "Faisal Alharbi",
    seller: "Al-Daw Studio",
    reason: "Item differs from the listing",
    openedAt: iso(1),
    stage: "ai_review",
    aiRecommendation: "Partial refund of 25% and buyer keeps the equipment.",
  },
  {
    id: "DS-4398",
    dealId: "DL-10391",
    dealTitle: "Appointment booking application",
    amount: 62000,
    buyer: "Safa Clinic",
    seller: "Binyah Technology",
    reason: "Delivery delayed beyond the agreed date",
    openedAt: iso(2),
    stage: "awaiting_response",
    aiRecommendation: "Review the delayed admin area and the delivery terms before recommending a decision.",
  },
  {
    id: "DS-4371",
    dealId: "DL-10428",
    dealTitle: "Brand identity for an online store",
    amount: 18000,
    buyer: "Raffa Store",
    seller: "Noon Studio",
    reason: "Scope disagreement on revisions",
    openedAt: iso(5),
    stage: "escalated",
    arbitrator: "Insight dispute review",
    aiRecommendation: "Evidence is balanced; further dispute review is required.",
  },
  {
    id: "DS-4355",
    dealId: "DL-10302",
    dealTitle: "Marketing content — 20 articles",
    amount: 9600,
    buyer: "Tajr Platform",
    seller: "Dana Alotaibi",
    reason: "Quality below the agreed brief",
    openedAt: iso(12),
    stage: "resolved",
    aiRecommendation: "Seller reworks 4 articles within 5 days.",
    resolution: "Resolved in the AI mediation window.",
  },
];
