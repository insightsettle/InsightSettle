import { Link, createFileRoute } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/auth/check-email")({
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
  return (
    <SiteShell>
      <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
              <MailCheck className="size-7 text-primary" />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold">Your account was created</h1>
            <p className="mt-3 text-muted-foreground">
              We sent a confirmation link to your email address. Open it and click the link to
              activate your account, then come back and sign in.
            </p>
            <Button asChild className="mt-6 w-full">
              <Link to="/auth">Go to sign in</Link>
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">
              Didn't receive the email? Check your spam folder.
            </p>
          </CardContent>
        </Card>
      </div>
    </SiteShell>
  );
}
