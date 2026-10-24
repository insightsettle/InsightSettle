import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { surveySchema, tallySurvey } from "./survey";

/** Public: stores one survey response. No sign-in; the honeypot field must be empty. */
export const submitSurvey = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => surveySchema.parse(i))
  .handler(async ({ data }) => {
    const { website, pilot_email, ...answers } = data;
    if (website) return { ok: true };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("survey_responses").insert({ ...answers, pilot_email: pilot_email || null });
    if (error) throw new Error("Your answers could not be saved. Please try again.");
    return { ok: true };
  });

/** Staff: totals per answer, the sample size and the latest comments. Pilot emails are counted, not listed here. */
export const getSurveyResults = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireStaffAccess } = await import("./staff-auth.server");
    const db = (await requireStaffAccess(context, "read")) as any;
    const { data, error } = await db.from("survey_responses").select("*").order("created_at", { ascending: false }).limit(5000);
    if (error) throw error;
    const rows = (data ?? []) as Record<string, any>[];
    return {
      n: rows.length,
      pilot: rows.filter((r) => r["pilot_email"]).length,
      first: (rows.at(-1)?.["created_at"] ?? null) as string | null,
      last: (rows[0]?.["created_at"] ?? null) as string | null,
      bySource: Object.entries(rows.reduce<Record<string, number>>((a, r) => { const k = String(r["source"] ?? "link"); a[k] = (a[k] ?? 0) + 1; return a; }, {})) as [string, number][],
      questions: tallySurvey(rows),
      comments: rows.filter((r) => r["comment"]).slice(0, 50).map((r) => ({ at: String(r["created_at"]), text: String(r["comment"]), respondent: String(r["respondent"]), country: String(r["country"]) })),
    };
  });
