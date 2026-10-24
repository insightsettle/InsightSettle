import { z } from "zod";

export const platformSettingsSchema = z.object({
  new_deals_enabled: z.boolean(),
  auctions_enabled: z.boolean(),
  notice_active: z.boolean(),
  notice_tone: z.enum(["info", "warning"]),
  notice_en: z.string().trim().max(300),
  notice_ar: z.string().trim().max(300),
}).refine((v) => !v.notice_active || (v.notice_en.length > 0 && v.notice_ar.length > 0), "Write the notice in Arabic and English before showing it.");

export type PlatformSettings = z.infer<typeof platformSettingsSchema>;

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  new_deals_enabled: true,
  auctions_enabled: true,
  notice_active: false,
  notice_tone: "info",
  notice_en: "",
  notice_ar: "",
};

export const SUPPORT_STATUSES = ["new", "in_progress", "waiting_customer", "resolved"] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export const SUPPORT_STATUS_LABEL: Record<SupportStatus, readonly [string, string]> = {
  new: ["New", "جديد"],
  in_progress: ["In progress", "قيد المعالجة"],
  waiting_customer: ["Waiting for customer", "بانتظار العميل"],
  resolved: ["Resolved", "تم الحل"],
};

/** Picks the notice text for the current language; null when nothing should show. */
export function activeNotice(s: Pick<PlatformSettings, "notice_active" | "notice_en" | "notice_ar"> | null | undefined, locale: string): string | null {
  if (!s || !s.notice_active) return null;
  const value = (locale === "ar" ? s.notice_ar : s.notice_en).trim();
  return value.length > 0 ? value : null;
}
