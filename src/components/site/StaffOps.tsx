import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  listDisputeCases,
  listInternalNotes,
  resolveDisputeCase,
  staffAction,
} from "@/lib/operations.functions";

const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

/** Freeze, request documents, internal notes for one deal. */
export function StaffDealActions({ dealId, frozen }: { dealId: string; frozen: boolean }) {
  const qc = useQueryClient();
  const run = useServerFn(staffAction);
  const notesFn = useServerFn(listInternalNotes);
  const notes = useQuery({ queryKey: ["internal-notes", dealId], queryFn: () => notesFn({ data: { dealId } }) });
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const act = useMutation({
    mutationFn: (action: "freeze" | "unfreeze" | "request_documents" | "internal_note") =>
      run({ data: { action, dealId, note: note.trim() } }),
    onSuccess: () => {
      setNote("");
      setMsg("Saved and recorded in the audit log.");
      qc.invalidateQueries();
    },
    onError: (e) => setMsg(e instanceof Error ? e.message : "Action failed."),
  });
  const ok = note.trim().length >= 3 && !act.isPending;
  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="font-bold">Staff actions</h2>
        <p className="mt-1 text-sm text-muted-foreground">Every action needs a reason and is written to the audit log.</p>
        <Textarea rows={2} className="mt-3" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason / note" />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant={frozen ? "outline" : "destructive"} disabled={!ok} onClick={() => act.mutate(frozen ? "unfreeze" : "freeze")}>
            {frozen ? "Unfreeze deal" : "Freeze deal"}
          </Button>
          <Button size="sm" variant="outline" disabled={!ok} onClick={() => act.mutate("request_documents")}>
            Request documents
          </Button>
          <Button size="sm" variant="outline" disabled={!ok} onClick={() => act.mutate("internal_note")}>
            Add internal note
          </Button>
        </div>
        {msg && <p className="mt-2 text-sm text-muted-foreground">{msg}</p>}
        {(notes.data ?? []).length > 0 && (
          <ul className="mt-4 space-y-2 text-sm">
            {notes.data!.map((n) => (
              <li key={n.id} className="rounded-md border p-2">
                <p>{n.note}</p>
                <p className="text-xs text-muted-foreground">Internal · {fmt(n.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Restrict / suspend / reactivate a member. */
export function AccountStateControl({ userId, state }: { userId: string; state?: string | null }) {
  const qc = useQueryClient();
  const run = useServerFn(staffAction);
  const [next, setNext] = useState<"active" | "restricted" | "suspended">("restricted");
  const [note, setNote] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted-foreground">Account: {state ?? "active"}</span>
      <select value={next} onChange={(e) => setNext(e.target.value as typeof next)} className="h-8 rounded-md border border-input bg-background px-2">
        <option value="active">Active</option>
        <option value="restricted">Restricted</option>
        <option value="suspended">Suspended</option>
      </select>
      <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason" className="h-8 w-40" />
      <Button
        size="sm"
        variant="outline"
        disabled={note.trim().length < 3}
        onClick={async () => {
          await run({ data: { action: "account_state", userId, state: next, note: note.trim() } });
          setNote("");
          qc.invalidateQueries();
        }}
      >
        Apply
      </Button>
    </div>
  );
}

/** Live disputes queue with SLA deadlines and decisions. */
export function LiveDisputes() {
  const qc = useQueryClient();
  const listFn = useServerFn(listDisputeCases);
  const resolve = useServerFn(resolveDisputeCase);
  const cases = useQuery({ queryKey: ["live-disputes"], queryFn: () => listFn() });
  const [pick, setPick] = useState<Record<string, { outcome: string; pct: string; note: string }>>({});
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-lg font-bold">Live disputes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Real cases opened by members. Supplier response 48h · evidence 72h · decision within 7 days.
        </p>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <div className="mt-4 space-y-3">
          {(cases.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No live disputes.</p>}
          {(cases.data ?? []).map((c: any) => {
            const p = pick[c.id] ?? { outcome: "full_refund", pct: "50", note: "" };
            const overdue = c.status !== "resolved" && new Date(c.resolution_deadline).getTime() < Date.now();
            return (
              <div key={c.id} className="rounded-md border p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link to="/console/deals/$dealId" params={{ dealId: c.deal_id }} className="font-semibold text-primary hover:underline">
                    {c.deals?.ref} — {c.deals?.title}
                  </Link>
                  <span className={overdue ? "text-destructive" : "text-muted-foreground"}>
                    {c.status.replace(/_/g, " ")}
                    {overdue ? " · overdue" : ""}
                  </span>
                </div>
                <p className="mt-1">
                  <b>{c.reason.replace(/_/g, " ")}</b> — {c.details}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Opened {fmt(c.created_at)} · response by {fmt(c.response_deadline)} · evidence by {fmt(c.evidence_deadline)} · decision by{" "}
                  {fmt(c.resolution_deadline)}
                </p>
                {c.status === "resolved" ? (
                  <p className="mt-2">
                    Decision: {c.outcome?.replace(/_/g, " ")} (buyer {c.buyer_percent}%) — {c.resolution_note}
                  </p>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <select
                      value={p.outcome}
                      onChange={(e) => setPick({ ...pick, [c.id]: { ...p, outcome: e.target.value } })}
                      className="h-9 rounded-md border border-input bg-background px-2"
                    >
                      <option value="full_refund">Full refund to buyer</option>
                      <option value="full_release">Full release to seller</option>
                      <option value="partial_settlement">Partial settlement</option>
                    </select>
                    {p.outcome === "partial_settlement" && (
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={p.pct}
                        onChange={(e) => setPick({ ...pick, [c.id]: { ...p, pct: e.target.value } })}
                        className="h-9 w-24"
                        aria-label="Buyer percent"
                      />
                    )}
                    <Input
                      value={p.note}
                      onChange={(e) => setPick({ ...pick, [c.id]: { ...p, note: e.target.value } })}
                      placeholder="Decision reason"
                      className="h-9 min-w-48 flex-1"
                    />
                    <Button
                      size="sm"
                      disabled={p.note.trim().length < 5}
                      onClick={async () => {
                        setError(null);
                        try {
                          await resolve({
                            data: {
                              disputeId: c.id,
                              outcome: p.outcome,
                              buyerPercent: Number(p.pct),
                              note: p.note.trim(),
                            },
                          });
                          qc.invalidateQueries();
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Could not save the decision.");
                        }
                      }}
                    >
                      Record decision
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
