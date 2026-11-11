import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getLocalSession } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (location.pathname.startsWith("/admin")) return;
    if (getLocalSession()?.user) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) return;
      const { data } = await supabase.auth.getUser();
      if (data.user) return;
    } catch {
      if (getLocalSession()?.user) return;
    }
    throw redirect({ to: "/login" });
  },
  component: () => <Outlet />,
});
