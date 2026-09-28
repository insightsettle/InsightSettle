import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { gccCountries } from "@/lib/deals";

const db = supabase as any;
const sel = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

/** GCC IBAN: country code + 2 check digits + BBAN of fixed length, mod-97 valid. */
const ibanLengths: Record<string, number> = { SA: 24, AE: 23, BH: 22, QA: 29, KW: 30, OM: 23 };
export function validIban(raw: string) {
  const iban = raw.replace(/\s+/g, "").toUpperCase();
  const len = ibanLengths[iban.slice(0, 2)];
  if (!len || iban.length !== len || !/^[A-Z0-9]+$/.test(iban)) return false;
  const moved = iban.slice(4) + iban.slice(0, 4);
  const digits = moved.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rem = 0;
  for (const d of digits) rem = (rem * 10 + Number(d)) % 97;
  return rem === 1;
}

function useUid() {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);
  return uid;
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

export function PersonalDetailsCard() {
  const uid = useUid();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["kyc-profile", uid],
    enabled: !!uid,
    queryFn: async () => (await db.from("profiles").select("*").eq("id", uid).maybeSingle()).data,
  });
  const [f, setF] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (q.data)
      setF({
        full_name: q.data.full_name ?? "",
        phone: q.data.phone ?? "",
        nationality: q.data.nationality ?? "",
        date_of_birth: q.data.date_of_birth ?? "",
        id_type: q.data.id_type ?? "national_id",
        id_number: q.data.id_number ?? "",
        address: q.data.address ?? "",
        country: q.data.country ?? "SA",
        account_type: q.data.account_type ?? "individual",
      });
  }, [q.data]);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <Card className="mt-4">
      <CardContent className="p-6">
        <h2 className="font-bold">Personal details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field id="fn" label="Full name (as on ID)"><Input id="fn" value={f["full_name"] ?? ""} onChange={set("full_name")} /></Field>
          <Field id="ph" label="Mobile (+966…)"><Input id="ph" dir="ltr" value={f["phone"] ?? ""} onChange={set("phone")} /></Field>
          <Field id="nat" label="Nationality"><Input id="nat" value={f["nationality"] ?? ""} onChange={set("nationality")} /></Field>
          <Field id="dob" label="Date of birth"><Input id="dob" type="date" value={f["date_of_birth"] ?? ""} onChange={set("date_of_birth")} /></Field>
          <Field id="idt" label="ID type">
            <select id="idt" className={sel} value={f["id_type"] ?? "national_id"} onChange={set("id_type")}>
              <option value="national_id">National ID</option>
              <option value="iqama">Iqama (residence)</option>
              <option value="passport">Passport</option>
              <option value="gcc_id">GCC ID</option>
            </select>
          </Field>
          <Field id="idn" label="ID number"><Input id="idn" dir="ltr" value={f["id_number"] ?? ""} onChange={set("id_number")} /></Field>
          <Field id="ctry" label="Country of residence">
            <select id="ctry" className={sel} value={f["country"] ?? "SA"} onChange={set("country")}>
              {gccCountries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </Field>
          <Field id="acct" label="Account type">
            <select id="acct" className={sel} value={f["account_type"] ?? "individual"} onChange={set("account_type")}>
              <option value="individual">Individual</option>
              <option value="business">Business</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field id="addr" label="Address"><Input id="addr" value={f["address"] ?? ""} onChange={set("address")} /></Field>
          </div>
        </div>
        <Button
          className="mt-4"
          onClick={async () => {
            const phoneOk = !f["phone"] || /^\+9(66|71|73|74|65|68)\d{7,9}$/.test((f["phone"] ?? "").replace(/\s+/g, ""));
            if (!phoneOk) return setMsg("Enter a GCC mobile number starting with +966, +971, +973, +974, +965 or +968.");
            const { error } = await db.from("profiles").update({ ...f, date_of_birth: f["date_of_birth"] || null }).eq("id", uid);
            setMsg(error ? error.message : "Saved.");
            qc.invalidateQueries({ queryKey: ["kyc-profile"] });
          }}
        >
          Save details
        </Button>
        {msg && <p className="mt-2 text-sm text-muted-foreground">{msg}</p>}
      </CardContent>
    </Card>
  );
}

