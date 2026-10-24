import { normalizeCountry } from "@/lib/fees";
import { roundMoney } from "@/lib/money";

/**
 * Insight fee invoices (presentation only). Each tax_invoices row stores one line per fee payer
 * (payer side and payee side), each already priced at that party's country VAT rate by fees.ts.
 * This module turns those stored lines into one invoice per paying party; it never recalculates fees.
 */

export type StoredLine = { party: "buyer" | "supplier"; fee: number; vat_rate: number; vat: number; currency: string };
export type StoredInvoice = {
  invoice_number: string; fee: number; vat_rate: number; vat: number; total: number; currency: string;
  issued_at: string; milestone_id: string | null; lines: StoredLine[] | null;
};

export type BillTo = { name: string; country: string | null; taxNumber: string | null; registrationNumber: string | null; isBusiness: boolean };

export type FeeInvoice = {
  number: string;
  baseNumber: string;
  party: "buyer" | "supplier";
  issuedAt: string;
  milestoneId: string | null;
  currency: string;
  fee: number;
  vatRate: number;
  vat: number;
  total: number;
  /** Standard tax invoice for a VAT-registered business, simplified otherwise. */
  kind: "standard" | "simplified";
  billTo: BillTo;
};

export const COUNTRY_LABEL: Record<string, readonly [string, string]> = {
  SA: ["Saudi Arabia", "السعودية"],
  BH: ["Bahrain", "البحرين"],
  AE: ["United Arab Emirates", "الإمارات"],
  OM: ["Oman", "عُمان"],
  QA: ["Qatar", "قطر"],
  KW: ["Kuwait", "الكويت"],
  OTHER: ["Outside the Gulf", "خارج دول الخليج"],
};

export function countryLabel(country: string | null | undefined): readonly [string, string] {
  const code = normalizeCountry(country) ?? "OTHER";
  return COUNTRY_LABEL[code] ?? COUNTRY_LABEL["OTHER"]!;
}

function linesOf(row: StoredInvoice): StoredLine[] {
  if (Array.isArray(row.lines) && row.lines.length) return row.lines.filter((l) => Number(l.fee) > 0);
  // Older rows without lines: the stored totals are the payer's invoice.
  return [{ party: "buyer", fee: Number(row.fee), vat_rate: Number(row.vat_rate), vat: Number(row.vat), currency: row.currency }];
}

/** One invoice per paying party per stored row. Suffix -P (payer) / -R (payee) keeps numbers unique. */
export function splitFeeInvoices(rows: StoredInvoice[], billing: Record<"buyer" | "supplier", BillTo>): FeeInvoice[] {
  const out: FeeInvoice[] = [];
  for (const row of rows) {
    const lines = linesOf(row);
    for (const l of lines) {
      const fee = Number(l.fee);
      const vat = Number(l.vat);
      const billTo = billing[l.party];
      out.push({
        number: lines.length > 1 ? `${row.invoice_number}-${l.party === "buyer" ? "P" : "R"}` : row.invoice_number,
        baseNumber: row.invoice_number,
        party: l.party,
        issuedAt: row.issued_at,
        milestoneId: row.milestone_id,
        currency: l.currency,
        fee,
        vatRate: Number(l.vat_rate),
        vat,
        total: roundMoney(fee + vat, l.currency),
        kind: billTo.isBusiness && billTo.taxNumber ? "standard" : "simplified",
        billTo,
      });
    }
  }
  return out;
}

/** ZATCA phase-1 style QR payload: TLV of seller, VAT number, timestamp, total, VAT (base64). */
export function zatcaTlv(values: string[]) {
  const enc = new TextEncoder();
  const bytes: number[] = [];
  values.forEach((v, i) => {
    const b = enc.encode(v);
    bytes.push(i + 1, b.length, ...b);
  });
  let bin = "";
  bytes.forEach((x) => (bin += String.fromCharCode(x)));
  return btoa(bin);
}
