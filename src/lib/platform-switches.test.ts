import { describe, expect, it } from "vitest";
import { activeNotice, DEFAULT_PLATFORM_SETTINGS, platformSettingsSchema } from "./platform-switches";

describe("platform settings", () => {
  it("defaults keep the platform open with no notice", () => {
    expect(platformSettingsSchema.parse(DEFAULT_PLATFORM_SETTINGS)).toEqual(DEFAULT_PLATFORM_SETTINGS);
    expect(activeNotice(DEFAULT_PLATFORM_SETTINGS, "ar")).toBeNull();
  });
  it("requires both languages before a notice can be shown", () => {
    expect(() => platformSettingsSchema.parse({ ...DEFAULT_PLATFORM_SETTINGS, notice_active: true, notice_en: "Maintenance tonight" })).toThrow();
  });
  it("shows the notice in the visitor's language", () => {
    const s = { ...DEFAULT_PLATFORM_SETTINGS, notice_active: true, notice_en: "Maintenance tonight", notice_ar: "صيانة الليلة" };
    expect(activeNotice(s, "ar")).toBe("صيانة الليلة");
    expect(activeNotice(s, "en")).toBe("Maintenance tonight");
    expect(activeNotice({ ...s, notice_active: false }, "en")).toBeNull();
  });
});
