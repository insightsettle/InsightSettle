import { describe, expect, it } from "vitest";
import { SURVEY_QUESTIONS, surveySchema, tallySurvey } from "./survey";

const base = { lang: "ar", respondent: "supplier", country: "SA", unknown_party: "often", problems: ["late_payment"], deal_size: "5k_25k",
  current_method: "half_advance", would_use: "yes", fee_ok: "1_2", heard_of: ["waffy"] } as const;

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
  });
});
