import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { auctionSettingsSchema } from "@/lib/auction-fees";
import { dealFee, splitFee } from "@/lib/fees";

export const publicPricing = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ amount: z.number().positive().max(1e9), currency: z.enum(["USD", "SAR", "AED", "BHD", "KWD", "QAR", "OMR"]), payer: z.enum(["buyer", "seller", "split"]), buyerCountry: z.enum(["SA", "BH", "AE", "KW", "QA", "OM", "OTHER"]), supplierCountry: z.enum(["SA", "BH", "AE", "KW", "QA", "OM", "OTHER"]) }).parse(input))
  .handler(async ({ data }) => {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("Public pricing unavailable");
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } } });
    // Fail closed rather than let the existing loader's fallback look like live pricing.
    const checks = await Promise.all([
      client.from("fee_rules").select("amount_from").eq("currency", "USD").limit(1),
      client.from("vat_rates").select("country_code").limit(1),
      client.from("fx_rates").select("code").eq("code", "USD").limit(1),
    ]);
    if (checks.some((r) => r.error || !r.data?.length)) return { available: false as const };
    const { loadPricingInputs } = await import("@/lib/pricing.server");
    const inputs = await loadPricingInputs(client, data.currency);
    const fee = dealFee(data.amount, data.currency, inputs.usdPerUnit, inputs.schedule);
    const breakdown = splitFee({ amount: data.amount, currency: data.currency, fee, feePayer: data.payer, buyerCountry: data.buyerCountry, supplierCountry: data.supplierCountry, vatTable: inputs.vatTable });
    const {data: auction,error: auctionError}=await client.from('auction_fee_settings').select('*').eq('id',true).single();
    return { available: true as const, breakdown, auction: auctionError ? null : auctionSettingsSchema.parse(auction) };
  });