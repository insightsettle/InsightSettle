import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, Search } from "lucide-react";
import { useState } from "react";

import { StatusBadge } from "@/components/site/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listAllDeals } from "@/lib/admin.functions";
import { formatDate, formatSAR, statusLabels, type DealStatus } from "@/lib/demo-data";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/console/deals/")({
  component: ConsoleDeals,
});

const filters = ["all", ...Object.keys(statusLabels)] as const;

function ConsoleDeals() {
  const fetchDeals = useServerFn(listAllDeals);
  const deals = useQuery({ queryKey: ["all-deals"], queryFn: () => fetchDeals({}) });
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState<string>("all");

  const rows = (deals.data ?? []).filter((d) => {
    if (status !== "all" && d.status !== status) return false;
    const q = term.trim().toLowerCase();
    if (!q) return true;
    return [d.ref, d.title, d.buyerEmail, d.sellerEmail, d.createdByEmail].some((v) =>
      v?.toLowerCase().includes(q),
    );
  });

  const volume = rows.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">All platform deals</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every real deal created by members — {rows.length} shown.
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search reference, title or party"
            className="pl-9"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setStatus(f)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              status === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "all" ? "All statuses" : statusLabels[f as DealStatus]}
          </button>
        ))}
      </div>

      {deals.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading deals…</p>
      ) : deals.isError ? (
        <p className="mt-6 text-sm text-destructive">Could not load deals.</p>
      ) : rows.length === 0 ? (
        <Card className="mt-5 border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            No deals match this view yet.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-5 space-y-3">
          {rows.map((d) => {
            const special = d.feeOverrideFlat !== null || d.feeOverridePercent !== null;
            return (
              <Link
                key={d.id}
                to="/console/deals/$dealId"
                params={{ dealId: d.ref }}
                className="group grid gap-4 rounded-lg border border-border bg-card p-5 transition hover:border-primary/40 lg:grid-cols-[1.5fr_1fr_auto_auto] lg:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold group-hover:text-primary">{d.title}</p>
                    <StatusBadge status={d.status as DealStatus} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {d.ref} · created by {d.createdByName ?? d.createdByEmail ?? "unknown"} ·{" "}
                    {formatDate(d.createdAt)}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  <p>Buyer: {d.buyerName ?? d.buyerEmail ?? "not joined"}</p>
                  <p>Seller: {d.sellerName ?? d.sellerEmail ?? "not joined"}</p>
                </div>
                <div className="lg:text-right">
                  <p className="font-bold">
                    <bdi dir="ltr">{formatMoney(d.amount, d.currency)}</bdi>
                  </p>
                  {special && <p className="text-xs text-muted-foreground">Special fee offer</p>}
                </div>
                <ArrowUpRight className="hidden size-4 text-muted-foreground lg:block" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
