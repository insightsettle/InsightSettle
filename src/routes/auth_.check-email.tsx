import { Link, createFileRoute } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";

import { AuthShell } from "@/components/site/AuthShell";
import { useLocale } from "@/lib/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/auth_/check-email")({
  head: () => ({
    meta: [
      { title: "Confirm your email | Insight" },
      {
        name: "description",
        content:
          "Your Insight account was created. Confirm your email address to activate it.",
      },
      { property: "og:title", content: "Confirm your email | Insight" },
      {
        property: "og:description",
        content: "Confirm your email address to activate your Insight account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CheckEmailPage,
});

function CheckEmailPage() {
  const { text } = useLocale();
  return (
    <AuthShell>
      <div>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
              <MailCheck className="size-7 text-primary" />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold">{text('Your account was created', 'تم إنشاء حسابك')}</h1>
            <p className="mt-3 text-muted-foreground">
              {text("We sent a confirmation link to your email address. Open it to activate your account, then come back and sign in.", "أرسلنا رابط تأكيد إلى بريدك. افتحه لتفعيل حسابك، ثم عد وسجّل الدخول.")}
            </p>
            <Button asChild className="mt-6 w-full">
              <Link to="/auth">{text('Go to sign in', 'الانتقال إلى تسجيل الدخول')}</Link>
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">
              {text("Didn't receive the email? Check your spam folder.", 'لم تصلك الرسالة؟ تحقّق من البريد غير المرغوب فيه.')}
            </p>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
