import { EmailAPIError } from "@lovable.dev/email-js";
import { CONTACT_RECIPIENT, contactRequestSchema } from "./contact-request";
import { sendTemplateEmail } from "./email-templates/send-email";

export async function deliverContactRequest(input: unknown) {
  const data = contactRequestSchema.parse(input);
  // Keep a copy for the staff support inbox; a storage failure never blocks the email.
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any).from("support_requests").upsert({ request_id: data.requestId, email: data.email, source: "contact_popup" }, { onConflict: "request_id", ignoreDuplicates: true });
  } catch { /* inbox copy is best-effort */ }
  try {
    const result = await sendTemplateEmail("contact-request", CONTACT_RECIPIENT, {
      templateData: { email: data.email },
      replyTo: data.email,
      idempotencyKey: `contact-request-${data.requestId}`,
    });
    return result.sent ? { status: "sent" as const } : { status: "unavailable" as const };
  } catch (error) {
    if (error instanceof EmailAPIError && error.status === 429) {
      return { status: "rate_limited" as const, retryAfterSeconds: error.retryAfterSeconds ?? 60 };
    }
    return { status: "unavailable" as const };
  }
}