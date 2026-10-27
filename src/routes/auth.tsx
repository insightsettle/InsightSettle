import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AuthShell } from "@/components/site/AuthShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/lib/locale";
import { lovable } from "@/integrations/lovable/index";
import { takeReturnTo } from "@/lib/return-to";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: "signup" } =>
    search["mode"] === "signup" ? { mode: "signup" } : {},
  head: () => ({
    meta: [
      { title: "Sign in or create an account | Insight" },
      {
        name: "description",
        content:
          "Create your Insight account or sign in to open escrow deals, fund them, and track delivery.",
      },
      { property: "og:title", content: "Sign in to Insight" },
      {
        property: "og:description",
        content: "Accounts for buyers and sellers using Insight escrow.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { text } = useLocale();
  const navigate = useNavigate();
  const search = Route.useSearch();
  // After sign-in, continue to a saved deal link or invitation if there is one.
  const goOn = () => { const next = takeReturnTo(); if (next) navigate({ href: next, replace: true }); else navigate({ to: "/dashboard", replace: true }); };
  const [mode, setMode] = useState<"signin" | "signup">(
    search.mode === "signup" ? "signup" : "signin",
  );
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setMode(search.mode === "signup" ? "signup" : "signin");
  }, [search.mode]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) goOn();
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signup") {
        if (!consent) throw new Error(text("Please agree to the terms and privacy policy to continue.", "وافق على الشروط وسياسة الخصوصية للمتابعة."));
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/auth/confirmed",
            data: { full_name: fullName, phone, pdpl_consent_at: new Date().toISOString() },
          },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          goOn();
        } else {
          navigate({ to: "/auth/check-email", replace: true });
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        goOn();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (/email not confirmed/i.test(msg)) {
        setError(text("Your email isn't confirmed yet. Open the confirmation link we sent to your inbox, then sign in.", "لم يُؤكد بريدك بعد. افتح رابط التأكيد في بريدك ثم سجّل الدخول."));
        return;
      }
      if (/invalid login credentials/i.test(msg)) {
        setError(text("The email or password is incorrect. Check them or create a new account.", "البريد الإلكتروني أو كلمة المرور غير صحيحة. تحقّق منهما أو أنشئ حساباً."));
        return;
      }
      setError(text("Something went wrong. Please try again.", "تعذّر إكمال الطلب. حاول مرة أخرى."));
    } finally {
      setBusy(false);
    }
  }

  async function handleForgot() {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError(text("Enter your email above first, then choose \"Forgot password?\".", "أدخل بريدك الإلكتروني أولاً، ثم اختر «نسيت كلمة المرور؟»."));
      return;
    }
    setBusy(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + "/auth/reset",
      });
      if (resetError) throw resetError;
      setNotice(text("If this email has an account, a link to set a new password is on its way. Check your inbox.", "إذا كان لهذا البريد حساب، فستصلك رسالة لتعيين كلمة مرور جديدة. تحقّق من بريدك."));
    } catch {
      setError(text("The reset link could not be sent right now. Please try again in a minute.", "تعذّر إرسال رابط الاستعادة الآن. حاول بعد دقيقة."));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError(text("Google sign-in did not complete. Please try again.", "لم يكتمل الدخول باستخدام Google. حاول مرة أخرى."));
      return;
    }
    if (result.redirected) return;
    goOn();
  }

  return (
    <AuthShell>
      <div>
        <h1 className="text-3xl font-extrabold">
          {mode === "signin" ? text("Welcome back", "مرحبًا بعودتك") : text("Create your account", "أنشئ حسابك")}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {mode === "signin"
            ? text("Sign in to reach your dashboard, deals, and documents.", "سجّل الدخول للوصول إلى صفقاتك ومستنداتك.")
            : text("One account for creating deals, receiving deals, and tracking delivery.", "حساب واحد لإنشاء الصفقات واستقبالها ومتابعة التسليم.")}
        </p>

        <Card className="mt-6">
          <CardContent className="p-6">
            <Button variant="outline" className="w-full" onClick={handleGoogle} type="button">
              {text("Continue with Google", "المتابعة مع Google")}
            </Button>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              {text("or use your email", "أو استخدم بريدك الإلكتروني")}
              <span className="h-px flex-1 bg-border" />
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {mode === "signup" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">{text("Full name", "الاسم الكامل")}</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{text("Mobile number", "رقم الجوال")}</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      inputMode="tel"
                      dir="ltr"
                      autoComplete="tel"
                      placeholder="+966 5X XXX XXXX"
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">{text("Email", "البريد الإلكتروني")}</Label>
                <Input
                  id="email"
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{text("Password", "كلمة المرور")}</Label>
                <Input
                  id="password"
                  type="password"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
              </div>

              {mode === "signup" && (
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 size-4"
                  />
                  <span>
                    {text("I agree to the", "أوافق على")} {" "}
                    <a href="/terms" className="text-primary hover:underline">{text("terms of service", "شروط الخدمة")}</a> {text("and consent to Insight processing my personal data under the", "وأوافق على معالجة إنسايت لبياناتي الشخصية وفق")} {" "}
                    <a href="/privacy" className="text-primary hover:underline">{text("privacy policy", "سياسة الخصوصية")}</a> ({text("Saudi PDPL", "نظام حماية البيانات الشخصية السعودي")}).
                  </span>
                </label>
              )}
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              {notice && <p role="status" className="text-sm text-primary">{notice}</p>}

              <Button className="w-full" type="submit" disabled={busy}>
                {busy ? text("Please wait…", "يرجى الانتظار…") : mode === "signin" ? text("Sign in", "تسجيل الدخول") : text("Create account", "إنشاء حساب")}
              </Button>
              {mode === "signin" && (
                <Button type="button" variant="link" className="w-full whitespace-normal text-center" onClick={handleForgot} disabled={busy}>
                  {text("Forgot password?", "نسيت كلمة المرور؟")}
                </Button>
              )}
            </form>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              {mode === "signin" ? text("New to Insight?", "جديد في إنسايت؟") : text("Already have an account?", "لديك حساب بالفعل؟")}{" "}
              <Button variant="link"
                type="button"
                className="font-semibold text-primary hover:underline"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setError(null);
                  setNotice(null);
                }}
              >
                {mode === "signin" ? text("Create an account", "إنشاء حساب") : text("Sign in", "تسجيل الدخول")}
              </Button>
            </p>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