export function BusinessDetailsCard() {
  const uid = useUid();
  const q = useQuery({
    queryKey: ["business-profile", uid],
    enabled: !!uid,
    queryFn: async () => (await db.from("business_profiles").select("*").eq("user_id", uid).maybeSingle()).data,
  });
  const [f, setF] = useState({ legal_name: "", registration_number: "", country: "SA", tax_number: "", authorized_person: "" });
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (q.data) setF({ legal_name: q.data.legal_name, registration_number: q.data.registration_number, country: q.data.country, tax_number: q.data.tax_number ?? "", authorized_person: q.data.authorized_person ?? "" });
  }, [q.data]);
  return (
    <Card className="mt-4">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Business details (companies only)</h2>
          {q.data && <span className="text-xs text-muted-foreground">{q.data.verification_status}</span>}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field id="ln" label="Company legal name"><Input id="ln" value={f.legal_name} onChange={(e) => setF({ ...f, legal_name: e.target.value })} /></Field>
          <Field id="cr" label="Commercial registration (CR) number"><Input id="cr" dir="ltr" value={f.registration_number} onChange={(e) => setF({ ...f, registration_number: e.target.value })} /></Field>
          <Field id="bc" label="Country">
            <select id="bc" className={sel} value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}>
              {gccCountries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </Field>
          <Field id="vat" label="VAT / tax number"><Input id="vat" dir="ltr" value={f.tax_number} onChange={(e) => setF({ ...f, tax_number: e.target.value })} /></Field>
          <Field id="ap" label="Authorised person"><Input id="ap" value={f.authorized_person} onChange={(e) => setF({ ...f, authorized_person: e.target.value })} /></Field>
        </div>
        <Button
          className="mt-4"
          variant="outline"
          disabled={!f.legal_name || !f.registration_number}
          onClick={async () => {
            if (f.country === "SA" && f.tax_number && !/^3\d{13}3$/.test(f.tax_number)) return setMsg("A Saudi VAT number has 15 digits and starts and ends with 3.");
            const { error } = await db.from("business_profiles").upsert({ user_id: uid, ...f }, { onConflict: "user_id" });
            setMsg(error ? error.message : "Saved — the Insight team will verify it.");
          }}
        >
          Save business details
        </Button>
        {msg && <p className="mt-2 text-sm text-muted-foreground">{msg}</p>}
      </CardContent>
    </Card>
  );
}

export function PayoutAccountCard() {
  const uid = useUid();
  const q = useQuery({
    queryKey: ["payout-account", uid],
    enabled: !!uid,
    queryFn: async () => (await db.from("payout_accounts").select("*").eq("user_id", uid).maybeSingle()).data,
  });
  const [f, setF] = useState({ account_name: "", bank_name: "", iban: "", country: "SA" });
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (q.data) setF({ account_name: q.data.account_name, bank_name: q.data.bank_name, iban: q.data.iban, country: q.data.country });
  }, [q.data]);
  return (
    <Card className="mt-4">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Settlement bank account</h2>
          {q.data && <span className="text-xs text-muted-foreground">{q.data.verified ? "Verified" : "Awaiting verification"}</span>}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Where your released funds are paid. The account name must match your verified identity.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field id="an" label="Account holder name"><Input id="an" value={f.account_name} onChange={(e) => setF({ ...f, account_name: e.target.value })} /></Field>
          <Field id="bn" label="Bank name"><Input id="bn" value={f.bank_name} onChange={(e) => setF({ ...f, bank_name: e.target.value })} /></Field>
          <Field id="iban" label="IBAN"><Input id="iban" dir="ltr" value={f.iban} onChange={(e) => setF({ ...f, iban: e.target.value.toUpperCase() })} placeholder="SA03 8000 0000 6080 1016 7519" /></Field>
          <Field id="pc" label="Bank country">
            <select id="pc" className={sel} value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}>
              {gccCountries.filter((c) => c.code !== "OTHER").map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </Field>
        </div>
        <Button
          className="mt-4"
          variant="outline"
          onClick={async () => {
            const iban = f.iban.replace(/\s+/g, "");
            if (!validIban(iban)) return setMsg("This IBAN is not valid. Check the country code, length and digits.");
            if (iban.slice(0, 2) !== f.country) return setMsg("The IBAN country does not match the bank country.");
            const { error } = await db.from("payout_accounts").upsert({ user_id: uid, ...f, iban, verified: false }, { onConflict: "user_id" });
            setMsg(error ? error.message : "Saved — Insight verifies the account before the first payout.");
          }}
        >
          Save bank account
        </Button>
        {msg && <p className="mt-2 text-sm text-muted-foreground">{msg}</p>}
      </CardContent>
    </Card>
  );
}
