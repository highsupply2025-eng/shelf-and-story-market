import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  PenLine,
  Building2,
  Clock,
  XCircle,
  RefreshCw,
  MessageSquare,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, clearLocalSession, registerLocalUser, type UserRoleType } from "@/lib/auth";
import {
  ensureAccountApprovalRecord,
  getUserApprovalStatus,
} from "@/lib/admin-store";
import { useLocale } from "@/lib/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const ROLE_HOME: Record<UserRoleType, "/account" | "/author" | "/publisher" | "/admin"> = {
  reader: "/account",
  author: "/author",
  publisher: "/publisher",
  admin: "/admin",
};

const META: Record<
  Exclude<UserRoleType, "admin">,
  { ar: string; en: string; descAr: string; descEn: string; badgeAr: string; badgeEn: string; icon: typeof BookOpen }
> = {
  reader: {
    ar: "لوحة القارئ",
    en: "Reader dashboard",
    descAr: "مكتبتك وطلباتك ومفضلتك",
    descEn: "Your library, orders & favorites",
    badgeAr: "حساب قارئ",
    badgeEn: "Reader Account",
    icon: BookOpen,
  },
  author: {
    ar: "لوحة المؤلف",
    en: "Author dashboard",
    descAr: "مخطوطاتك وإنتاجك وأرباحك",
    descEn: "Manuscripts, production & earnings",
    badgeAr: "حساب مؤلف وباحث",
    badgeEn: "Author Account",
    icon: PenLine,
  },
  publisher: {
    ar: "لوحة دار النشر",
    en: "Publisher dashboard",
    descAr: "كتب الدار ومبيعاتها وملفها",
    descEn: "Catalog, sales & profile",
    badgeAr: "حساب دار نشر",
    badgeEn: "Publisher Account",
    icon: Building2,
  },
};

/**
 * Wraps a role dashboard: sends users of another account type to their own
 * dashboard (admins may view all) and gates access until Admin approves the account.
 */
