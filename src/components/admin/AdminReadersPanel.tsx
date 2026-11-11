import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Search,
  ShoppingBag,
  MapPin,
  Phone,
  Mail,
  Calendar,
  ShieldCheck,
  Eye,
  CheckCircle2,
  Package,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocale } from "@/lib/locale";

interface ReaderProfile {
  id: string;
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
  const [selectedReader, setSelectedReader] = useState<ReaderProfile | null>(null);

  // Fetch all reader profiles
  const { data: readers = [], isLoading } = useQuery<ReaderProfile[]>({
    queryKey: ["admin-all-readers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ReaderProfile[];
    },
  });

  // Fetch all orders to compute stats per reader
  const { data: orders = [] } = useQuery({
    queryKey: ["admin-all-orders-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate stats
  const totalReadersCount = readers.length;
  const totalOrdersCount = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  // Map orders by buyer_id
  const ordersByBuyer = orders.reduce((acc: Record<string, any[]>, order) => {
    (acc[order.buyer_id] ??= []).push(order);
    return acc;
  }, {});

  const filteredReaders = readers.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (r.display_name && r.display_name.toLowerCase().includes(q)) ||
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
            <p className="text-[11px] text-emerald-600 mt-1 font-semibold">حسابات نشطة في المنصة</p>
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

      {/* Control Bar: Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border/80 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("ابحث باسم القارئ، الهاتف، العنوان، أو المعرّف...", "Search reader by name, phone, address...")}
            className="ps-10 h-10 rounded-xl text-xs sm:text-sm bg-background/50 border-border/70"
          />
        </div>

        <Badge variant="outline" className="h-9 px-3 text-xs font-bold text-muted-foreground self-start sm:self-auto">
          {filteredReaders.length} {t("قارئ معروض", "readers shown")}
        </Badge>
      </div>

      {/* Readers Table / Cards */}
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
                <th className="py-3 px-4 text-start">الجوال والشحن</th>
                <th className="py-3 px-4 text-start">الطلبات</th>
                <th className="py-3 px-4 text-start">إجمالي الإنفاق</th>
                <th className="py-3 px-4 text-start">تاريخ التسجيل</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredReaders.map((r) => {
                const readerOrders = ordersByBuyer[r.id] || [];
                const spent = readerOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

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
                          <div className="text-[10px] text-muted-foreground font-mono truncate max-w-36" dir="ltr">
                            {r.id.slice(0, 12)}...
                          </div>
                        </div>
                      </div>
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
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-xl text-xs gap-1 cursor-pointer hover:border-primary"
                        onClick={() => setSelectedReader(r)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>معاينة</span>
                      </Button>
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
                <div>
                  <span className="text-muted-foreground block text-[11px]">الاسم الكامل:</span>
                  <span className="font-bold text-foreground text-base">
                    {selectedReader.display_name || selectedReader.shipping_name || "قارئ unibook"}
                  </span>
                </div>

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
                      <div key={o.id} className="p-3 rounded-xl border border-border/80 bg-card flex justify-between items-center text-xs">
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
