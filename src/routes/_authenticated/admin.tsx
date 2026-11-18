import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getUnseenCounts, markNotifSeen } from "@/lib/notifications";
import { toast } from "sonner";
import {
  Users,
  PenLine,
  Building2,
  Sparkles,
  SlidersHorizontal,
  Wallet,
  ShieldCheck,
  Save,
  Clock,
  Layers,
  Store,
  BookOpen,
  ShoppingBag,
  RefreshCw,
  FileText,
  UserCheck,
  ArrowUpLeft,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/lib/locale";
import { AdminAuthCard } from "@/components/AdminAuthModal";
import { AdminReadersPanel } from "@/components/admin/AdminReadersPanel";
import { AdminAuthorsPanel } from "@/components/admin/AdminAuthorsPanel";
import { AdminPublishersPanel } from "@/components/admin/AdminPublishersPanel";
import { AdminProductionAI } from "@/components/admin/AdminProductionAI";
import { AdminSiteControl } from "@/components/admin/AdminSiteControl";
import {
  getAdminWalletNumber,
  setAdminWalletNumber,
} from "@/lib/author-plans";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "لوحة الإدارة العليا والتحكم الشامل — unibook" },
      { name: "description", content: "التحكم الكامل بمنصة unibook: لوحة القارئ، المؤلف، دار النشر، مركز الإنتاج بالذكاء الاصطناعي، والتحكم بالموقع والمتجر." },
      { property: "og:title", content: "لوحة الإدارة العليا — unibook" },
      { property: "og:description", content: "التحكم الكامل بمنصة unibook: لوحة القارئ، المؤلف، دار النشر، ومركز الإنتاج بالذكاء الاصطناعي." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { t } = useLocale();
  const { isAdmin, session, loading } = useAuth();
  const qc = useQueryClient();

  const [walletNumberInput, setWalletNumberInput] = useState(() => getAdminWalletNumber());
  const [activeTab, setActiveTab] = useState<string>("authors");
  const [refreshing, setRefreshing] = useState(false);

  const { data: overviewStats } = useQuery({
    queryKey: ["admin-executive-overview", session?.user.id],
    enabled: !!isAdmin,
    refetchInterval: 30000,
    queryFn: async () => {
      try {
        const [{ data: bks }, { data: ords }, { data: ms }, { data: appr }, { data: pay }] = await Promise.all([
          supabase.from("books").select("id, status"),
          supabase.from("orders").select("id, status, total"),
          supabase.from("manuscripts").select("id, stage"),
          supabase.from("account_approvals").select("user_id, status").eq("status", "pending"),
          supabase.from("author_payouts").select("id, status").eq("status", "requested"),
        ]);
        return {
          approvedBooks: (bks || []).filter((b) => b.status === "approved").length,
          pendingBooks: (bks || []).filter((b) => b.status === "pending").length,
          totalOrders: (ords || []).length,
          pendingOrders: (ords || []).filter((o) => o.status === "pending" || o.status === "paid").length,
          activeManuscripts: (ms || []).filter((m) => m.stage !== "published").length,
          pendingApprovals: (appr || []).length,
          pendingPayouts: (pay || []).length,
        };
      } catch {
        return { approvedBooks: 0, pendingBooks: 0, totalOrders: 0, pendingOrders: 0, activeManuscripts: 0, pendingApprovals: 0, pendingPayouts: 0 };
      }
    },
  });

  async function handleRefreshAll() {
    setRefreshing(true);
    await qc.invalidateQueries();
    setTimeout(() => setRefreshing(false), 400);
    toast.success("تم تحديث بيانات لوحة الإدارة بنجاح");
  }

  // Check admin identity specifically
  // Decided only by the database role check (user_roles / has_role).
  const isSuperAdmin = isAdmin;

  const [, setNotifTick] = useState(0);
  useEffect(() => {
    const onSeen = () => setNotifTick((n) => n + 1);
    window.addEventListener("unibook_notif_seen", onSeen);
    return () => window.removeEventListener("unibook_notif_seen", onSeen);
  }, []);

  const { data: adminCounts } = useQuery({
    queryKey: ["admin-tab-notifications", session?.user.id],
    enabled: !!isAdmin,
    refetchInterval: 30000,
    queryFn: async () => {
      try {
        const [{ data: ms }, { data: appr }, { data: pay }, { data: bks }, { data: ords }] = await Promise.all([
          supabase.from("manuscripts").select("id").in("stage", ["review", "invoiced", "ready"]),
          supabase.from("account_approvals").select("user_id, role").eq("status", "pending"),
          supabase.from("author_payouts").select("id").eq("status", "requested"),
          supabase.from("books").select("id").eq("status", "pending"),
          supabase.from("orders").select("id").in("status", ["pending", "paid"]),
        ]);
        const authAppr = (appr || []).filter((a) => a.role === "author").length;
        const pubAppr = (appr || []).filter((a) => a.role === "publisher").length;
        return {
          projects: (ms || []).length + authAppr + (pay || []).length,
          invoices: 0,
          books: (bks || []).length + pubAppr + (ords || []).length,
          earnings: 0,
          orders: 0,
        };
      } catch {
        return { projects: 0, invoices: 0, books: 0, earnings: 0, orders: 0 };
      }
    },
  });

  const adminUnseen = getUnseenCounts(session?.user.id ? `admin_${session.user.id}` : undefined, adminCounts);

  function handleSaveWallet() {
    setAdminWalletNumber(walletNumberInput);
    toast.success("تم حفظ رقم محفظة الإدارة المعتمدة بنجاح");
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // If not authenticated as Super Admin, show the high-security email code login card
  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center px-4 py-12" dir="rtl">
        <AdminAuthCard
          onSuccess={() => {
            qc.invalidateQueries();
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:py-12 pb-24 sm:pb-32 select-none" dir="rtl">
      {/* Top Admin Identity & Overview Bar */}
      <div className="rounded-3xl border border-primary/20 bg-gradient-to-r from-card via-card to-primary/5 p-6 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <ShieldCheck className="h-7 w-7" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground">
                  لوحة الإدارة العليا والتحكم الشامل
                </h1>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-bold text-xs">
                  unibook Admin Hub
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-medium">
                مرحباً بك: <span className="font-mono text-foreground font-bold" dir="ltr">{session?.user?.email}</span> · إدارة القرّاء والمؤلفين ودور النشر ومركز الإنتاج بالذكاء الاصطناعي
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab("wallet")}
              className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 hover:bg-muted border border-border/70 px-3 py-1.5 text-xs font-bold text-foreground cursor-pointer transition-colors"
            >
              <Wallet className="h-3.5 w-3.5 text-primary" />
              <span>اتصالات كاش:</span>
              <span dir="ltr" className="font-mono text-primary">{getAdminWalletNumber()}</span>
            </button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleRefreshAll}
              disabled={refreshing}
              className="h-8 rounded-full text-xs font-bold gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>تحديث</span>
            </Button>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              جلسة إدارة نشطة
            </span>
          </div>
        </div>
      </div>

      {/* Executive KPI Command Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("publishers")}
          className="text-start rounded-2xl border border-border/80 bg-card hover:border-primary/40 p-4 shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold">الكتب المنشورة</span>
            <BookOpen className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
          </div>
          <p className="mt-2 text-2xl font-extrabold font-mono text-foreground">{overviewStats?.approvedBooks ?? 0}</p>
          <p className="mt-0.5 text-[10px] text-amber-600 font-semibold flex items-center gap-1">
            <span>{overviewStats?.pendingBooks ?? 0} بانتظار المراجعة</span>
            <ArrowUpLeft className="h-3 w-3" />
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("publishers")}
          className="text-start rounded-2xl border border-border/80 bg-card hover:border-primary/40 p-4 shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold">الطلبات والشحن</span>
            <ShoppingBag className="h-4 w-4 text-blue-600 group-hover:scale-110 transition-transform" />
          </div>
          <p className="mt-2 text-2xl font-extrabold font-mono text-foreground">{overviewStats?.totalOrders ?? 0}</p>
          <p className="mt-0.5 text-[10px] text-blue-600 font-semibold flex items-center gap-1">
            <span>{overviewStats?.pendingOrders ?? 0} قيد التنفيذ</span>
            <ArrowUpLeft className="h-3 w-3" />
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("authors")}
          className="text-start rounded-2xl border border-border/80 bg-card hover:border-primary/40 p-4 shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold">ملفات ومخطوطات</span>
            <FileText className="h-4 w-4 text-amber-600 group-hover:scale-110 transition-transform" />
          </div>
          <p className="mt-2 text-2xl font-extrabold font-mono text-foreground">{overviewStats?.activeManuscripts ?? 0}</p>
          <p className="mt-0.5 text-[10px] text-amber-700 font-semibold flex items-center gap-1">
            <span>تحت المراجعة / الإنتاج</span>
            <ArrowUpLeft className="h-3 w-3" />
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("authors")}
          className="text-start rounded-2xl border border-border/80 bg-card hover:border-primary/40 p-4 shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold">حسابات معلّقة</span>
            <UserCheck className="h-4 w-4 text-rose-600 group-hover:scale-110 transition-transform" />
          </div>
          <p className="mt-2 text-2xl font-extrabold font-mono text-foreground">{overviewStats?.pendingApprovals ?? 0}</p>
          <p className="mt-0.5 text-[10px] text-rose-600 font-semibold flex items-center gap-1">
            <span>تنتظر اعتماد الإدارة</span>
            <ArrowUpLeft className="h-3 w-3" />
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("authors")}
          className="col-span-2 sm:col-span-1 text-start rounded-2xl border border-border/80 bg-card hover:border-primary/40 p-4 shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold">سحوبات معلّقة</span>
            <Wallet className="h-4 w-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <p className="mt-2 text-2xl font-extrabold font-mono text-foreground">{overviewStats?.pendingPayouts ?? 0}</p>
          <p className="mt-0.5 text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
            <span>مستحقات المؤلفين</span>
            <ArrowUpLeft className="h-3 w-3" />
          </p>
        </button>
      </div>

      {/* Main Multi-Panel Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); const key = session?.user.id ? `admin_${session.user.id}` : undefined; if (v === "authors") markNotifSeen(key, "projects", adminCounts?.projects || 0); if (v === "publishers") markNotifSeen(key, "books", adminCounts?.books || 0); }} className="space-y-6">
        <TabsList className="h-auto flex-wrap p-1.5 rounded-2xl bg-card border border-border/80 shadow-xs gap-1.5 w-full justify-start">
          {/* 1. مركز الإنتاج بالذكاء الاصطناعي */}
          <TabsTrigger
            value="production-ai"
            className="rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-xs cursor-pointer transition-all"
          >
            <Sparkles className="h-4 w-4" />
            <span>مركز الإنتاج بالذكاء الاصطناعي</span>
          </TabsTrigger>

          {/* 2. التحكم بالموقع والمتجر */}
          <TabsTrigger
            value="site-control"
            className="rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-xs cursor-pointer transition-all"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>التحكم بالمتجر والأسعار والعروض</span>
          </TabsTrigger>

          {/* 3. لوحة القارئ */}
          <TabsTrigger
            value="readers"
            className="rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-xs cursor-pointer transition-all"
          >
            <Users className="h-4 w-4" />
            <span>لوحة القارئ</span>
          </TabsTrigger>

          {/* 4. لوحة المؤلف */}
          <TabsTrigger
            value="authors"
            className="rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-xs cursor-pointer transition-all"
          >
            <PenLine className="h-4 w-4" />
            <span>لوحة المؤلف (مراجعة واعتماد)</span>{adminUnseen.projects > 0 && <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white animate-pulse">{adminUnseen.projects}</span>}
          </TabsTrigger>

          {/* 5. لوحة دور النشر */}
          <TabsTrigger
            value="publishers"
            className="rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-xs cursor-pointer transition-all"
          >
            <Building2 className="h-4 w-4" />
            <span>لوحة دور النشر (مراجعة واعتماد)</span>{adminUnseen.books > 0 && <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white animate-pulse">{adminUnseen.books}</span>}
          </TabsTrigger>

          {/* 6. محفظة الإدارة */}
          <TabsTrigger
            value="wallet"
            className="rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-xs cursor-pointer transition-all"
          >
            <Wallet className="h-4 w-4" />
            <span>محفظة التحويلات</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Content 1: AI Production Center */}
        <TabsContent value="production-ai" className="mt-4 focus-visible:outline-none">
          <AdminProductionAI />
        </TabsContent>

        {/* Tab Content 2: Full Site & Store Control */}
        <TabsContent value="site-control" className="mt-4 focus-visible:outline-none">
          <AdminSiteControl />
        </TabsContent>

        {/* Tab Content 3: Readers Panel */}
        <TabsContent value="readers" className="mt-4 focus-visible:outline-none">
          <AdminReadersPanel />
        </TabsContent>

        {/* Tab Content 4: Authors Panel with Review & Approval */}
        <TabsContent value="authors" className="mt-4 focus-visible:outline-none">
          <AdminAuthorsPanel />
        </TabsContent>

        {/* Tab Content 5: Publishers Panel with Review & Approval */}
        <TabsContent value="publishers" className="mt-4 focus-visible:outline-none">
          <AdminPublishersPanel />
        </TabsContent>

        {/* Tab Content 6: Admin Wallet Configuration */}
        <TabsContent value="wallet" className="mt-4 focus-visible:outline-none space-y-6">
          <div className="rounded-3xl border-2 border-primary/20 bg-card p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/60">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-xl font-bold text-foreground">
                    رقم محفظة الإدارة المعتمدة لاستقبال التحويلات
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  هذا الرقم يظهر تلقائياً للمؤلفين في فواتير الإنتاج وباقات النشر للسداد عبر محفظة اتصالات كاش في مصر (Etisalat Cash).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  dir="ltr"
                  className="font-mono text-base font-bold w-48 text-center h-11 rounded-xl bg-background/50"
                  value={walletNumberInput}
                  onChange={(e) => setWalletNumberInput(e.target.value)}
                  placeholder="010XXXXXXXX"
                />
                <Button onClick={handleSaveWallet} className="h-11 rounded-xl px-5 font-bold gap-2 cursor-pointer shadow-xs">
                  <Save className="h-4 w-4" /> حفظ الرقم
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/70">
                <span className="font-bold text-foreground block mb-1">المحافظ المصرية:</span>
                <span className="text-muted-foreground">فودافون كاش، اتصالات كاش، أورنج كاش، وي باي، وانستا باي (InstaPay).</span>
              </div>
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/70">
                <span className="font-bold text-foreground block mb-1">المحافظ الخليجية:</span>
                <span className="text-muted-foreground">STC Pay، يور باي (UrPay)، مدى، والتحويل البنكي المباشر.</span>
              </div>
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/70">
                <span className="font-bold text-foreground block mb-1">تأكيد فوري:</span>
                <span className="text-muted-foreground">يصل الإشعار إلى لوحة المؤلفين لمراجعة رقم العملية وتفعيل الباقة فورياً.</span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
