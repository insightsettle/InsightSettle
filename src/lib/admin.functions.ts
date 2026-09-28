import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const dealStatuses = [
  "pending_funding",
  "held",
  "delivered",
  "under_review",
  "released",
  "refunded",
  "disputed",
] as const;

async function assertStaff(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw error;
  if (data !== true) throw new Error("Forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type PlatformUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  verificationStatus: string;
  accountState?: string;
  createdAt: string;
  lastSignInAt: string | null;
  isStaff: boolean;
  dealCount: number;
  dealValue: number;
};

export const listPlatformUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlatformUser[]> => {
    const admin = await assertStaff(context);
    const { data: authData, error: authError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (authError) throw authError;
    const { data: profiles } = await admin.from("profiles").select("*");
    const { data: roles } = await admin.from("user_roles").select("user_id, role");
    const { data: deals } = await admin.from("deals").select("buyer_id, seller_id, amount");

    return authData.users.map((u) => {
      const profile = profiles?.find((p) => p.id === u.id);
      const mine = (deals ?? []).filter((d) => d.buyer_id === u.id || d.seller_id === u.id);
      return {
        id: u.id,
        email: u.email ?? null,
        fullName: profile?.full_name ?? (u.user_metadata?.["full_name"] as string) ?? null,
        phone: profile?.phone ?? null,
        verificationStatus: profile?.verification_status ?? "pending",
        accountState: (profile as { account_state?: string } | undefined)?.account_state ?? "active",
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        isStaff: (roles ?? []).some((r) => r.user_id === u.id && r.role === "admin"),
        dealCount: mine.length,
        dealValue: mine.reduce((s, d) => s + Number(d.amount), 0),
      };
    });
  });

export const setVerificationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; status: string }) =>
    z
      .object({ userId: z.string().uuid(), status: z.enum(["pending", "verified", "rejected"]) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await assertStaff(context);
    const { error } = await admin
      .from("profiles")
      .update({ verification_status: data.status })
      .eq("id", data.userId);
    if (error) throw error;
    return { ok: true };
  });

export const setStaffRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; isStaff: boolean }) =>
    z.object({ userId: z.string().uuid(), isStaff: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await assertStaff(context);
    if (data.isStaff) {
      const { error } = await admin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw error;
    } else {
      const { error } = await admin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
      if (error) throw error;
    }
    return { ok: true };
  });

export type AdminDeal = {
  id: string;
  ref: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  dueAt: string | null;
  createdByName: string | null;
  createdByEmail: string | null;
  buyerName: string | null;
  buyerEmail: string | null;
  sellerName: string | null;
  sellerEmail: string | null;
  counterpartyEmail: string | null;
  feeOverridePercent: number | null;
  feeOverrideFlat: number | null;
  feeOverrideNote: string | null;
  disputedReason: string | null;
  frozen?: boolean;
};

type Directory = Map<string, { name: string | null; email: string | null }>;

async function buildDirectory(admin: any): Promise<Directory> {
  const { data: authData } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const { data: profiles } = await admin.from("profiles").select("id, full_name");
  const map: Directory = new Map();
  for (const u of authData?.users ?? []) {
    const profile = profiles?.find((p: { id: string }) => p.id === u.id);
    map.set(u.id, {
      name: profile?.full_name ?? (u.user_metadata?.["full_name"] as string) ?? null,
      email: u.email ?? null,
    });
  }
  return map;
}

function mapDeal(row: any, dir: Directory): AdminDeal {
  const who = (id: string | null) => (id ? dir.get(id) : undefined);
  return {
    id: row.id,
    ref: row.ref,
    title: row.title,
    description: row.description ?? "",
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    createdAt: row.created_at,
    dueAt: row.due_at ?? null,
    createdByName: who(row.created_by)?.name ?? null,
    createdByEmail: who(row.created_by)?.email ?? null,
    buyerName: who(row.buyer_id)?.name ?? null,
    buyerEmail: who(row.buyer_id)?.email ?? null,
    sellerName: who(row.seller_id)?.name ?? null,
    sellerEmail: who(row.seller_id)?.email ?? null,
    counterpartyEmail: row.counterparty_email ?? null,
    feeOverridePercent: row.fee_override_percent === null ? null : Number(row.fee_override_percent),
    feeOverrideFlat: row.fee_override_flat === null ? null : Number(row.fee_override_flat),
    feeOverrideNote: row.fee_override_note ?? null,
    disputedReason: row.disputed_reason ?? null,
    frozen: !!row.frozen,
  };
}

