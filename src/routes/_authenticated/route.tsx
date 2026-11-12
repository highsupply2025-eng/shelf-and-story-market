import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getLocalSession } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (location.pathname.startsWith("/admin")) return;
    if (getLocalSession()?.user) return;
    try {
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
      const sessionRes = await Promise.race([supabase.auth.getSession(), timeout]);
      if (sessionRes && sessionRes.data.session?.user) return;
      if (getLocalSession()?.user) return;
    } catch {
      if (getLocalSession()?.user) return;
    }
    throw redirect({ to: "/login" });
  },
  component: () => <Outlet />,
});
