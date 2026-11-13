import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AuthorStudio } from "@/components/AuthorStudio";
import { AccountView } from "@/components/AccountView";
import { DashboardShell } from "@/components/DashboardShell";
import { useLocale } from "@/lib/locale";
import { PenLine, Sparkles } from "lucide-react";

type View = "studio" | "plans";

export const Route = createFileRoute("/_authenticated/author")({
  validateSearch: (s: Record<string, unknown>): { view?: View } =>
    s["view"] === "plans" ? { view: "plans" } : {},
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "لوحة المؤلف — unibook" },
      { name: "description", content: "ارفع مخطوطك وتابع الإنتاج والفواتير والأرباح وباقات النشر في unibook." },
      { property: "og:title", content: "لوحة المؤلف — unibook" },
      { property: "og:description", content: "ارفع مخطوطك وتابع الإنتاج والفواتير والأرباح وباقات النشر في unibook." },
    ],
  }),
  component: AuthorPage,
});

function AuthorPage() {
  const l = useLocale();
  const { view = "studio" } = Route.useSearch();
  const navigate = useNavigate({ from: "/author" });

  useEffect(() => {
    const onTab = () => {
      if (view === "plans") {
        void navigate({ search: {} });
      }
    };
    window.addEventListener("unibook_author_tab", onTab);
    return () => window.removeEventListener("unibook_author_tab", onTab);
  }, [view, navigate]);

  const item = (v: View, label: string, Icon: typeof PenLine) => (
    <button
      type="button"
      onClick={() => navigate({ search: v === "plans" ? { view: "plans" } : {} })}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
        view === v ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
  return (
    <DashboardShell role="author">
      <div className="mx-auto max-w-7xl px-4 pt-6">
        <div className="inline-flex gap-1 rounded-2xl border border-border/60 bg-muted/70 p-1">
          {item("studio", l.t("استوديو المؤلف", "Author studio"), PenLine)}
          {item("plans", l.t("باقات النشر", "Publishing plans"), Sparkles)}
        </div>
      </div>
      {view === "studio" ? <AuthorStudio /> : <AccountView mode="author" />}
    </DashboardShell>
  );
}