export const listAllDeals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminDeal[]> => {
    const admin = await assertStaff(context);
    const dir = await buildDirectory(admin);
    const { data, error } = await admin
      .from("deals")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row: any) => mapDeal(row, dir));
  });

export const getDealForStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ref: string }) => z.object({ ref: z.string().min(3) }).parse(input))
  .handler(async ({ data, context }) => {
    const admin = await assertStaff(context);
    const dir = await buildDirectory(admin);
    const { data: row, error } = await admin
      .from("deals")
      .select("*")
      .eq("ref", data.ref)
      .maybeSingle();
    if (error) throw error;
    if (!row) return null;
    const { data: events } = await admin
      .from("deal_events")
      .select("*")
      .eq("deal_id", row.id)
      .order("created_at", { ascending: true });
    const { data: messages } = await admin
      .from("deal_messages")
      .select("*")
      .eq("deal_id", row.id)
      .order("created_at", { ascending: true });
    return {
      deal: mapDeal(row, dir),
      events: (events ?? []).map((e: any) => ({
        id: e.id,
        title: e.title,
        note: e.note ?? null,
        createdAt: e.created_at,
        actorName: e.actor_id ? (dir.get(e.actor_id)?.name ?? null) : null,
      })),
      messages: (messages ?? []).map((m: any) => ({
        id: m.id,
        body: m.body,
        authorName: m.author_name,
        authorKind: m.author_kind,
        createdAt: m.created_at,
      })),
    };
  });

export const setDealStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { dealId: string; status: string; reason: string }) =>
    z
      .object({
        dealId: z.string().uuid(),
        status: z.enum(dealStatuses),
        reason: z.string().min(3).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await assertStaff(context);
    const { error } = await admin
      .from("deals")
      .update({
        status: data.status,
        ...(data.status === "released" ? { released_at: new Date().toISOString() } : {}),
        ...(data.status === "disputed" ? { disputed_reason: data.reason } : {}),
      })
      .eq("id", data.dealId);
    if (error) throw error;
    await admin.from("deal_events").insert({
      deal_id: data.dealId,
      actor_id: context.userId,
      title: `Insight support set the status to ${data.status.replace("_", " ")}`,
      note: data.reason,
    });
    const notify = await import("@/lib/notify.server");
    await notify.notifyDealParties(admin, data.dealId, {
      title: `Deal status changed to ${data.status.replace("_", " ")}`,
      body: data.reason,
      kind: "status",
    });
    return { ok: true };
  });

export const setFeeOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { dealId: string; percent: number | null; flat: number | null; note: string | null }) =>
      z
        .object({
          dealId: z.string().uuid(),
          percent: z.number().min(0).max(20).nullable(),
          flat: z.number().min(0).nullable(),
          note: z.string().max(400).nullable(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await assertStaff(context);
    const { error } = await admin
      .from("deals")
      .update({
        fee_override_percent: data.percent,
        fee_override_flat: data.flat,
        fee_override_note: data.note,
        fee_override_by: context.userId,
      })
      .eq("id", data.dealId);
    if (error) throw error;
    await admin.from("deal_events").insert({
      deal_id: data.dealId,
      actor_id: context.userId,
      title:
        data.percent === null && data.flat === null
          ? "Insight support removed the special fee offer"
          : "Insight support applied a special fee offer",
      note: data.note,
    });
    return { ok: true };
  });

export const postStaffMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { dealId: string; body: string }) =>
    z.object({ dealId: z.string().uuid(), body: z.string().min(1).max(2000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await assertStaff(context);
    const { error } = await admin.from("deal_messages").insert({
      deal_id: data.dealId,
      author_id: context.userId,
      author_name: "Insight support",
      author_kind: "staff",
      body: data.body,
    });
    if (error) throw error;
    const notify = await import("@/lib/notify.server");
    await notify.notifyDealParties(admin, data.dealId, {
      title: "New message from Insight support",
      body: data.body.slice(0, 200),
      kind: "message",
    });
    return { ok: true };
  });

export type RiskDeal = {
  id: string;
  ref: string;
  title: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  buyer: string;
  seller: string;
  disputedReason: string | null;
  messages: string[];
  riskLevel: string | null;
  riskScore: number | null;
  riskSummary: string | null;
  riskCheckedAt: string | null;
};

/** Deals plus their conversation, for AI risk review in the console. */
export const listDealsForRisk = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RiskDeal[]> => {
    const admin = await assertStaff(context);
    const dir = await buildDirectory(admin);
    const { data: deals, error } = await admin
      .from("deals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) throw error;
    const ids = (deals ?? []).map((d: any) => d.id);
    const { data: messages } = ids.length
      ? await admin
          .from("deal_messages")
          .select("deal_id, author_name, body, created_at")
          .in("deal_id", ids)
          .order("created_at", { ascending: true })
      : { data: [] };

    return (deals ?? []).map((row: any) => {
      const who = (id: string | null) => (id ? dir.get(id) : undefined);
      return {
        id: row.id,
        ref: row.ref,
        title: row.title,
        amount: Number(row.amount),
        currency: row.currency,
        status: row.status,
        createdAt: row.created_at,
        buyer: who(row.buyer_id)?.email ?? "not joined",
        seller: who(row.seller_id)?.email ?? "not joined",
        disputedReason: row.disputed_reason ?? null,
        messages: (messages ?? [])
          .filter((m: any) => m.deal_id === row.id)
          .slice(-20)
          .map((m: any) => `${m.author_name}: ${String(m.body).slice(0, 600)}`),
        riskLevel: row.risk_level ?? null,
        riskScore: row.risk_score === null ? null : Number(row.risk_score),
        riskSummary: row.risk_summary ?? null,
        riskCheckedAt: row.risk_checked_at ?? null,
      };
    });
  });

export const setDealRisk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { dealId: string; level: "low" | "medium" | "high"; score: number; summary: string }) =>
      z
        .object({
          dealId: z.string().uuid(),
          level: z.enum(["low", "medium", "high"]),
          score: z.number().min(0).max(100),
          summary: z.string().max(4000),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await assertStaff(context);
    const { error } = await admin
      .from("deals")
      .update({
        risk_level: data.level,
        risk_score: Math.round(data.score),
        risk_summary: data.summary,
        risk_checked_at: new Date().toISOString(),
      })
      .eq("id", data.dealId);
    if (error) throw error;
    await admin.from("deal_events").insert({
      deal_id: data.dealId,
      actor_id: context.userId,
      title: `Insight flagged this deal as ${data.level} risk`,
      note: null,
    });
    return { ok: true };
  });

