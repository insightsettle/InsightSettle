import { ShieldCheck } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type Phase = "loading" | "ok" | "enroll" | "verify";

/** Staff must pass two-step verification (authenticator app) before the console opens. */
export function MfaGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === "aal2") return setPhase("ok");
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verified = factors?.totp?.find((f) => f.status === "verified");
      if (verified) {
        setFactorId(verified.id);
        return setPhase("verify");
      }
      // Clean up half-finished enrolments, then start a new one.
      for (const f of factors?.all ?? []) if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      const { data, error: e } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Insight staff ${Date.now()}` });
      if (e || !data) return setError(e?.message ?? "Two-step setup is unavailable.");
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      setPhase("enroll");
    })();
  }, []);

  if (phase === "ok") return <>{children}</>;

  async function submit() {
    if (!factorId) return;
    setError(null);
    const { data: ch, error: e1 } = await supabase.auth.mfa.challenge({ factorId });
    if (e1 || !ch) return setError(e1?.message ?? "Try again.");
    const { error: e2 } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code: code.trim() });
    if (e2) return setError("That code is not correct. Check the time on your phone and try again.");
    setPhase("ok");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <Card>
        <CardContent className="p-6 text-center">
          <ShieldCheck className="mx-auto size-8 text-primary" />
          <h1 className="mt-3 text-xl font-extrabold">Two-step verification</h1>
          {phase === "loading" && <p className="mt-3 text-sm text-muted-foreground">Checking…</p>}
          {phase === "enroll" && (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                Staff accounts need an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password). Scan the code, then enter the 6 digits.
              </p>
              {qr && <img src={qr} alt="Authenticator QR code" className="mx-auto mt-4 size-44 bg-background" />}
              {secret && (
                <p className="mt-2 break-all text-xs text-muted-foreground" dir="ltr">
                  {secret}
                </p>
              )}
            </>
          )}
          {phase === "verify" && <p className="mt-2 text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>}
          {phase !== "loading" && (
            <div className="mt-4 flex gap-2">
              <Input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} placeholder="123456" dir="ltr" />
              <Button onClick={submit} disabled={code.trim().length !== 6}>
                Verify
              </Button>
            </div>
          )}
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
