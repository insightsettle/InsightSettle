import { createOpenAI } from "@ai-sdk/openai";
import { createFileRoute } from "@tanstack/react-router";
import { streamText } from "ai";
import { z } from "zod";

import { createLovableAiGatewayRunIdFetch, withRunId } from "@/lib/ai-gateway.server";

const inputSchema = z.object({
  deals: z
    .array(
      z.object({
        ref: z.string().max(60),
        title: z.string().max(240),
        amount: z.number(),
        currency: z.string().max(8),
        status: z.string().max(40),
        createdAt: z.string().max(40),
        buyer: z.string().max(180),
        seller: z.string().max(180),
        disputedReason: z.string().max(1200).nullable(),
        messages: z.array(z.string().max(1200)).max(40),
      }),
    )
    .min(1)
    .max(25),
  notes: z.string().max(4000),
});

export const Route = createFileRoute("/api/deal-risk")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("Authorization") ?? "";
          const token = authHeader.replace(/^Bearer\s+/i, "").trim();
          if (!token) return Response.json({ error: "Sign in required." }, { status: 401 });

          const supabaseUrl = process.env["SUPABASE_URL"];
          const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
          if (!supabaseUrl || !serviceKey)
            return Response.json({ error: "Backend is not configured." }, { status: 500 });

          const { createClient } = await import("@supabase/supabase-js");
          const authed = createClient(supabaseUrl, serviceKey, {
            auth: { persistSession: false },
          });
          const { data: userData, error: userError } = await authed.auth.getUser(token);
          if (userError || !userData.user)
            return Response.json({ error: "Sign in required." }, { status: 401 });
          const { isStaffUser } = await import("@/lib/staff-auth.server");
          const isStaff = await isStaffUser({ supabase: authed, userId: userData.user.id });
          if (!isStaff)
            return Response.json({ error: "Insight staff only." }, { status: 403 });

          const parsed = inputSchema.safeParse(await request.json());
          if (!parsed.success)
            return Response.json({ error: "Please supply at least one deal." }, { status: 400 });

          const key = process.env["LOVABLE_API_KEY"];
          if (!key)
            return Response.json({ error: "AI analysis is not configured." }, { status: 401 });

          const gateway = createLovableAiGatewayRunIdFetch(
            request.headers.get("X-Lovable-AIG-Run-ID") ?? undefined,
          );
          const lovable = createOpenAI({
            baseURL: "https://ai.gateway.lovable.dev/v1",
            apiKey: key,
            headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
            fetch: gateway.fetch,
          });

          const dealBlocks = parsed.data.deals
            .map(
              (d) =>
                `Deal ${d.ref} — "${d.title}"\nAmount: ${d.currency} ${d.amount}\nStatus: ${d.status}\nCreated: ${d.createdAt}\nBuyer: ${d.buyer}\nSeller: ${d.seller}\nDispute reason: ${d.disputedReason ?? "none"}\nMessages:\n${d.messages.length ? d.messages.map((m) => `- ${m}`).join("\n") : "- no messages"}`,
            )
            .join("\n\n");

          const result = streamText({
            model: lovable.responses("openai/gpt-6-astra"),
            system:
              "You are an escrow risk analyst for a payment-protection platform. Assess fraud, collusion, money-laundering, chargeback, and delivery risk from deal records and conversation text only. Never make legal findings or accusations of fact; describe signals and confidence. Respond in concise English markdown with these sections: Deals needing review (ranked table with deal reference, risk level low/medium/high, one-line reason), Risk signals observed, Missing information to request, Recommended staff actions. Keep the whole answer under 700 words.",
            prompt: `Staff notes and pasted messages:\n${parsed.data.notes || "None provided"}\n\nDeal records:\n${dealBlocks}`,
            providerOptions: {
              openai: {
                forceReasoning: true,
                reasoningEffort: "medium",
                reasoningSummary: "auto",
                store: false,
                include: ["reasoning.encrypted_content"],
              },
            },
            abortSignal: request.signal,
          });
          return withRunId(result.toTextStreamResponse(), gateway);
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError")
            return new Response("Analysis cancelled.", { status: 499 });
          const message = error instanceof Error ? error.message : "Risk analysis failed.";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
