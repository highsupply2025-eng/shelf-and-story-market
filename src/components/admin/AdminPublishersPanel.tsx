import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  BookOpen,
  Search,
  Check,
  X,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  getAccountApprovals,
  getUserApprovalStatus,
  updateAccountApprovalStatus,
} from "@/lib/admin-store";
import { useLocale } from "@/lib/locale";
import type { Book } from "@/components/BookCard";

export function AdminPublishersPanel() {
  const { t, price: formatMoney } = useLocale();
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "pending" | "approved">("all");
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

  // Fetch publishers and their books
  const { data: remotePublishers = [], refetch: refetchPublishers } = useQuery({
    queryKey: ["admin-publishers-list"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("publishers")
          .select("*, books(*)")
          .order("created_at", { ascending: false });
        if (error) return [];
        return data || [];
      } catch {
        return [];
      }
    },
  });

  // Fetch pending books across publishers
  const { data: pendingBooks = [], refetch: refetchPendingBooks } = useQuery({
    queryKey: ["admin-pending-publisher-books"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("books")
          .select("*, publishers(store_name)")
          .eq("status", "pending")
          .order("created_at", { ascending: false });
        if (error) return [];
        return (data || []) as (Book & { publishers: { store_name: string } | null })[];
      } catch {
        return [];
      }
    },
  });

  // Merge remote publishers with locally registered publishers & approval records
  const approvalPublishers = getAccountApprovals().filter((a) => a.role === "publisher");

  const pubMap = new Map<
    string,
    {
      id: string;
      email?: string;
      store_name: string;
      bio?: string | null;
      books?: any[];
      created_at: string;
    }
  >();

  for (const p of remotePublishers) {
    pubMap.set(p.id, { ...p });
  }
  for (const ap of approvalPublishers) {
    if (!pubMap.has(ap.userId)) {
      pubMap.set(ap.userId, {
        id: ap.userId,
        email: ap.email,
        store_name: ap.name || "دار نشر unibook",
        bio: ap.notes || "دار نشر وتوزيع في منصة unibook",
        books: [],
        created_at: ap.appliedAt,
      });
    } else {
      const item = pubMap.get(ap.userId)!;
      if (!item.email && ap.email) item.email = ap.email;
      if (!item.store_name && ap.name) item.store_name = ap.name;
    }
  }

  const publishers = Array.from(pubMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Handle publisher account status update
  function handleSetPublisherStatus(
    pubId: string,
    pubName: string,
    pubEmail: string | undefined,
    status: "approved" | "rejected" | "pending"
  ) {
    updateAccountApprovalStatus(pubId, status, undefined, {
      role: "publisher",
      name: pubName,
      email: pubEmail || "",
    });
    setTick((n) => n + 1);
    toast.success(
      status === "approved"
        ? `تم اعتماد حساب دار النشر (${pubName}) رسمياً في المنصة`
        : status === "rejected"
          ? `تم تعليق حساب دار النشر (${pubName})`
          : `تم تعيين حساب دار النشر (${pubName}) قيد المراجعة`
    );
    refetchPublishers();
  }

  // Handle book decision
  async function decideBook(id: string, approve: boolean) {
    const reason = approve ? null : prompt("سبب رفض نشر الكتاب؟") ?? "";
    const { error } = await supabase
      .from("books")
      .update({ status: approve ? "approved" : "rejected", rejection_reason: reason })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(approve ? "تم نشر الكتاب في المتجر بنجاح" : "تم رفض الكتاب");
    refetchPendingBooks();
    refetchPublishers();
    qc.invalidateQueries();
  }

  const totalCatalogBooks = publishers.reduce((sum, p) => sum + (p.books?.length || 0), 0);
  const pendingPublishersCount = publishers.filter(
    (p) => getUserApprovalStatus(p.id, p.email) === "pending"
  ).length;

  return (
    <div className="space-y-8" dir="rtl">
      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground">{t("دور النشر المعتمدة والمسجلة", "Publishers")}</p>
            <p className="mt-2 text-3xl font-extrabold text-foreground font-mono">{publishers.length}</p>
            <p className="text-[11px] text-amber-600 mt-1 font-semibold">
              {pendingPublishersCount > 0
                ? `${pendingPublishersCount} دار نشر بانتظار موافقة الأدمن`
                : "مؤسسات نشر مرخصة"}
            </p>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-500/10 text-blue-600">
            <Building2 className="h-6 w-6" />
          </span>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground">{t("كتب تنتظر المراجعة والنشر", "Pending Titles")}</p>
            <p className="mt-2 text-3xl font-extrabold text-foreground font-mono">{pendingBooks.length}</p>
            <p className="text-[11px] text-amber-600 mt-1 font-semibold">بانتظار قرار الإدارة</p>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-600">
            <Clock className="h-6 w-6" />
          </span>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground">{t("إجمالي عناوين الكتالوج", "Total Catalog Titles")}</p>
            <p className="mt-2 text-3xl font-extrabold text-foreground font-mono">{totalCatalogBooks}</p>
            <p className="text-[11px] text-emerald-600 mt-1 font-semibold">عبر مختلف دور النشر</p>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <BookOpen className="h-6 w-6" />
          </span>
        </div>
      </div>

      {/* Section 1: Pending Books Submitted by Publishers */}
      {pendingBooks.length > 0 && (
        <div className="rounded-3xl border-2 border-amber-500/30 bg-amber-500/5 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600 animate-pulse" />
              <h3 className="font-display text-lg font-extrabold text-foreground">
                كتب جديدة بانتظار مراجعة وقرار النشر ({pendingBooks.length})
              </h3>
            </div>
            <Badge variant="outline" className="bg-amber-500/20 text-amber-700 font-bold">
              مراجعة المحتوى
            </Badge>
          </div>

          <div className="space-y-3">
            {pendingBooks.map((b) => (
              <div key={b.id} className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-[260px] flex-1">
                  {b.cover_url ? (
                    <img src={b.cover_url} alt="" className="h-16 w-12 rounded-lg object-cover shadow-sm shrink-0" />
                  ) : (
                    <div className="h-16 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <BookOpen className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-foreground line-clamp-1">{b.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {b.author} · <span className="font-semibold text-primary">{b.publishers?.store_name ?? "دار نشر"}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px]">
                      <Badge variant="outline" className="text-[10px]">{b.category}</Badge>
                      <span className="font-bold font-mono text-emerald-600">
                        {b.price_digital ? `رقمي: ${formatMoney(b.price_digital)}` : ""}
                        {b.price_physical ? ` · ورقي: ${formatMoney(b.price_physical)}` : ""}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="h-9 rounded-xl font-bold text-xs gap-1 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    onClick={() => decideBook(b.id, true)}
                  >
                    <Check className="h-4 w-4" />
                    <span>موافقة ونشر بالمتجر</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 rounded-xl text-xs gap-1 cursor-pointer text-destructive hover:bg-destructive/10"
                    onClick={() => decideBook(b.id, false)}
                  >
                    <X className="h-4 w-4" />
                    <span>رفض</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Publishers Approval & Verification Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-bold text-foreground">
              مراجعة واعتماد دور النشر والمؤسسات
            </h3>
            <p className="text-xs text-muted-foreground">
              لا يفتح حساب دار النشر ولا يتاح لها رفع الكتالوج إلا بعد مراجعة وموافقة الإدارة.
            </p>
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
              الكل ({publishers.length})
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
              تحت المراجعة ({pendingPublishersCount})
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
              المعتمدون ({publishers.filter((p) => getUserApprovalStatus(p.id, p.email) === "approved").length})
            </button>

            <div className="relative w-full sm:w-56">
              <Search className="absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم دار النشر..."
                className="ps-9 h-9 rounded-xl text-xs bg-card"
              />
            </div>
          </div>
        </div>

        {publishers.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground border rounded-2xl bg-card">
            لا توجد دور نشر مسجلة حالياً.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-xs">
            <table className="w-full text-start text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground font-bold text-[11px] sm:text-xs">
                  <th className="py-3 px-4 text-start">دار النشر / المؤسسة</th>
                  <th className="py-3 px-4 text-start">حالة الاعتماد</th>
                  <th className="py-3 px-4 text-start">كتالوج الكتب المنشورة</th>
                  <th className="py-3 px-4 text-start">تاريخ التسجيل</th>
                  <th className="py-3 px-4 text-center">إجراءات المراجعة والاعتماد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {publishers
                  .filter((p) => {
                    const st = getUserApprovalStatus(p.id, p.email);
                    if (filterTab === "pending" && st !== "pending") return false;
                    if (filterTab === "approved" && st !== "approved") return false;
                    const q = searchQuery.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      p.store_name.toLowerCase().includes(q) ||
                      (p.email && p.email.toLowerCase().includes(q))
                    );
                  })
                  .map((pub) => {
                    const status = getUserApprovalStatus(pub.id, pub.email);

                    return (
                      <tr key={pub.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-600 font-bold">
                              <Store className="h-5 w-5" />
                            </span>
                            <div>
                              <div className="font-bold text-foreground">{pub.store_name}</div>
                              <div className="text-[11px] text-muted-foreground truncate max-w-48" dir="ltr">
                                {pub.email || pub.bio || "دار نشر وتوزيع في منصة unibook"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {status === "approved" ? (
                            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40 font-bold text-[11px]">
                              <ShieldCheck className="h-3 w-3 me-1" /> دار نشر معتمدة
                            </Badge>
                          ) : status === "rejected" ? (
                            <Badge variant="destructive" className="font-bold text-[11px]">
                              <XCircle className="h-3 w-3 me-1" /> حساب معلّق
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-500/20 text-amber-700 border-amber-500/40 font-bold text-[11px]">
                              <Clock className="h-3 w-3 me-1 animate-pulse" /> تحت المراجعة
                            </Badge>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-xs text-foreground">
                          {pub.books?.length || 0} إصدار في الكتالوج
                        </td>

                        <td className="py-3.5 px-4 text-xs text-muted-foreground font-mono">
                          {new Date(pub.created_at).toLocaleDateString("ar-EG")}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {status !== "approved" && (
                              <Button
                                size="sm"
                                className="h-8 rounded-xl text-xs gap-1 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() =>
                                  handleSetPublisherStatus(pub.id, pub.store_name, pub.email, "approved")
                                }
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>اعتماد الدار</span>
                              </Button>
                            )}

                            {status === "approved" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-xl text-xs gap-1 cursor-pointer text-destructive hover:bg-destructive/10"
                                onClick={() =>
                                  handleSetPublisherStatus(pub.id, pub.store_name, pub.email, "rejected")
                                }
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span>تعليق الحساب</span>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