export function DashboardShell({ role, children }: { role: Exclude<UserRoleType, "admin">; children: ReactNode }) {
  const { accountType, loading, session, refresh } = useAuth();
  const l = useLocale();
  const navigate = useNavigate();
  const [, setTick] = useState(0);

  useEffect(() => {
    if (session && accountType !== "admin") {
      const displayName =
        (session.user.user_metadata?.["display_name"] as string | undefined) ||
        (session.user.user_metadata?.["full_name"] as string | undefined) ||
        session.user.email?.split("@")[0] ||
        "مستخدم unibook";
      ensureAccountApprovalRecord({
        userId: session.user.id,
        role: accountType,
        name: displayName,
        email: session.user.email || "",
      });
    }
  }, [session, accountType]);

  useEffect(() => {
    const onUpdate = () => setTick((n) => n + 1);
    window.addEventListener("unibook_admin_update", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("unibook_admin_update", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  if (loading) {
    return <p className="p-16 text-center text-muted-foreground">{l.t("جارٍ التحميل…", "Loading…")}</p>;
  }

  if (accountType !== "admin" && accountType !== role) {
    return <Navigate to={ROLE_HOME[accountType]} replace />;
  }

  const m = META[role];
  const Icon = m.icon;

  const approvalStatus =
    accountType === "admin"
      ? "approved"
      : getUserApprovalStatus(session?.user.id, session?.user.email);

  const displayName =
    (session?.user.user_metadata?.["display_name"] as string | undefined) ||
    (session?.user.user_metadata?.["full_name"] as string | undefined) ||
    session?.user.email?.split("@")[0] ||
    l.t("مستخدم unibook", "unibook user");

  async function handleSignOut() {
    clearLocalSession();
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* ignore */
    }
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    if (typeof window !== "undefined") {
      try {
        for (const k of Object.keys(window.localStorage)) {
          if (k.startsWith("sb-") && k.endsWith("-auth-token")) {
            window.localStorage.removeItem(k);
          }
        }
      } catch {
        /* ignore */
      }
      window.location.replace("/");
    } else {
      navigate({ to: "/" });
    }
  }

  async function handleSwitchPendingRole(nextRole: "reader" | "author" | "publisher") {
    if (!session || nextRole === role) return;
    registerLocalUser({
      id: session.user.id,
      email: session.user.email || "",
      displayName,
      accountType: nextRole,
    });
    await refresh();
    toast.success(
      l.t(
        `تم تحديث نوع طلب الحساب إلى (${META[nextRole].badgeAr}) وهو الآن تحت المراجعة`,
        `Account application updated to ${META[nextRole].badgeEn}`
      )
    );
    navigate({ to: ROLE_HOME[nextRole] });
  }

  function handleCheckStatus() {
    setTick((n) => n + 1);
    const current = getUserApprovalStatus(session?.user.id, session?.user.email);
    if (current === "approved") {
      toast.success(l.t("تمت الموافقة على حسابك! أهلاً بك.", "Your account has been approved!"));
    } else if (current === "rejected") {
      toast.error(l.t("تم رفض أو تعليق الحساب من قِبل الإدارة.", "Account was rejected or suspended."));
    } else {
      toast.info(
        l.t(
          "حسابك لا يزال تحت المراجعة وبانتظار موافقة الأدمن.",
          "Your account is still under review pending admin approval."
        )
      );
    }
  }

  return (
    <div>
      {approvalStatus !== "approved" ? (
        <div className="mx-auto max-w-2xl px-4 py-12 md:py-16">
          <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-10 shadow-lg text-center space-y-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs">
              {approvalStatus === "rejected" ? (
                <XCircle className="h-10 w-10 text-destructive" />
              ) : (
                <Clock className="h-10 w-10 animate-pulse" />
              )}
            </div>

            <div className="space-y-2">
              <Badge
                variant="outline"
                className={
                  approvalStatus === "rejected"
                    ? "border-destructive/40 bg-destructive/10 text-destructive px-3.5 py-1 text-xs font-extrabold"
                    : "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400 px-3.5 py-1 text-xs font-extrabold"
                }
              >
                {approvalStatus === "rejected"
                  ? l.t("تم تعليق أو رفض طلب الحساب", "Account Application Rejected")
                  : l.t("حسابك تحت المراجعة — بانتظار موافقة الإدارة", "Under Review — Pending Admin Approval")}
              </Badge>

              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground pt-1">
                {approvalStatus === "rejected"
                  ? l.t("عذراً، لم تتم الموافقة على فتح هذا الحساب", "Sorry, this account has not been approved")
                  : l.t("حسابك قيد المراجعة لدى إدارة المنصة", "Your account is currently under admin review")}
              </h2>

              <p className="mx-auto max-w-lg text-sm sm:text-base text-muted-foreground leading-relaxed">
                {approvalStatus === "rejected"
                  ? l.t(
                      "يرجى التواصل مع إدارة منصة unibook للاستفسار أو استكمال البيانات المطلوبة لتفعيل حسابك.",
                      "Please contact unibook administration for assistance regarding your account."
                    )
                  : l.t(
                      "تم استلام طلب تسجيل حسابك بنجاح. وفقاً لسياسة منصة unibook، لا يفتح الحساب (سواء للقارئ أو المؤلف أو دار النشر) إلا بعد مراجعته والموافقة عليه من قِبل الإدارة.",
                      "Your registration request has been received. All Reader, Author, and Publisher accounts remain under review until approved by the Admin."
                    )}
              </p>
            </div>

            {/* User Account Summary Box */}
            <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 sm:p-5 text-start space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div>
                  <span className="text-[11px] text-muted-foreground block">
                    {l.t("الاسم المسجل", "Registered Name")}
                  </span>
                  <span className="font-extrabold text-sm sm:text-base text-foreground">{displayName}</span>
                </div>
                <Badge variant="outline" className="font-bold text-xs gap-1.5 px-3 py-1 bg-background">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {l.t(m.badgeAr, m.badgeEn)}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">{l.t("البريد الإلكتروني:", "Email:")}</span>
                <span className="font-mono font-bold text-foreground" dir="ltr">
                  {session?.user.email}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">{l.t("حالة الحساب الحالية:", "Current Status:")}</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {approvalStatus === "rejected"
                    ? l.t("مرفوض / معلّق", "Rejected / Suspended")
                    : l.t("تحت المراجعة (بانتظار موافقة الأدمن)", "Under Review (Pending Admin Approval)")}
                </span>
              </div>

              {/* Allow user to switch pending role if they registered with wrong role */}
              {approvalStatus === "pending" && (
                <div className="pt-2 border-t border-border/60">
                  <span className="text-[11px] text-muted-foreground block mb-2">
                    {l.t("تأكيد أو تعديل نوع الحساب المطلوب مراجعته:", "Confirm or change requested account type:")}
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(["reader", "author", "publisher"] as const).map((r) => {
                      const RIcon = META[r].icon;
                      const active = role === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => handleSwitchPendingRole(r)}
                          className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 px-2 text-xs font-bold transition-all cursor-pointer ${
                            active
                              ? "border-primary bg-primary text-primary-foreground shadow-xs"
                              : "border-border/70 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          }`}
                        >
                          <RIcon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{l.t(META[r].badgeAr.replace("حساب ", ""), META[r].badgeEn)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                type="button"
                onClick={handleCheckStatus}
                className="rounded-xl font-bold gap-2 cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                {l.t("تحديث حالة الموافقة", "Check Approval Status")}
              </Button>

              <Button asChild variant="outline" className="rounded-xl font-bold gap-2 cursor-pointer">
                <Link to="/contact">
                  <MessageSquare className="h-4 w-4" />
                  {l.t("تواصل معنا", "Contact Us")}
                </Link>
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={handleSignOut}
                className="rounded-xl font-bold gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                {l.t("تسجيل الخروج", "Sign Out")}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
