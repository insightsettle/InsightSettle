import { Link, createFileRoute } from "@tanstack/react-router";
import { CircleCheck } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/auth/confirmed")({
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
  return (
    <SiteShell>
      <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
              <CircleCheck className="size-7 text-primary" />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold">Your email is confirmed</h1>
            <p className="mt-3 text-muted-foreground">
              Your account is now active. Sign in to start creating and tracking your escrow
              deals.
            </p>
            <Button asChild className="mt-6 w-full">
              <Link to="/auth">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </SiteShell>
  );
}
