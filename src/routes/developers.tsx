import { createFileRoute, redirect } from "@tanstack/react-router";

/** The technical guide lives in the business account (/partner-guide); the public page is the overview at /business-api. */
export const Route = createFileRoute("/developers")({
  beforeLoad: () => {
    throw redirect({ to: "/business-api", replace: true });
  },
});
