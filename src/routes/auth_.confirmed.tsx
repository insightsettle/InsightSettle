import { Link, createFileRoute } from "@tanstack/react-router";
import { CircleCheck } from "lucide-react";

import { AuthShell } from "@/components/site/AuthShell";
import { useLocale } from "@/lib/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/auth_/confirmed")({
  head: () => ({
    meta: [
      { title: "Email confirmed | Insight" },
      {
        name: "description",
        content: "Your email address was confirmed. You can now sign in to Insight.",
      },
      { property: "og:title", content: "Email confirmed | Insight" },
      {
        property: "og:description",
        content: "Your email address was confirmed. You can now sign in to Insight.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConfirmedPage,
});

function ConfirmedPage() {
  const { text } = useLocale();
  return (
    <AuthShell>
      <div>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
              <CircleCheck className="size-7 text-primary" />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold">{text('Your email is confirmed', 'تم تأكيد بريدك الإلكتروني')}</h1>
            <p className="mt-3 text-muted-foreground">
              {text("Your account is now active. Sign in to start creating and tracking your escrow deals.", "حسابك مفعّل الآن. سجّل الدخول لإنشاء صفقاتك ومتابعتها.")}
            </p>
            <Button asChild className="mt-6 w-full">
              <Link to="/auth">{text('Sign in', 'تسجيل الدخول')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
