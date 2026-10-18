import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AuthShell } from "@/components/site/AuthShell";
import { useLocale } from "@/lib/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth_/reset")({
  head: () => ({
    meta: [
      { title: "Set a new password | Insight" },
      { property: "og:title", content: "Set a new password | Insight" },
      { property: "og:description", content: "Choose a new password for your Insight account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "description", content: "Choose a new password for your Insight account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPage,
});

/** Opened from the password-reset email: the link signs the user in for recovery, then a new password is set. */
function ResetPage() {
  const { text } = useLocale();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [needsCurrentPassword, setNeedsCurrentPassword] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) setReady(true);
    });
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const tokenHash = params.get("token_hash");
    const recover = code
      ? supabase.auth.exchangeCodeForSession(code)
      : tokenHash && params.get("type") === "recovery"
        ? supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })
        : null;
    if (recover) void recover.then(({ error: recoveryError }) => {
      if (!recoveryError) {
        setReady(true);
        window.history.replaceState(null, "", window.location.pathname);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError(text("Use at least 8 characters.", "استخدم 8 أحرف على الأقل."));
    if (password !== confirm) return setError(text("The two passwords do not match.", "كلمتا المرور غير متطابقتين."));
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password, ...(needsCurrentPassword ? { current_password: currentPassword } : {}) });
      if (updateError?.code === "current_password_required") {
        setNeedsCurrentPassword(true);
        setError(text("Enter your current password to confirm this change, or use the password-reset email link.", "أدخل كلمة المرور الحالية لتأكيد التغيير، أو استخدم رابط استعادة كلمة المرور المرسل بالبريد."));
        return;
      }
      if (updateError) throw updateError;
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      setError(text("The password could not be changed. Please try again.", "تعذّر تغيير كلمة المرور. حاول مرة أخرى."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <div>
        <h1 className="text-3xl font-extrabold">{text("Set a new password", "تعيين كلمة مرور جديدة")}</h1>
        <Card className="mt-6">
          <CardContent className="p-6">
            {!ready ? (
              <p className="text-sm text-muted-foreground">
                {text("Open this page from the link in the password-reset email. If the link has expired, request a new one from the sign-in page.", "افتح الصفحة من رابط رسالة استعادة كلمة المرور. إذا انتهت صلاحيته، اطلب رابطاً جديداً من صفحة الدخول.")}
              </p>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                {needsCurrentPassword && <div className="space-y-2">
                  <Label htmlFor="current-password">{text("Current password", "كلمة المرور الحالية")}</Label>
                  <Input id="current-password" type="password" dir="ltr" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
                </div>}
                <div className="space-y-2">
                  <Label htmlFor="new-password">{text("New password", "كلمة المرور الجديدة")}</Label>
                  <Input id="new-password" type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">{text("Confirm the new password", "تأكيد كلمة المرور الجديدة")}</Label>
                  <Input id="confirm-password" type="password" dir="ltr" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" />
                </div>
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                <Button className="w-full" type="submit" disabled={busy}>
                  {busy ? text("Please wait…", "يرجى الانتظار…") : text("Save the new password", "حفظ كلمة المرور الجديدة")}
                </Button>
              </form>
            )}
            <Button asChild variant="link" className="mt-4 w-full"><Link to="/auth">{text("Back to sign in", "العودة إلى تسجيل الدخول")}</Link></Button>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
