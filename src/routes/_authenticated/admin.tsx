import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, X, Wallet, ShieldCheck, Clock, AlertCircle, Save, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatLabel, type Book } from "@/components/BookCard";
import { ProductionAdmin } from "@/components/ProductionAdmin";
import { useLocale } from "@/lib/locale";
import {
  getAllPlanRequests,
  activatePlanRequest,
  rejectPlanRequest,
  getAdminWalletNumber,
  setAdminWalletNumber,
  type AuthorPlanRequest,
} from "@/lib/author-plans";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "الإدارة — unibook" },
      { name: "description", content: "مراجعة الكتب والطلبات وباقات المؤلفين." },
      { property: "og:title", content: "الإدارة — unibook" },
      { property: "og:description", content: "مراجعة الكتب والطلبات وباقات المؤلفين." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { t } = useLocale();
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();

  const [walletNumberInput, setWalletNumberInput] = useState(() => getAdminWalletNumber());

  const { data: pending = [] } = useQuery({
    queryKey: ["admin-pending"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("books").select("*, publishers(store_name)").eq("status", "pending").order("created_at");
      if (error) throw error;
      return data as (Book & { publishers: { store_name: string } | null })[];
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["admin-orders"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: planRequests = [], refetch: refetchPlans } = useQuery<AuthorPlanRequest[]>({
    queryKey: ["admin-plan-requests"],
    enabled: isAdmin,
    queryFn: () => getAllPlanRequests(),
  });

  if (loading) return null;
  if (!isAdmin) return <p className="py-32 text-center text-muted-foreground">هذه الصفحة لإدارة الموقع فقط.</p>;

  const pendingPlans = planRequests.filter((r) => r.status === "pending");

  async function decide(id: string, approve: boolean) {
    const reason = approve ? null : prompt("سبب الرفض؟") ?? "";
    const { error } = await supabase.from("books").update({ status: approve ? "approved" : "rejected", rejection_reason: reason }).eq("id", id);
    if (error) return void toast.error(error.message);
    toast.success(approve ? "تم نشر الكتاب" : "تم رفض الكتاب");
    qc.invalidateQueries();
  }

  function handleSaveWallet() {
    setAdminWalletNumber(walletNumberInput);
    toast.success("تم حفظ رقم محفظة الإدارة بنجاح");
  }

  async function handleActivatePlan(req: AuthorPlanRequest) {
    const ok = await activatePlanRequest(req.id);
    if (ok) {
      toast.success(`تم تأكيد التحويل وتفعيل باقة (${req.planTitle}) للمؤلف ${req.authorName}!`);
      qc.invalidateQueries({ queryKey: ["admin-plan-requests"] });
    } else {
      toast.error("حدث خطأ أثناء تفعيل الباقة");
    }
  }

  async function handleRejectPlan(req: AuthorPlanRequest) {
    const reason = prompt(`سبب رفض تفعيل الباقة للمؤلف (${req.authorName})؟`, "تعذر تأكيد استلام تحويل المحفظة");
    if (reason === null) return;
    const ok = await rejectPlanRequest(req.id, reason);
    if (ok) {
      toast.info(`تم رفض طلب التفعيل للمؤلف ${req.authorName}`);
      qc.invalidateQueries({ queryKey: ["admin-plan-requests"] });
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl font-bold">{t("لوحة الإدارة", "Management desk")}</h1>
      <Tabs defaultValue="plans" className="mt-8">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="plans" className="gap-2 font-bold">
            <Wallet className="h-4 w-4" />
            {t("تفعيل باقات المؤلفين", "Author plans")}
            {pendingPlans.length > 0 && (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs text-black font-extrabold animate-pulse">
                {pendingPlans.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="production">{t("المخطوطات والإنتاج والأرباح", "Production & royalties")}</TabsTrigger>
          <TabsTrigger value="pending">{t("بانتظار المراجعة", "Pending review")} ({pending.length})</TabsTrigger>
          <TabsTrigger value="orders">{t("الطلبات", "Orders")}</TabsTrigger>
        </TabsList>

        {/* Tab 1: Author Plan Activations & Wallet config */}
        <TabsContent value="plans" className="mt-6 space-y-8">
          {/* Admin Wallet Settings */}
          <div className="rounded-2xl border-2 border-primary/20 bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold">رقم محفظة الإدارة المعتمدة لاستقبال التحويلات</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  هذا الرقم يظهر للمؤلفين في نافذة تحويل المحفظة لسداد رسوم باقات النشر (Vodafone Cash / InstaPay / STC Pay / المحافظ الإلكترونية).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  dir="ltr"
                  className="font-mono text-base font-bold w-48 text-center"
                  value={walletNumberInput}
                  onChange={(e) => setWalletNumberInput(e.target.value)}
                  placeholder="010XXXXXXXX"
                />
                <Button onClick={handleSaveWallet} className="gap-2">
                  <Save className="h-4 w-4" /> حفظ الرقم
                </Button>
              </div>
            </div>
          </div>

          {/* Plan Requests List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">طلبات تفعيل باقات النشر من المؤلفين</h3>
                <p className="text-xs text-muted-foreground">
                  إنشاء الحساب مجاني بالكامل، ولا يتم فتح مساحة المؤلف لنشر الكتب إلا بعد تحويل رسوم الباقة وتأكيد التفعيل من هذه اللوحة.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchPlans()} className="gap-1 text-xs">
                <RefreshCw className="h-3.5 w-3.5" /> تحديث القائمة
              </Button>
            </div>

            {planRequests.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground border rounded-2xl bg-card">
                لا توجد طلبات تفعيل باقات مسجلة حتى الآن.
              </p>
            ) : (
              <div className="space-y-3">
                {planRequests.map((req) => (
                  <div
                    key={req.id}
                    className={`rounded-2xl border p-5 transition-all bg-card ${
                      req.status === "pending"
                        ? "border-amber-500/50 bg-amber-500/5 shadow-sm"
                        : req.status === "active"
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-border opacity-75"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-2 flex-1 min-w-[280px]">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-bold text-foreground">{req.authorName}</span>
                          <span className="text-xs text-muted-foreground font-mono">({req.userEmail})</span>
                          {req.status === "pending" && (
                            <Badge variant="outline" className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 gap-1 font-bold">
                              <Clock className="h-3 w-3 animate-pulse" /> قيد انتظار تأكيد المحفظة
                            </Badge>
                          )}
                          {req.status === "active" && (
                            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 gap-1 font-bold">
                              <ShieldCheck className="h-3 w-3" /> باقة مفعّلة
                            </Badge>
                          )}
                          {req.status === "rejected" && (
                            <Badge variant="destructive" className="gap-1 font-bold">
                              <AlertCircle className="h-3 w-3" /> تم رفض التحويل
                            </Badge>
                          )}
                        </div>

                        <div className="grid gap-2 text-xs sm:grid-cols-2 md:grid-cols-4 rounded-xl border bg-background/60 p-3">
                          <div>
                            <span className="text-muted-foreground block">الباقة المطلوبة:</span>
                            <span className="font-bold text-primary">{req.planTitle} ({req.booksCount} كتب)</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">رسوم الباقة:</span>
                            <span className="font-bold text-foreground">{req.priceDisplay}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">محفظة المحوّل:</span>
                            <span className="font-mono font-bold" dir="ltr">{req.walletSender}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">رقم العملية / المرجع:</span>
                            <span className="font-mono font-bold" dir="ltr">{req.reference}</span>
                          </div>
                        </div>

                        {req.notes && (
                          <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded-lg">
                            <strong>ملاحظات المؤلف:</strong> {req.notes}
                          </p>
                        )}
                        {req.rejectionReason && (
                          <p className="text-xs text-destructive bg-destructive/10 p-2 rounded-lg">
                            <strong>سبب الرفض:</strong> {req.rejectionReason}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          تاريخ الطلب: {new Date(req.requestedAt).toLocaleString("ar")}
                          {req.activatedAt && ` · تاريخ التفعيل: ${new Date(req.activatedAt).toLocaleString("ar")}`}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 self-center">
                        {req.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 rounded-xl"
                              onClick={() => handleActivatePlan(req)}
                            >
                              <Check className="h-4 w-4" /> تأكيد التحويل وتفعيل الباقة
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive border-destructive/40 hover:bg-destructive/10 rounded-xl gap-1"
                              onClick={() => handleRejectPlan(req)}
                            >
                              <X className="h-4 w-4" /> رفض
                            </Button>
                          </>
                        )}
                        {req.status === "active" && (
                          <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                            <ShieldCheck className="h-4 w-4" /> الحساب مفعّل كمؤلف
                          </div>
                        )}
                        {req.status === "rejected" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl text-xs gap-1"
                            onClick={() => handleActivatePlan(req)}
                          >
                            <Check className="h-3.5 w-3.5" /> إعادة التفعيل يدوياً
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="production" className="mt-6"><ProductionAdmin /></TabsContent>

        <TabsContent value="pending" className="mt-6 space-y-3">
          {pending.length === 0 && <p className="text-muted-foreground">{t("لا توجد كتب بانتظار المراجعة.", "No books awaiting review.")}</p>}
          {pending.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4">
              {b.cover_url && <img src={b.cover_url} alt="" className="h-24 w-16 rounded object-cover" />}
              <div className="min-w-60 flex-1">
                <div className="font-display text-lg font-semibold">{b.title}</div>
                <div className="text-sm text-muted-foreground">{b.author} · {b.publishers?.store_name} · {formatLabel[b.format]}</div>
                <p className="mt-1 line-clamp-2 text-sm">{b.description}</p>
                <div className="text-sm">رقمي: {formatPrice(b.price_digital)} · ورقي: {formatPrice(b.price_physical)}</div>
              </div>
              <Button size="sm" onClick={() => decide(b.id, true)}><Check className="me-1 h-4 w-4" /> {t("نشر", "Publish")}</Button>
              <Button size="sm" variant="outline" onClick={() => decide(b.id, false)}><X className="me-1 h-4 w-4" /> {t("رفض", "Reject")}</Button>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          <ul className="divide-y rounded-xl border bg-card">
            {orders.map((o) => (
              <li key={o.id} className="grid gap-1 p-4 text-sm md:grid-cols-4">
                <span>#{o.id.slice(0, 8)}</span>
                <span>{new Date(o.created_at).toLocaleString("ar")}</span>
                <span>{o.shipping_name ? `${o.shipping_name} · ${o.shipping_phone}` : "رقمي فقط"}</span>
                <span className="font-semibold md:text-end">{formatPrice(o.total)}</span>
              </li>
            ))}
            {orders.length === 0 && <li className="p-4 text-muted-foreground">{t("لا توجد طلبات.", "No orders.")}</li>}
          </ul>
        </TabsContent>
      </Tabs>
    </div>
  );
}

