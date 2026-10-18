import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getStaffAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isStaffUser } = await import("@/lib/staff-auth.server");
    return { isStaff: await isStaffUser(context) };
  });

export const getStaffAuctions = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireStaffAccess } = await import('@/lib/staff-auth.server');
    const db = await requireStaffAccess(context);
    async function read(table: string, columns: string, key: string = 'id') {
      const rows: any[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await (db as any).from(table).select(columns).order(key).range(offset, offset + 999);
        if (error) throw error;
        rows.push(...(data ?? []));
        if ((data ?? []).length < 1000) return rows;
      }
    }
    const [auctions,lots,bidders,profiles,payouts,deals] = await Promise.all([
      read('auctions','id,title,organiser_id,status,currency'),
      read('auction_lots','id,auction_id,title,owner_id,status,deal_id,funded_deal_id,owner_pct,organiser_pct'),
      read('lot_bidders','id,lot_id,rank,platform_handle,status,price,offered_at,deadline_at,deal_id'),
      read('profiles','id,full_name,verification_status'),
      read('payout_accounts','user_id','user_id'),
      read('deals','id,ref,status,amount,currency,auction_lot_id,cancelled_at'),
    ]);
    return { auctions,lots,bidders,profiles,payouts,deals: deals.filter(d=>d.auction_lot_id) };
  });

/** Read-only operational snapshot. Paginate so reconciliation never silently checks only 1,000 rows. */
export const getStaffOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireStaffAccess } = await import("@/lib/staff-auth.server");
    const db = await requireStaffAccess(context);
    const read = async (table: string, columns: string) => {
      const rows: any[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await (db as any).from(table).select(columns).order(table === "fx_rates" ? "code" : table === "business_profiles" ? "user_id" : "id").range(offset, offset + 999);
        if (error) throw error;
        rows.push(...(data ?? []));
        if ((data ?? []).length < 1000) return rows;
      }
    };
    const [deals, disputes, profiles, businesses, milestones, ledger, transactions, invoices, rates, evidence] = await Promise.all([
      read("deals", "id,ref,title,amount,currency,status,deal_type,supplier_country,delivery_country,created_at,auto_release_at,auto_release_enabled,frozen,retention_percent,defects_liability_days,handover_at,retention_release_at,retention_released_at,buyer_id,seller_id"),
      read("disputes", "*"), read("profiles", "id,full_name,verification_status"),
      read("business_profiles", "user_id,verification_status"), read("deal_milestones", "*"),
      read("ledger_entries", "id,deal_id,transaction_id,currency,account,debit,credit"),
      read("deal_transactions", "id,deal_id,kind,status,provider_ref,currency,amount"),
      read("tax_invoices", "id,deal_id,currency,fee,vat,lines"),
      read("fx_rates", "code,provider_rate,active"),
      read("dispute_evidence", "id,dispute_id,uploaded_by,file_name,note,created_at"),
    ]);
    const totals: Record<string, number> = {};
    const held: Record<string, number> = {};
    const heldByDeal: Record<string, number> = {};
    for (const l of ledger) {
      totals[l.currency] = (totals[l.currency] ?? 0) + Number(l.debit) - Number(l.credit);
      if (l.account === "escrow_held") {
        held[l.currency] = (held[l.currency] ?? 0) + Number(l.credit) - Number(l.debit);
        const key = `${l.deal_id}:${l.currency}`;
        heldByDeal[key] = (heldByDeal[key] ?? 0) + Number(l.credit) - Number(l.debit);
      }
    }
    const { roundMoney } = await import("@/lib/money");
    const balances = Object.keys(totals).sort().map(currency => ({ currency, ledger: roundMoney(totals[currency] ?? 0, currency), held: roundMoney(held[currency] ?? 0, currency) }));
    const usdRate = rates.find(r => r.code === "USD" && r.active)?.provider_rate;
    let heldUsd = 0;
    let missingRates = false;
    for (const b of balances) {
      const rate = b.currency === "SAR" ? 1 : rates.find(r => r.code === b.currency && r.active)?.provider_rate;
      if (!rate || !usdRate) { if (b.held !== 0) missingRates = true; continue; }
      heldUsd += b.held * Number(rate) / Number(usdRate);
    }
    const closed = new Set(deals.filter(d => ["released", "completed", "refunded", "partially_refunded", "cancelled", "rejected"].includes(d.status)).map(d => d.id));
    const closedHeld = Object.entries(heldByDeal).filter(([key, v]) => closed.has(key.split(":")[0]) && roundMoney(v, key.split(":")[1] ?? "USD") !== 0).length;
    // R4 compares billed with collected once a deal is closed: the supplier fee share is billed at funding
    // but collected at release, so open deals would show a timing difference, not an exception.
    const invoiceExceptions = invoices.filter(invoice => closed.has(invoice.deal_id)).filter(invoice => {
      const lines = Array.isArray(invoice.lines) ? invoice.lines : [{ currency: invoice.currency, fee: invoice.fee, vat: invoice.vat }];
      const currencies = new Set([...lines.map((l: any) => l.currency), ...ledger.filter(l => l.deal_id === invoice.deal_id && ["insight_fee_revenue", "vat_payable"].includes(l.account)).map(l => l.currency)]);
      return [...currencies].some(currency => {
        const billed = lines.filter((l: any) => l.currency === currency).reduce((s: number, l: any) => s + Number(l.fee) + Number(l.vat), 0);
        const collected = ledger.filter(l => l.deal_id === invoice.deal_id && l.currency === currency && ["insight_fee_revenue", "vat_payable"].includes(l.account)).reduce((s, l) => s + Number(l.credit) - Number(l.debit), 0);
        return roundMoney(billed - collected, String(currency)) !== 0;
      });
    }).length + new Set(ledger.filter(l => closed.has(l.deal_id) && ["insight_fee_revenue", "vat_payable"].includes(l.account) && !invoices.some(i => i.deal_id === l.deal_id)).map(l => l.deal_id)).size;
    return { deals, disputes, profiles, businesses, milestones, evidence, balances,
      heldUsd: missingRates ? null : roundMoney(heldUsd, "USD"),
      fundedCount: new Set(transactions.filter(t => t.kind === "funding" && t.status === "succeeded").map(t => t.deal_id)).size,
      reconciliation: { r1: balances.filter(b => b.ledger !== 0).length, r2: null,
        r3: transactions.filter(t => t.kind === "release" && (!t.provider_ref || t.status !== "succeeded")).length,
        r4: invoiceExceptions, r5: closedHeld },
      asOf: new Date().toISOString(),
    };
  });

/** T20: staff-only demo reset. Refused when a live payment provider is connected. */
export const resetDemoData = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireStaffAccess } = await import('@/lib/staff-auth.server');
    const db = await requireStaffAccess(context);
    const { getPaymentProvider } = await import('@/lib/payment-provider.server');
    if (getPaymentProvider().connected) throw new Error('The demo reset is disabled when a live payment provider is connected.');
    const { data, error } = await (db as any).rpc('reset_demo_data', { _actor: context.userId });
    if (error) throw new Error(error.message ?? 'Reset failed.');
    return data as { removed: number; deals: number; auctions: number; lots: number; ms: number };
  });
