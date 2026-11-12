import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Search,
  ShoppingBag,
  ShieldCheck,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getAccountApprovals,
  getUserApprovalStatus,
  updateAccountApprovalStatus,
} from "@/lib/admin-store";
import { useLocale } from "@/lib/locale";

interface ReaderProfile {
  id: string;
  email?: string;
  display_name: string | null;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  country: string;
  currency: string;
  created_at: string;
}

export function AdminReadersPanel() {
  const { t, price: formatMoney } = useLocale();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "pending" | "approved">("all");
  const [selectedReader, setSelectedReader] = useState<ReaderProfile | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const onUpdate = () => setTick((n) => n + 1);
    window.addEventListener("unibook_admin_update", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("unibook_admin_update", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  // Fetch all reader profiles from Supabase (fallback gracefully if offline)
  const { data: remoteReaders = [], isLoading, refetch: refetchReaders } = useQuery<ReaderProfile[]>({
    queryKey: ["admin-all-readers"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) return [];
        return (data || []) as ReaderProfile[];
      } catch {
        return [];
      }
    },
  });

  // Fetch all orders to compute stats per reader
  const { data: orders = [] } = useQuery({
    queryKey: ["admin-all-orders-summary"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("orders").select("*");
        if (error) return [];
        return data || [];
      } catch {
        return [];
      }
    },
  });

  // Merge remote profiles with locally registered readers & approval records
  const approvalReaders = getAccountApprovals().filter((a) => a.role === "reader");

  const mergedMap = new Map<string, ReaderProfile>();
  for (const r of remoteReaders) {
    mergedMap.set(r.id, { ...r });
  }
  for (const ar of approvalReaders) {
    if (!mergedMap.has(ar.userId)) {
      mergedMap.set(ar.userId, {
        id: ar.userId,
        email: ar.email,
        display_name: ar.name || "قارئ unibook",
        shipping_name: null,
        shipping_phone: null,
        shipping_address: null,
        country: "SA",
        currency: "SAR",
        created_at: ar.appliedAt,
      });
    } else {
      const item = mergedMap.get(ar.userId)!;
      if (!item.email && ar.email) item.email = ar.email;
      if (!item.display_name && ar.name) item.display_name = ar.name;
    }
  }

  const readers = Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  function handleSetReaderStatus(
    reader: ReaderProfile,
    status: "approved" | "rejected" | "pending"
  ) {
    const rName = reader.display_name || reader.shipping_name || "قارئ unibook";
    updateAccountApprovalStatus(reader.id, status, undefined, {
      role: "reader",
      name: rName,
      email: reader.email || "",
    });
    setTick((n) => n + 1);
    toast.success(
      status === "approved"
        ? `تمت الموافقة وتفعيل حساب القارئ (${rName}) بنجاح`
        : status === "rejected"
          ? `تم تعليق/رفض حساب القارئ (${rName})`
          : `تم تعيين حساب القارئ (${rName}) تحت المراجعة`
    );
    refetchReaders();
  }

  // Calculate stats
  const totalReadersCount = readers.length;
  const pendingReadersCount = readers.filter(
    (r) => getUserApprovalStatus(r.id, r.email, "reader") === "pending"
  ).length;
  const totalOrdersCount = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  // Map orders by buyer_id
  const ordersByBuyer = orders.reduce((acc: Record<string, any[]>, order) => {
    (acc[order.buyer_id] ??= []).push(order);
    return acc;
  }, {});

  const filteredReaders = readers.filter((r) => {
    const status = getUserApprovalStatus(r.id, r.email, "reader");
    if (filterTab === "pending" && status !== "pending") return false;
    if (filterTab === "approved" && status !== "approved") return false;

    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (r.display_name && r.display_name.toLowerCase().includes(q)) ||
      (r.email && r.email.toLowerCase().includes(q)) ||
      (r.shipping_name && r.shipping_name.toLowerCase().includes(q)) ||
      (r.shipping_phone && r.shipping_phone.includes(q)) ||
      (r.shipping_address && r.shipping_address.toLowerCase().includes(q)) ||
      r.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground">{t("إجمالي القرّاء المسجلين", "Total Readers")}</p>
            <p className="mt-2 text-3xl font-extrabold text-foreground font-mono">{totalReadersCount}</p>
            <p className="text-[11px] text-amber-600 mt-1 font-semibold">
              {pendingReadersCount > 0
                ? `${pendingReadersCount} حساب بانتظار موافقة الأدمن`
                : "جميع الحسابات تمت مراجعتها"}
            </p>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <Users className="h-6 w-6" />
          </span>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground">{t("طلبات الشراء المكتملة", "Completed Orders")}</p>
            <p className="mt-2 text-3xl font-extrabold text-foreground font-mono">{totalOrdersCount}</p>
            <p className="text-[11px] text-blue-600 mt-1 font-semibold">رقمية ومطبوعة</p>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-500/10 text-blue-600">
            <ShoppingBag className="h-6 w-6" />
          </span>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground">{t("حجم مبيعات المتجر", "Store Volume")}</p>
            <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-foreground font-mono">{formatMoney(totalRevenue)}</p>
            <p className="text-[11px] text-amber-600 mt-1 font-semibold">عبر المتجر الإلكتروني</p>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-600">
            <Package className="h-6 w-6" />
          </span>
        </div>
      </div>

      {/* Control Bar: Search + Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border/80 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("ابحث باسم القارئ، البريد، الهاتف، أو المعرّف...", "Search reader by name, email, phone...")}
            className="ps-10 h-10 rounded-xl text-xs sm:text-sm bg-background/50 border-border/70"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterTab === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            الكل ({readers.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("pending")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterTab === "pending"
                ? "bg-amber-600 text-white"
                : "bg-amber-500/10 text-amber-700 hover:bg-amber-500/20"
            }`}
          >
            تحت المراجعة ({pendingReadersCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("approved")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterTab === "approved"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20"
            }`}
          >
            المعتمدون ({readers.filter((r) => getUserApprovalStatus(r.id, r.email) === "approved").length})
          </button>
        </div>
      </div>

      {/* Readers Table */}
      {isLoading ? (
        <div className="p-16 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
        </div>
      ) : filteredReaders.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border rounded-2xl bg-card">
          <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="font-bold text-sm">لا يوجد قرّاء مطابقين لبحثك حالياً.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-xs">
          <table className="w-full text-start text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground font-bold text-[11px] sm:text-xs">
                <th className="py-3 px-4 text-start">القارئ</th>
                <th className="py-3 px-4 text-start">حالة الاعتماد</th>
                <th className="py-3 px-4 text-start">الجوال والشحن</th>
                <th className="py-3 px-4 text-start">الطلبات</th>
                <th className="py-3 px-4 text-start">إجمالي الإنفاق</th>
                <th className="py-3 px-4 text-start">تاريخ التسجيل</th>
                <th className="py-3 px-4 text-center">إجراءات المراجعة والاعتماد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredReaders.map((r) => {
                const readerOrders = ordersByBuyer[r.id] || [];
                const spent = readerOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
                const status = getUserApprovalStatus(r.id, r.email, "reader");

                return (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 font-bold">
                          {(r.display_name || r.shipping_name || "ق")[0]}
                        </span>
                        <div>
                          <div className="font-bold text-foreground">
                            {r.display_name || r.shipping_name || "قارئ unibook"}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono truncate max-w-44" dir="ltr">
                            {r.email || `${r.id.slice(0, 12)}...`}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {status === "approved" ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40 font-bold text-[11px]"
                        >
                          <ShieldCheck className="h-3 w-3 me-1" /> قارئ معتمد
                        </Badge>
                      ) : status === "rejected" ? (
                        <Badge variant="destructive" className="font-bold text-[11px]">
                          <XCircle className="h-3 w-3 me-1" /> حساب معلّق
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-amber-500/20 text-amber-700 border-amber-500/40 font-bold text-[11px]"
                        >
                          <Clock className="h-3 w-3 me-1 animate-pulse" /> تحت المراجعة
                        </Badge>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-muted-foreground">
                      {r.shipping_phone ? (
                        <div className="font-mono text-foreground font-semibold" dir="ltr">
                          {r.shipping_phone}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                      <div className="text-[10px] truncate max-w-44 text-muted-foreground">
                        {r.shipping_address || "لم يسجل عنواناً بعد"}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge variant="outline" className="font-mono font-bold bg-background text-xs">
                        {readerOrders.length} طلبات
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                      {spent > 0 ? formatMoney(spent) : "0 ر.س"}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-muted-foreground font-mono">
                      {new Date(r.created_at).toLocaleDateString("ar-EG")}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {status !== "approved" && (
                          <Button
                            size="sm"
                            className="h-8 rounded-xl text-xs gap-1 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleSetReaderStatus(r, "approved")}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>موافقة وتفعيل</span>
                          </Button>
                        )}

                        {status === "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-xl text-xs gap-1 cursor-pointer text-destructive hover:bg-destructive/10"
                            onClick={() => handleSetReaderStatus(r, "rejected")}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>تعليق</span>
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-xl text-xs gap-1 cursor-pointer hover:border-primary"
                          onClick={() => setSelectedReader(r)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>معاينة</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Reader Details Dialog */}
      <Dialog open={Boolean(selectedReader)} onOpenChange={(open) => !open && setSelectedReader(null)}>
        <DialogContent className="max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              <span>ملف القارئ وبيانات الحساب</span>
            </DialogTitle>
          </DialogHeader>

          {selectedReader && (
            <div className="space-y-4 pt-2 text-xs sm:text-sm">
              <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">الاسم الكامل:</span>
                    <span className="font-bold text-foreground text-base">
                      {selectedReader.display_name || selectedReader.shipping_name || "قارئ unibook"}
                    </span>
                  </div>
                  {getUserApprovalStatus(selectedReader.id, selectedReader.email) === "approved" ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/15 text-emerald-700 border-emerald-500/40 font-bold text-xs"
                    >
                      قارئ معتمد
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-amber-500/20 text-amber-700 border-amber-500/40 font-bold text-xs"
                    >
                      تحت المراجعة
                    </Badge>
                  )}
                </div>

                {selectedReader.email && (
                  <div>
                    <span className="text-muted-foreground block text-[11px]">البريد الإلكتروني:</span>
                    <span className="font-mono font-bold text-foreground" dir="ltr">
                      {selectedReader.email}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">رقم الجوال:</span>
                    <span className="font-mono font-bold text-foreground" dir="ltr">
                      {selectedReader.shipping_phone || "غير محدد"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">تاريخ الانضمام:</span>
                    <span className="font-mono text-muted-foreground">
                      {new Date(selectedReader.created_at).toLocaleDateString("ar-EG")}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[11px]">عنوان التوصيل المسجل:</span>
                  <span className="text-foreground font-medium">
                    {selectedReader.shipping_address || "لا يوجد عنوان مسجل"}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                  {getUserApprovalStatus(selectedReader.id, selectedReader.email) !== "approved" ? (
                    <Button
                      size="sm"
                      className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 cursor-pointer"
                      onClick={() => handleSetReaderStatus(selectedReader, "approved")}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>اعتماد وتفعيل حساب القارئ</span>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full rounded-xl text-destructive hover:bg-destructive/10 font-bold gap-1.5 cursor-pointer"
                      onClick={() => handleSetReaderStatus(selectedReader, "rejected")}
                    >
                      <XCircle className="h-4 w-4" />
                      <span>تعليق حساب القارئ</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Order history summary */}
              <div>
                <h4 className="font-bold text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                  <ShoppingBag className="h-4 w-4 text-primary" />
                  <span>سجل طلبات القارئ ({ordersByBuyer[selectedReader.id]?.length || 0})</span>
                </h4>

                {(ordersByBuyer[selectedReader.id] || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4 bg-card border rounded-xl">
                    لم يقم هذا القارئ بأي طلبات شراء حتى الآن.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                    {(ordersByBuyer[selectedReader.id] ?? []).map((o: any) => (
                      <div
                        key={o.id}
                        className="p-3 rounded-xl border border-border/80 bg-card flex justify-between items-center text-xs"
                      >
                        <div>
                          <span className="font-mono font-bold text-foreground">طلب #{o.id.slice(0, 8)}</span>
                          <span className="block text-[10px] text-muted-foreground">
                            {new Date(o.created_at).toLocaleDateString("ar-EG")}
                          </span>
                        </div>
                        <div className="text-end">
                          <span className="font-bold text-primary font-mono">{formatMoney(o.total)}</span>
                          <span className="block text-[10px] text-emerald-600 font-bold">{o.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
