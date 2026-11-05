import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AuthorStudio } from "@/components/AuthorStudio";
import { AccountView } from "@/components/AccountView";
import { useLocale } from "@/lib/locale";
import { PenLine, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/author")({
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
  const [view, setView] = useState<"studio" | "plans">("studio");
  const item = (v: "studio" | "plans", label: string, Icon: typeof PenLine) => (
    <button
      type="button"
      onClick={() => setView(v)}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
        view === v ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
  return (
    <div>
      <div className="mx-auto max-w-7xl px-4 pt-6">
        <div className="inline-flex gap-1 rounded-2xl border border-border/60 bg-muted/70 p-1">
          {item("studio", l.t("استوديو المؤلف", "Author studio"), PenLine)}
          {item("plans", l.t("باقات النشر", "Publishing plans"), Sparkles)}
        </div>
      </div>
      {view === "studio" ? <AuthorStudio /> : <AccountView mode="author" />}
    </div>
  );
}
