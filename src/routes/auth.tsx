import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => search,
  beforeLoad: ({ search }) => {
    const mode = search?.["mode"];
    if (mode === "up" || mode === "register" || mode === "signup") {
      throw redirect({ to: "/register" });
    }
    throw redirect({ to: "/login" });
  },
  component: AuthRedirect,
});

function AuthRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get("mode");
      if (mode === "up" || mode === "register" || mode === "signup") {
        window.location.replace("/register");
      } else {
        window.location.replace("/login");
      }
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