export const getPlatformSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertStaff(context);
    const { count: userCount } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true });
    const { data: deals } = await admin.from("deals").select("amount, status");
    const { count: pendingKyc } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "pending");
    return {
      userCount: userCount ?? 0,
      pendingKyc: pendingKyc ?? 0,
      dealCount: deals?.length ?? 0,
      dealVolume: (deals ?? []).reduce((s, d) => s + Number(d.amount), 0),
      disputed: (deals ?? []).filter((d) => d.status === "disputed").length,
    };
  });

async function emailMap(db: any) {
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
  const map: Record<string, string> = {};
  for (const u of data?.users ?? []) map[u.id] = u.email ?? u.id;
  return map;
}

export const listAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await assertStaff(context);
    const { data, error } = await db
      .from("audit_logs")
      .select("id,user_id,action,entity,entity_id,old_value,new_value,created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    const emails = await emailMap(db);
    return (data ?? []).map((r: any) => ({
      id: r.id as string,
      actor: r.user_id ? (emails[r.user_id] ?? r.user_id) : "System",
      action: r.action as string,
      entity: r.entity as string,
      entityId: (r.entity_id as string | null) ?? "",
      change: JSON.stringify(r.new_value ?? r.old_value ?? {}),
      createdAt: r.created_at as string,
    }));
  });

export const getReportData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await assertStaff(context);
    const [{ data: deals, error: e1 }, { data: tx, error: e2 }] = await Promise.all([
      db.from("deals").select("ref,title,amount,currency,status,buyer_id,seller_id,created_at,released_at").order("created_at", { ascending: false }),
      db.from("deal_transactions").select("kind,amount,fee,currency,status,created_at"),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;
    const emails = await emailMap(db);
    const months: Record<string, { month: string; volume: number; fees: number; count: number }> = {};
    for (const t of tx ?? []) {
      if (t.status !== "succeeded") continue;
      const m = String(t.created_at).slice(0, 7);
      months[m] ??= { month: m, volume: 0, fees: 0, count: 0 };
      if (t.kind === "payment") months[m].volume += Number(t.amount);
      months[m].fees += Number(t.fee);
      months[m].count += 1;
    }
    return {
      deals: (deals ?? []).map((d: any) => ({
        ref: d.ref, title: d.title, amount: Number(d.amount), currency: d.currency, status: d.status,
        buyer: d.buyer_id ? (emails[d.buyer_id] ?? "") : "", seller: d.seller_id ? (emails[d.seller_id] ?? "") : "",
        createdAt: d.created_at, releasedAt: d.released_at ?? "",
      })),
      revenue: Object.values(months).sort((a, b) => b.month.localeCompare(a.month)),
    };
  });
