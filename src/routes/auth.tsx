import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: "signup" } =>
    search['mode'] === "signup" ? { mode: "signup" } : {},
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
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">(
    search.mode === "signup" ? "signup" : "signin",
  );
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/dashboard",
            data: { full_name: fullName, phone },
          },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          navigate({ to: "/dashboard", replace: true });
        } else {
          setNotice("Check your inbox and confirm your email address to activate the account.");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
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
      setError("Google sign-in did not complete. Please try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
        <h1 className="text-3xl font-extrabold">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {mode === "signin"
            ? "Sign in to reach your dashboard, deals, and documents."
            : "One account for creating deals, receiving deals, and tracking delivery."}
        </p>

        <Card className="mt-6">
          <CardContent className="p-6">
            <Button variant="outline" className="w-full" onClick={handleGoogle} type="button">
              Continue with Google
            </Button>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or use your email
              <span className="h-px flex-1 bg-border" />
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {mode === "signup" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Mobile number</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="+966 5X XXX XXXX"
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
              {notice && <p className="text-sm text-primary">{notice}</p>}

              <Button className="w-full" type="submit" disabled={busy}>
                {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              {mode === "signin" ? "New to Insight?" : "Already have an account?"}{" "}
              <button
                type="button"
                className="font-semibold text-primary hover:underline"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setError(null);
                  setNotice(null);
                }}
              >
                {mode === "signin" ? "Create an account" : "Sign in"}
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </SiteShell>
  );
}
