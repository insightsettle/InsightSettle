import { describe, expect, it } from "vitest";
import { SURVEY_QUESTIONS, surveySchema, tallySurvey } from "./survey";

const base = { lang: "ar", respondent: "supplier", country: "SA", unknown_party: "often", deals_per_year: "3_10", channel: ["social", "whatsapp"], cross_border: "sometimes", problems: ["late_payment"], deal_size: "5k_25k",
  current_method: ["half_advance", "contract"], would_use: "yes", fee_ok: "1_2", heard_of: ["other_escrow"] } as const;

describe("market survey", () => {
  it("accepts a complete answer set and rejects unknown options", () => {
    expect(surveySchema.parse(base).respondent).toBe("supplier");
    expect(() => surveySchema.parse({ ...base, country: "XX" })).toThrow();
    expect(() => surveySchema.parse({ ...base, problems: [] })).toThrow();
    expect(() => surveySchema.parse({ ...base, website: "spam" })).toThrow();
  });
  it("tallies single and multi answers", () => {
    const t = tallySurvey([{ ...base }, { ...base, problems: ["late_payment", "big_advance"], country: "BH" }]);
    expect(t.find((q) => q.id === "country")!.options.find((o) => o.key === "SA")!.count).toBe(1);
    expect(t.find((q) => q.id === "problems")!.options.find((o) => o.key === "late_payment")!.count).toBe(2);
    expect(t).toHaveLength(SURVEY_QUESTIONS.length);
    expect(SURVEY_QUESTIONS).toHaveLength(12);
  });
  it("asks for the text when 'other' is chosen, and keeps only those texts", () => {
    expect(() => surveySchema.parse({ ...base, country: "other" })).toThrow();
    const ok = surveySchema.parse({ ...base, country: "other", other_answers: { country: "Jordan", respondent: "ignored" } });
    expect(ok.other_answers).toEqual({ country: "Jordan" });
    const t = tallySurvey([{ ...ok }]);
    expect(t.find((q) => q.id === "country")!.others).toEqual(["Jordan"]);
  });
  it("does not name any competitor", () => {
    expect(JSON.stringify(SURVEY_QUESTIONS)).not.toMatch(/waffy|وفّي|وفي/i);
  });
  it("counts older responses where current_method was a single answer", () => {
    const t = tallySurvey([{ ...base, current_method: "trust", channel: undefined }]);
    expect(t.find((q) => q.id === "current_method")!.options.find((o) => o.key === "trust")!.count).toBe(1);
    expect(t.find((q) => q.id === "channel")!.options.every((o) => o.count === 0)).toBe(true);
  });
});
