import { EmailAPIError } from "@lovable.dev/email-js";
import { CONTACT_RECIPIENT, contactRequestSchema } from "./contact-request";
import { sendTemplateEmail } from "./email-templates/send-email";

export async function deliverContactRequest(input: unknown) {
  const data = contactRequestSchema.parse(input);
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