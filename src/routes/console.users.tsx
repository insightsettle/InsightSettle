import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Search, ShieldCheck, UserX } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listPlatformUsers, setStaffRole, setVerificationStatus, verifyBusinessProfile, verifyPayoutAccount } from "@/lib/admin.functions";
import { useLocale } from '@/lib/locale';
import { formatDate, formatSAR } from "@/lib/demo-data";
import { AccountStateControl } from "@/components/site/StaffOps";

export const Route = createFileRoute("/console/users")({
  head: () => ({ meta: [
    { title: "Members | Insight staff console" },
    { name: "description", content: "Review Insight members and account status." },
    { property: "og:title", content: "Members | Insight staff console" },
    { property: "og:description", content: "Review Insight members and account status." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: ConsoleUsers,
});

const statusTone: Record<string, string> = {
  verified: "bg-primary/10 text-primary",
  pending: "bg-warning/10 text-warning",
  rejected: "bg-destructive/10 text-destructive",
};

function ConsoleUsers() {
  const { text } = useLocale();
  const queryClient = useQueryClient();
  const fetchUsers = useServerFn(listPlatformUsers);
  const updateVerification = useServerFn(setVerificationStatus);
  const updateStaff = useServerFn(setStaffRole);
  const [term, setTerm] = useState("");
  const businessFn = useServerFn(verifyBusinessProfile);
  const payoutFn = useServerFn(verifyPayoutAccount);
  const approval = useMutation({ mutationFn: (v: { userId: string; kind: 'business' | 'payout' }) => v.kind === 'business' ? businessFn({ data: { userId: v.userId } }) : payoutFn({ data: { userId: v.userId } }), onSuccess: () => { refresh(); queryClient.invalidateQueries({ queryKey: ['audit-log'] }); } });

  const users = useQuery({ queryKey: ["platform-users"], queryFn: () => fetchUsers({}) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["platform-users"] });

  const verify = useMutation({
    mutationFn: (vars: { userId: string; status: "pending" | "verified" | "rejected" }) =>
      updateVerification({ data: vars }),
    onSuccess: refresh,
  });
  const staff = useMutation({
    mutationFn: (vars: { userId: string; isStaff: boolean }) => updateStaff({ data: vars }),
    onSuccess: refresh,
  });

  const rows = (users.data ?? []).filter((u) => {
    const q = term.trim().toLowerCase();
    if (!q) return true;
    return [u.email, u.fullName, u.phone].some((v) => v?.toLowerCase().includes(q));
  });

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Registered members</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Everyone who signed up on Insight, with identity checks and team access.
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search name, email or phone"
            className="pl-9"
          />
        </div>
      </div>

      {users.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading members…</p>
      ) : users.isError ? (
        <p className="mt-6 text-sm text-destructive">Could not load members.</p>
      ) : (
        <div className="mt-5 space-y-3">
          {approval.isError && <p role="alert" className="text-destructive">{text('Verification failed. Approve identity and check submitted details first.', 'تعذّر التوثيق. وافق على الهوية وتحقق من البيانات المقدّمة أولًا.')}</p>}
          {rows.map((u) => (
            <Card key={u.id}>
              <CardContent className="grid gap-4 p-5 lg:grid-cols-[1.4fr_1fr_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{u.fullName ?? "Unnamed member"}</p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusTone[u.verificationStatus] ?? "bg-muted text-muted-foreground"}`}
                    >
                      {u.verificationStatus}
                    </span>
                    {u.isStaff && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2.5 py-0.5 text-xs font-semibold">
                        <ShieldCheck className="size-3" /> Insight team
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground" dir="ltr">
                    {u.email}
                    {u.phone ? ` · ${u.phone}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Joined {formatDate(u.createdAt)}
                    {u.lastSignInAt ? ` · last seen ${formatDate(u.lastSignInAt)}` : ""}
                  </p>
                </div>
                <div className="text-sm">
                  <p className="font-semibold">
                    {u.dealCount} deal{u.dealCount === 1 ? "" : "s"}
                  </p>
                  <p className="text-muted-foreground">{formatSAR(u.dealValue)} total value</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline"><Link to="/console/users/$userId" params={{userId:u.id}}>{text("Customer 360","ملف العميل الشامل")}</Link></Button>
                  {u.businessStatus && u.businessStatus !== 'verified' && <Button size="sm" variant="outline" disabled={approval.isPending || u.verificationStatus !== 'verified'} onClick={() => approval.mutate({ userId: u.id, kind: 'business' })}><BadgeCheck />{text('Verify business profile','توثيق السجل التجاري')}</Button>}
                  {u.hasPayout && !u.payoutVerified && <div className="space-y-1"><Button size="sm" variant="outline" disabled={approval.isPending || u.verificationStatus !== 'verified'} onClick={() => approval.mutate({ userId: u.id, kind: 'payout' })}><BadgeCheck />{text('Verify payout account','توثيق حساب الصرف')}</Button><p className="text-xs text-warning">{text('Demo: provider check simulated','تجريبي: تحقق مزوّد الدفع محاكى')}</p></div>}
                  {u.verificationStatus !== "verified" && (
                    <Button
                      size="sm"
                      onClick={() => verify.mutate({ userId: u.id, status: "verified" })}
                    >
                      <BadgeCheck /> Approve identity
                    </Button>
                  )}
                  {u.verificationStatus !== "rejected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => verify.mutate({ userId: u.id, status: "rejected" })}
                    >
                      <UserX /> Reject
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={u.isStaff ? "outline" : "secondary"}
                    onClick={() => staff.mutate({ userId: u.id, isStaff: !u.isStaff })}
                  >
                    {u.isStaff ? "Remove team access" : "Grant team access"}
                  </Button>
                </div>
                <div className="lg:col-span-3">
                  <AccountStateControl userId={u.id} state={(u as { accountState?: string }).accountState} />
                </div>
              </CardContent>
            </Card>
          ))}
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground">No members match that search.</p>
          )}
        </div>
      )}
    </div>
  );
}
