import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { ArrowUpRight, Info } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/locale";
import { getDealPartner } from "@/lib/partner-portal.functions";

/** On a deal created through the partner API: who created it, and a way back to the partner once the buyer has paid. */
export function PartnerBanner({ dealId, status }: { dealId: string; status: string }) {
  const { text } = useLocale();
  const fn = useServerFn(getDealPartner);
  const q = useQuery({ queryKey: ["deal-partner", dealId], queryFn: () => fn({ data: { dealId } }) });
  const p = q.data;
  if (!p?.name) return null;
  const paid = status !== "pending_funding" && status !== "cancelled";
  return (
    <div data-no-localize className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-accent/40 p-3 text-sm sm:p-4">
      <Info className="size-4 shrink-0 text-primary" />
      <p className="min-w-0 flex-1">{text(`This deal was created by ${p.name} through Insight.`, `أنشأ ${p.name} هذه الصفقة عبر إنسايت.`)}</p>
      {p.returnUrl && paid && (
        <Button asChild size="sm" variant="outline"><a href={p.returnUrl} rel="noopener noreferrer">{text(`Back to ${p.name}`, `العودة إلى ${p.name}`)}<ArrowUpRight /></a></Button>
      )}
    </div>
  );
}
