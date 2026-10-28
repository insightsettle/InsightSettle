import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildCard, type MemberCard } from "@/lib/member-card";

/** The signed-in customer's member card, computed from their own deals. */
export const getMyCard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MemberCard> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const uid = context.userId;
    const [{ data: p }, { data: deals }] = await Promise.all([
      db.from("profiles").select("full_name, verification_status, created_at").eq("id", uid).maybeSingle(),
      db.from("deals").select("id, amount, currency, status, buyer_id, seller_id, retention_released_at").or(`buyer_id.eq.${uid},seller_id.eq.${uid}`).limit(2000),
    ]);
    const ids = (deals ?? []).map((d: any) => d.id);
    const [{ data: ms }, { data: tx }] = ids.length ? await Promise.all([
      db.from("deal_milestones").select("deal_id, amount, funded_at, status, retention_amount").in("deal_id", ids),
      db.from("deal_transactions").select("deal_id, kind, status, amount, currency, created_at").in("deal_id", ids).eq("status", "succeeded").in("kind", ["funding", "release"]),
    ]) : [{ data: [] }, { data: [] }];
    return buildCard({
      userId: uid, name: String(p?.full_name ?? "").trim() || "Insight member", verified: p?.verification_status === "verified", since: p?.created_at ?? null,
      deals: (deals ?? []).map((d: any) => ({ ...d, amount: Number(d.amount) })),
      milestones: (ms ?? []).map((m: any) => ({ ...m, amount: Number(m.amount) })),
      fundedDealIds: new Set((tx ?? []).filter((t: any) => t.kind === "funding").map((t: any) => t.deal_id)),
      releases: (tx ?? []).filter((t: any) => t.kind === "release").map((t: any) => ({ deal_id: t.deal_id, amount: Number(t.amount), currency: t.currency, created_at: t.created_at })),
    });
  });
