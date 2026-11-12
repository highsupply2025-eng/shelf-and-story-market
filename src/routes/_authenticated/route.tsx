import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // /admin renders its own sign-in card for signed-out visitors.
    if (location.pathname.startsWith("/admin")) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) throw redirect({ to: "/login" });
  },
  component: () => <Outlet />,
});
