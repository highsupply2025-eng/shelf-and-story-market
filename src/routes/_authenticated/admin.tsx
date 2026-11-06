import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/lib/locale";
import { AdminAuthCard, ADMIN_EMAIL } from "@/components/AdminAuthModal";
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

  // Check admin identity specifically
  const isSuperAdmin =
    isAdmin || session?.user?.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase();

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
                مرحباً بك: <span className="font-mono text-foreground font-bold" dir="ltr">{session?.user?.email || ADMIN_EMAIL}</span> · إدارة القرّاء والمؤلفين ودور النشر ومركز الإنتاج بالذكاء الاصطناعي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              جلسة إدارة نشطة ومؤمنة
            </span>
          </div>
        </div>
      </div>

      {/* Main Multi-Panel Tabs */}
      <Tabs defaultValue="production-ai" className="space-y-6">
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
            <span>لوحة المؤلف (مراجعة واعتماد)</span>
          </TabsTrigger>

          {/* 5. لوحة دور النشر */}
          <TabsTrigger
            value="publishers"
            className="rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-xs cursor-pointer transition-all"
          >
            <Building2 className="h-4 w-4" />
            <span>لوحة دور النشر (مراجعة واعتماد)</span>
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
                  هذا الرقم يظهر تلقائياً للمؤلفين عند طلب الاشتراك في باقات النشر لسداد الرسوم (Vodafone Cash / InstaPay / STC Pay / المحافظ البنكية).
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
