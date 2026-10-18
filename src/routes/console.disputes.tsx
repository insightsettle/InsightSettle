import { useLocale } from "@/lib/locale";
import { supabase } from "@/integrations/supabase/client";
import { LiveDisputes } from "@/components/site/StaffOps";
import { createFileRoute } from "@tanstack/react-router";
import { Gavel, LoaderCircle, RotateCcw, Sparkles, Timer } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatSAR } from "@/lib/demo-data";
import { disputeCases, disputeStageLabels, type DisputeCase } from "@/lib/dispute-cases";
import { usePlatformSettings } from "@/lib/platform-settings";

export const Route = createFileRoute("/console/disputes")({
  head: () => ({ meta: [
    { title: "Dispute operations | Insight staff console" },
    { name: "description", content: "Review dispute cases and policies in Insight." },
    { property: "og:title", content: "Dispute operations | Insight staff console" },
    { property: "og:description", content: "Review dispute cases and policies in Insight." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: DisputeOpsPage,
});

const payerLabels = {
  buyer: "Buyer (customer)",
  seller: "Seller",
  losing_party: "Losing party",
  split: "Split 50/50",
} as const;

function hoursLeft(openedAt: string, windowDays: number) {
  const deadline = new Date(openedAt).getTime() + windowDays * 86_400_000;
  return Math.round((deadline - Date.now()) / 3_600_000);
}

function DisputeOpsPage() {
  // Live cases only. The earlier sample queue and AI-mediation mock-up were removed (W1: they showed
  // fictional cases next to live ones and described steps the product does not perform).
  const { text } = useLocale();
  return (
    <div className="mt-8 space-y-6">
      <LiveDisputes />
      <Card>
        <CardContent className="p-5 text-sm leading-7 text-muted-foreground" data-no-localize>
          <h2 className="mb-2 text-lg font-bold text-foreground">{text("Resolution policy", "سياسة الحل")}</h2>
          {text("A staff member proposes a written, reasoned decision; it takes effect only when a second staff member approves it. Either party keeps the right to go to court. Insight records the dispute decision after a second staff approval; the payment provider handles releases and refunds.", "يقترح موظف قراراً مكتوباً ومسبّباً، ولا يسري إلا باعتماد موظف ثانٍ. ويحتفظ كل طرف بحقه في اللجوء إلى القضاء. تسجّل إنسايت قرار النزاع بعد اعتماد موظف ثانٍ، ويتولى مزوّد الدفع الإفراج والاسترداد.")}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
