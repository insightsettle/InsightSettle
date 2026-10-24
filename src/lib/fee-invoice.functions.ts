import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { splitFeeInvoices, type BillTo, type FeeInvoice, type StoredInvoice } from "./fee-invoice";

export type FeeInvoiceView = {
  deal: { ref: string; title: string; currency: string; amount: number };
  milestones: { id: string; seq: number; title: string }[];
  invoices: FeeInvoice[];
  viewer: "buyer" | "supplier" | "staff";
};

/** Insight fee invoices for one deal: a party sees only the invoices addressed to them; staff see all. */
export const getFeeInvoices = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ ref: z.string().trim().min(3).max(40) }).parse(i))
  .handler(async ({ context, data }): Promise<FeeInvoiceView | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: deal, error } = await admin.from("deals").select("id,ref,title,currency,amount,buyer_id,seller_id").eq("ref", data.ref).maybeSingle();
    if (error) throw error;
    if (!deal) return null;
    let viewer: FeeInvoiceView["viewer"];
    if (context.userId === deal.buyer_id) viewer = "buyer";
    else if (context.userId === deal.seller_id) viewer = "supplier";
    else {
      const { isStaffUser } = await import("@/lib/staff-auth.server");
      if (!(await isStaffUser(context as any))) throw new Error("You are not a party to this deal.");
      viewer = "staff";
    }
    const [rows, milestones, profiles, businesses] = await Promise.all([
      admin.from("tax_invoices").select("invoice_number,fee,vat_rate,vat,total,currency,issued_at,milestone_id,lines").eq("deal_id", deal.id).order("issued_at"),
      admin.from("deal_milestones").select("id,seq,title").eq("deal_id", deal.id).order("seq"),
      admin.from("profiles").select("id,full_name,country,account_type").in("id", [deal.buyer_id, deal.seller_id].filter(Boolean)),
      admin.from("business_profiles").select("user_id,legal_name,country,tax_number,registration_number").in("user_id", [deal.buyer_id, deal.seller_id].filter(Boolean)),
    ]);
    for (const r of [rows, milestones, profiles, businesses]) if (r.error) throw r.error;
    const bill = (id: string | null): BillTo => {
      const p = (profiles.data ?? []).find((x: any) => x.id === id);
      const b = (businesses.data ?? []).find((x: any) => x.user_id === id);
      const isBusiness = !!b && (p?.account_type === "business" || !!b.legal_name);
      return {
        name: (isBusiness ? b?.legal_name : null) || p?.full_name || "—",
        country: p?.country ?? b?.country ?? null,
        taxNumber: isBusiness ? (b?.tax_number || null) : null,
        registrationNumber: isBusiness ? (b?.registration_number || null) : null,
        isBusiness,
      };
    };
    const all = splitFeeInvoices((rows.data ?? []) as StoredInvoice[], { buyer: bill(deal.buyer_id), supplier: bill(deal.seller_id) });
    return {
      deal: { ref: deal.ref, title: deal.title, currency: deal.currency, amount: Number(deal.amount) },
      milestones: (milestones.data ?? []) as FeeInvoiceView["milestones"],
      invoices: viewer === "staff" ? all : all.filter((i) => i.party === viewer),
      viewer,
    };
  });
