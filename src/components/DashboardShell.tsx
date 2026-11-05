import type { ReactNode } from "react";
import { Link, Navigate } from "@tanstack/react-router";
import { BookOpen, PenLine, Building2, ShieldCheck } from "lucide-react";
import { useAuth, type UserRoleType } from "@/lib/auth";
import { useLocale } from "@/lib/locale";

export const ROLE_HOME: Record<UserRoleType, "/account" | "/author" | "/publisher" | "/admin"> = {
  reader: "/account",
  author: "/author",
  publisher: "/publisher",
  admin: "/admin",
};

const META: Record<Exclude<UserRoleType, "admin">, { ar: string; en: string; descAr: string; descEn: string; icon: typeof BookOpen }> = {
  reader: { ar: "لوحة القارئ", en: "Reader dashboard", descAr: "مكتبتك وطلباتك ومفضلتك", descEn: "Your library, orders & favorites", icon: BookOpen },
  author: { ar: "لوحة المؤلف", en: "Author dashboard", descAr: "مخطوطاتك وإنتاجك وأرباحك", descEn: "Manuscripts, production & earnings", icon: PenLine },
  publisher: { ar: "لوحة دار النشر", en: "Publisher dashboard", descAr: "كتب الدار ومبيعاتها وملفها", descEn: "Catalog, sales & profile", icon: Building2 },
};

/**
 * Wraps a role dashboard: sends users of another account type to their own
 * dashboard (admins may view all) and renders a distinct identity strip.
 */
export function DashboardShell({ role, children }: { role: Exclude<UserRoleType, "admin">; children: ReactNode }) {
  const { accountType, loading, session } = useAuth();
  const l = useLocale();
  if (loading) return <p className="p-16 text-center text-muted-foreground">{l.t("جارٍ التحميل…", "Loading…")}</p>;
  if (accountType !== "admin" && accountType !== role) return <Navigate to={ROLE_HOME[accountType]} replace />;
  const m = META[role];
  const Icon = m.icon;
  return (
    <div>
      <div className="border-b border-border/70 bg-card/60">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-4">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-extrabold leading-tight">{l.t(m.ar, m.en)}</h1>
            <p className="truncate text-xs text-muted-foreground">{l.t(m.descAr, m.descEn)}</p>
          </div>
          <span className="ms-auto hidden truncate rounded-full border border-border bg-background px-3 py-1 font-mono text-xs text-muted-foreground sm:inline" dir="ltr">
            {session?.user.email}
          </span>
          {accountType === "admin" && (
            <Link to="/admin" className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-bold text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              {l.t("معاينة إدارية", "Admin preview")}
            </Link>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
