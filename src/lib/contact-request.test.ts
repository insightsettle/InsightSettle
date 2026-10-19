import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { transpileModule, ModuleKind, ScriptTarget } from "typescript";
import { EmailAPIError } from "@lovable.dev/email-js";
import { CONTACT_RECIPIENT, contactRequestSchema } from "./contact-request";

const calls: unknown[][] = [];
let result: { sent: boolean; reason?: string } = { sent: true };
let fail = false;
async function send(...args: unknown[]) {
  calls.push(args);
  if (fail) throw new Error("unavailable");
  return result;
}
// Execute the real helper outside Vite's server instrumentation, as party-action tests do.
const source = readFileSync(new URL("./contact-request.server.ts", import.meta.url), "utf8").replace(/^import .*;\r?\n/gm, "");
const compiled = transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 } }).outputText;
const handlers: Record<string, unknown> = {};
new Function("exports", "EmailAPIError", "CONTACT_RECIPIENT", "contactRequestSchema", "sendTemplateEmail", compiled)(handlers, EmailAPIError, CONTACT_RECIPIENT, contactRequestSchema, send);
const deliverContactRequest = handlers.deliverContactRequest as (input: unknown) => Promise<{ status: string }>;

const input = { email: "visitor@example.com", consent: true, website: "", requestId: "2ce624fe-6654-4bc2-9a2e-ecf7a22c114f" };
beforeEach(() => { calls.length = 0; result = { sent: true }; fail = false; });
describe("contact requests", () => {
  it("sends every request to insightsettle@gmail.com and sets the visitor as reply-to", async () => {
    await expect(deliverContactRequest(input)).resolves.toEqual({ status: "sent" });
    expect(calls).toEqual([["contact-request", "insightsettle@gmail.com", {
      templateData: { email: "visitor@example.com" }, replyTo: "visitor@example.com",
      idempotencyKey: "contact-request-2ce624fe-6654-4bc2-9a2e-ecf7a22c114f",
    }]]);
  });
  it("rejects arbitrary recipients, invalid emails, missing consent and honeypot input before sending", async () => {
    for (const invalid of [{ ...input, to: "other@example.com" }, { ...input, email: "bad\r\nemail" }, { ...input, consent: false }, { ...input, website: "spam" }]) {
      expect(contactRequestSchema.safeParse(invalid).success).toBe(false);
      await expect(deliverContactRequest(invalid)).rejects.toThrow();
    }
    expect(calls).toHaveLength(0);
  });
  it("never claims success for suppressed or failed requests", async () => {
    result = { sent: false, reason: "recipient_suppressed" };
    await expect(deliverContactRequest(input)).resolves.toEqual({ status: "unavailable" });
    fail = true;
    await expect(deliverContactRequest(input)).resolves.toEqual({ status: "unavailable" });
  });
});