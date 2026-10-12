import { createOpenAI } from "@ai-sdk/openai";
import { createFileRoute } from "@tanstack/react-router";
import { streamText } from "ai";
import { z } from "zod";

import { createLovableAiGatewayRunIdFetch, withRunId } from "@/lib/ai-gateway.server";

const documentSchema = z.object({
  name: z.string().max(200),
  mediaType: z.string().max(120),
  /** Base64 payload for binary documents. */
  data: z.string().max(12_000_000).optional(),
  /** Plain text payload for text documents. */
  text: z.string().max(400_000).optional(),
});

const inputSchema = z.object({
  deal: z.object({
    id: z.string().max(60),
    title: z.string().max(240),
    description: z.string().max(2000),
    amount: z.number(),
    currency: z.string().max(10),
    buyer: z.string().max(180),
    seller: z.string().max(180),
    dueAt: z.string().max(40),
    status: z.string().max(40),
    stages: z.array(z.object({ name: z.string().max(180), amount: z.number() })).max(12),
  }),
  notes: z.string().max(2000),
  documents: z.array(documentSchema).min(1).max(4),
});

async function requireUser(request: Request) {
  const h = request.headers.get("authorization") ?? "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const sb = createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.getClaims(token);
  return error || !data?.claims?.sub ? null : data.claims.sub;
}

export const Route = createFileRoute("/api/document-review")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          if (!(await requireUser(request)))
            return Response.json({ error: "Please sign in to continue." }, { status: 401 });
          const parsed = inputSchema.safeParse(await request.json());
          if (!parsed.success)
            return Response.json(
              { error: "Attach 1 to 4 readable documents and try again." },
              { status: 400 },
            );

          const key = process.env["LOVABLE_API_KEY"];
          if (!key)
            return Response.json({ error: "AI review is not configured." }, { status: 401 });

          const gateway = createLovableAiGatewayRunIdFetch(
            request.headers.get("X-Lovable-AIG-Run-ID") ?? undefined,
          );
          const lovable = createOpenAI({
            baseURL: "https://ai.gateway.lovable.dev/v1",
            apiKey: key,
            headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
            fetch: gateway.fetch,
          });

          const { deal, notes, documents } = parsed.data;
          const dealSummary = [
            `Deal ID: ${deal.id}`,
            `Title: ${deal.title}`,
            `Description: ${deal.description}`,
            `Value: ${deal.amount} ${deal.currency}`,
            `Buyer: ${deal.buyer}`,
            `Seller: ${deal.seller}`,
            `Delivery due: ${deal.dueAt}`,
            `Current status: ${deal.status}`,
            `Stages: ${deal.stages.map((s) => `${s.name} = ${s.amount} ${deal.currency}`).join("; ") || "Single payment"}`,
            `Manager notes: ${notes || "None"}`,
          ].join("\n");

          const parts = [
            {
              type: "text" as const,
              text: `Escrow record to compare against:\n${dealSummary}\n\nAttached documents follow.`,
            },
            ...documents.map((doc) =>
              doc.text
                ? {
                    type: "text" as const,
                    text: `--- Document: ${doc.name} ---\n${doc.text}`,
                  }
                : {
                    type: "file" as const,
                    filename: doc.name,
                    mediaType: doc.mediaType,
                    data: doc.data ?? "",
                  },
            ),
          ];

          const result = streamText({
            model: lovable.responses("openai/gpt-6-astra"),
            system:
              "You are an escrow deal-document reviewer for deal managers. Read the attached documents and compare them with the escrow record. Respond in concise English markdown with these sections: Document summary; Extracted obligations (table: party, obligation, deadline, source document); Risks and red flags (each with severity High/Medium/Low); Mismatches with the escrow record (amounts, currency, parties, dates, milestones — state the record value versus the document value); Recommended actions before funding. Quote document wording where useful, flag anything unreadable or missing, and never invent terms that are not in the documents. This is operational guidance, not legal advice.",
            messages: [{ role: "user", content: parts }],
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
            return new Response("Review cancelled.", { status: 499 });
          const message = error instanceof Error ? error.message : "Review failed.";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
