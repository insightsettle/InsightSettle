import { describe, expect, it } from "vitest";
import { countryLabel, splitFeeInvoices, type BillTo, type StoredInvoice } from "./fee-invoice";

const person = (country: string): BillTo => ({ name: "Fictional person", country, taxNumber: null, registrationNumber: null, isBusiness: false });
const company = (country: string): BillTo => ({ name: "Fictional Co", country, taxNumber: "310000000000003", registrationNumber: "1010000000", isBusiness: true });

const row = (lines: StoredInvoice["lines"]): StoredInvoice => ({
  invoice_number: "INV-1040", fee: 10, vat_rate: 0.15, vat: 1.5, total: 11.5, currency: "SAR",
  issued_at: "2026-10-24T10:00:00Z", milestone_id: null, lines,
});

describe("fee invoices per paying party", () => {
  it("issues one invoice per party, each at that party's own country VAT rate", () => {
    const inv = splitFeeInvoices([row([
      { party: "buyer", fee: 50, vat_rate: 0.15, vat: 7.5, currency: "SAR" },
      { party: "supplier", fee: 50, vat_rate: 0.1, vat: 5, currency: "SAR" },
    ])], { buyer: person("SA"), supplier: company("BH") });
    expect(inv.map((i) => [i.number, i.vatRate, i.total, i.kind])).toEqual([
      ["INV-1040-P", 0.15, 57.5, "simplified"],
      ["INV-1040-R", 0.1, 55, "standard"],
    ]);
  });
  it("keeps the plain number when only one party pays the fee", () => {
    const inv = splitFeeInvoices([row([{ party: "buyer", fee: 80, vat_rate: 0, vat: 0, currency: "USD" }, { party: "supplier", fee: 0, vat_rate: 0.15, vat: 0, currency: "SAR" }])], { buyer: person("OTHER"), supplier: person("SA") });
    expect(inv).toHaveLength(1);
    expect(inv[0]).toMatchObject({ number: "INV-1040", vatRate: 0, total: 80 });
  });
  it("falls back to stored totals for older rows without lines", () => {
    const inv = splitFeeInvoices([row(null)], { buyer: person("SA"), supplier: person("SA") });
    expect(inv[0]).toMatchObject({ party: "buyer", fee: 10, vat: 1.5, total: 11.5 });
  });
  it("labels countries in both languages", () => {
    expect(countryLabel("BH")).toEqual(["Bahrain", "البحرين"]);
    expect(countryLabel("Germany")).toEqual(["Outside the Gulf", "خارج دول الخليج"]);
  });
});
