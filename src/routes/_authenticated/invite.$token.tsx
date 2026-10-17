import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { acceptDealInvite } from "@/lib/invites.functions";
import { useLocale } from "@/lib/locale";

export const Route = createFileRoute("/_authenticated/invite/$token")({
  head: () => ({
    meta: [
      { title: "Deal invitation | Insight" },
      { name: "description", content: "Accept an escrow deal invitation from the other party." },
      { property: "og:title", content: "Deal invitation" },
      { property: "og:description", content: "Join a deal you were invited to." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const accept = useServerFn(acceptDealInvite);
  const navigate = useNavigate();
  const { text } = useLocale();
  const [message, setMessage] = useState("Joining the deal…");

  useEffect(() => {
    let active = true;
    accept({ data: { token } })
      .then((result) => {
        if (!active) return;
        if (result.ok) {
          navigate({ to: "/deals/$dealId", params: { dealId: result.ref }, replace: true });
          return;
        }
        setMessage(
          result.reason === "not_found"
            ? "This invitation link is not valid any more."
            : "This deal already has both parties.",
        );
      })
      .catch(() => {
        if (active) setMessage("We could not join you to this deal. Please try again.");
      });
    return () => {
      active = false;
    };
  }, [accept, navigate, token]);

  return (
    <SiteShell>
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">{text('Deal invitation', 'دعوة صفقة')}</h1>
        <p className="mt-3 text-muted-foreground">{message}</p>
        <Button asChild className="mt-6">
          <Link to="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    </SiteShell>
  );
}
