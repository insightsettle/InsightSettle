import { createOpenAI } from "@ai-sdk/openai";
import { createFileRoute } from "@tanstack/react-router";
import { streamText } from "ai";
import { z } from "zod";

import { createLovableAiGatewayRunIdFetch, withRunId } from "@/lib/ai-gateway.server";

const inputSchema = z.object({
  dealId: z.string().max(60),
  issue: z.string().min(30).max(6000),
  desiredOutcome: z.string().max(1200),
  evidence: z
    .array(z.object({ name: z.string().max(180), type: z.string().max(120), size: z.number() }))
    .max(8),
});

export const Route = createFileRoute("/api/dispute-analysis")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const parsed = inputSchema.safeParse(await request.json());
          if (!parsed.success)
            return Response.json(
              { error: "Please provide at least 30 characters and valid evidence files." },
              { status: 400 },
            );
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
          const { dealId, issue, desiredOutcome, evidence } = parsed.data;
          const result = streamText({
            model: lovable.responses("openai/gpt-6-astra"),
            system:
              "You are a neutral escrow dispute triage assistant. Analyze only the supplied information. Do not make binding legal findings. Respond in concise English markdown with: Case snapshot, Key points to verify, Evidence gaps, Recommended next steps, and a Neutral settlement path. Clearly label uncertainty.",
            prompt: `Deal: ${dealId}\nDispute description: ${issue}\nDesired outcome: ${desiredOutcome || "Not stated"}\nEvidence metadata: ${evidence.length ? evidence.map((f) => `${f.name} (${f.type || "unknown"}, ${Math.round(f.size / 1024)} KB)`).join(", ") : "No files attached"}`,
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
          const message = error instanceof Error ? error.message : "Analysis failed.";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
