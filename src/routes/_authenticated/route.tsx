import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { ClientShell } from "@/components/site/ClientShell";

import { supabase } from "@/integrations/supabase/client";
import { setReturnTo } from "@/lib/return-to";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      // An invitation link opened while signed out: come back to it after sign-in.
      setReturnTo(location.pathname);
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: () => <ClientShell><Outlet /></ClientShell>,
});
