import { describe, expect, it } from "vitest";
import { dealFee, splitFee, type FeeSchedule } from "./fees";

const liveOctoberSchedule: FeeSchedule = { currency: "USD", bands: [{ from: 0, to: 1500, percent: 3 }, { from: 1500, to: 6000, percent: 2.5 }, { from: 6000, to: 250000, percent: 1 }, { from: 250000, to: null, percent: 0.5 }], minFee: 15, maxFee: 3500 };
describe("UX-D live October fee vectors", () => {
  it("USD 10,000 has fee 197.50 and equal shares 98.75", () => {
    const fee = dealFee(10000, "USD", 1, liveOctoberSchedule);
    expect(fee).toBe(197.5);
    const b = splitFee({ amount: 10000, currency: "USD", fee, feePayer: "split", buyerCountry: "SA", supplierCountry: "BH" });
    expect([b.buyerShare, b.sellerShare]).toEqual([98.75, 98.75]);
  });
  it("BHD 1,000.000 has fee 27.820 using the live provider rate", () => {
    expect(dealFee(1000, "BHD", 9.9734 / 3.75, liveOctoberSchedule)).toBe(27.82);
  });
  it("Qatar and Kuwait show no VAT in the existing calculator", () => {
    const b = splitFee({ amount: 10000, currency: "USD", fee: 197.5, feePayer: "split", buyerCountry: "QA", supplierCountry: "KW", vatTable: { QA: 0, KW: 0 } });
    expect([b.buyerVat, b.sellerVat]).toEqual([0, 0]);
  });
});