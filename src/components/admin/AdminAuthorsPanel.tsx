import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PenLine,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Wallet,
  Sparkles,
  Check,
  X,
  Search,
  Pencil,
  Trash2,
  FileText,
  Download,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  getAllPlanRequests,
  activatePlanRequest,
  rejectPlanRequest,
  type AuthorPlanRequest,
} from "@/lib/author-plans";
import {
  getAccountApprovals,
  getUserApprovalStatus,
  syncAccountApprovalsFromDb,
  updateAccountApprovalStatus,
  updateAccountApprovalInfo,
  deleteAccountApproval,
} from "@/lib/admin-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProductionAdmin } from "@/components/ProductionAdmin";
import { downloadAuthorFile } from "@/components/AuthorStudio";
import { useLocale } from "@/lib/locale";

export function AdminAuthorsPanel() {
  const { t } = useLocale();
  const qc = useQueryClient();
  const [filterTab, setFilterTab] = useState<"all" | "pending" | "approved">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);
  const [subTab, setSubTab] = useState<"accounts" | "production" | "plans" | "payouts">("accounts");
  const [editingAuthor, setEditingAuthor] = useState<{
    id: string;
    store_name: string;
    author_code: string;
    bio: string;
    email?: string | null | undefined;
  } | null>(null);
  const [authorDocs, setAuthorDocs] = useState<{ name: string; path: string }[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  useEffect(() => {
    const onUpdate = () => setTick((n) => n + 1);
    window.addEventListener("unibook_admin_update", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("unibook_admin_update", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  // 1. Fetch publishers with author accounts from Supabase
  const { data: remoteAuthors = [], refetch: refetchAuthors } = useQuery({
    queryKey: ["admin-authors-list"],
    queryFn: async () => {
      try {
        await syncAccountApprovalsFromDb();
        const { data, error } = await supabase
          .from("publishers")
          .select("*, manuscripts(*), books(*)")
          .order("created_at", { ascending: false });
        if (error) return [];
        return (data || []).filter((p) => p.account_type !== "publisher");
      } catch {
        return [];
      }
    },
  });

  // 2. Fetch author plan requests
  const { data: planRequests = [], refetch: refetchPlans } = useQuery<AuthorPlanRequest[]>({
    queryKey: ["admin-author-plans"],
    queryFn: () => getAllPlanRequests(),
  });

  // 3. Fetch author payouts
  const { data: payouts = [], refetch: refetchPayouts } = useQuery({
    queryKey: ["admin-author-payouts"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("author_payouts")
          .select("*, publishers(store_name,author_code)")
          .order("created_at", { ascending: false });
        if (error) return [];
        return data || [];
      } catch {
        return [];
      }
    },
  });

  // Merge remote authors with locally registered authors & approval records
  const approvalAuthors = getAccountApprovals().filter((a) => a.role === "author");

  const authorsMap = new Map<
    string,
    {
      id: string;
      email?: string | null | undefined;
      store_name: string;
      bio?: string | null;
      author_code?: string | null;
      books?: Record<string, unknown>[];
      manuscripts?: Record<string, unknown>[];
      created_at: string;
    }
  >();

  for (const a of remoteAuthors) {
    authorsMap.set(a.id, { ...a });
  }
  for (const aa of approvalAuthors) {
    if (!authorsMap.has(aa.userId)) {
      authorsMap.set(aa.userId, {
        id: aa.userId,
        email: aa.email,
        store_name: aa.name || "مؤلف unibook",
        bio: aa.notes || "مؤلف وباحث علمي في unibook",
        author_code: `AUTH-${aa.userId.slice(0, 6).toUpperCase()}`,
        books: [],
        manuscripts: [],
        created_at: aa.appliedAt,
      });
    } else {
      const item = authorsMap.get(aa.userId)!;
      if (!item.email && aa.email) item.email = aa.email;
      if (!item.store_name && aa.name) item.store_name = aa.name;
    }
  }

  const authors = Array.from(authorsMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Handle plan approval
  async function handleActivatePlan(req: AuthorPlanRequest) {
    setBusy(true);
    const ok = await activatePlanRequest(req.id);
    setBusy(false);
    if (ok) {
      toast.success(`تم تأكيد التحويل وتفعيل باقة (${req.planTitle}) للمؤلف ${req.authorName}!`);
      refetchPlans();
      qc.invalidateQueries();
    } else {
      toast.error("حدث خطأ أثناء تفعيل الباقة");
    }
  }

  async function handleRejectPlan(req: AuthorPlanRequest) {
    const reason = prompt(`سبب رفض تفعيل الباقة للمؤلف (${req.authorName})؟`, "تعذر تأكيد استلام تحويل المحفظة");
    if (reason === null) return;
    setBusy(true);
    const ok = await rejectPlanRequest(req.id, reason);
    setBusy(false);
    if (ok) {
      toast.info(`تم رفض طلب التفعيل للمؤلف ${req.authorName}`);
      refetchPlans();
    }
  }

  // Handle author account status update
  async function handleSetAuthorStatus(
    authorId: string,
    authorName: string,
    authorEmail: string | undefined,
    status: "approved" | "rejected" | "pending"
  ) {
    setBusy(true);
    await updateAccountApprovalStatus(authorId, status, undefined, {
      role: "author",
      name: authorName,
      email: authorEmail || "",
    });
    setBusy(false);
    setTick((n) => n + 1);
    toast.success(
      status === "approved"
        ? `تم اعتماد حساب المؤلف (${authorName}) وحفظ الموافقة في قاعدة البيانات`
        : status === "rejected"
          ? `تم تعليق/رفض حساب المؤلف (${authorName}) في قاعدة البيانات`
          : `تم تعيين حساب المؤلف (${authorName}) قيد المراجعة`
    );
    refetchAuthors();
    qc.invalidateQueries();
  }

  async function openAuthorEditor(author: {
    id: string;
    store_name: string;
    author_code?: string | null;
    bio?: string | null;
    email?: string | null | undefined;
  }) {
    setEditingAuthor({
      id: author.id,
      store_name: author.store_name || "",
      author_code: author.author_code || "",
      bio: author.bio || "",
      email: author.email,
    });
    setDocsLoading(true);
    setAuthorDocs([]);
    try {
      const { data } = await supabase.storage.from("author-documents").list(author.id);
      setAuthorDocs(
        (data || [])
          .filter((f) => f.name && f.name !== ".emptyFolderPlaceholder")
          .map((f) => ({ name: f.name, path: `${author.id}/${f.name}` }))
      );
    } catch {
      setAuthorDocs([]);
    } finally {
      setDocsLoading(false);
    }
  }

  async function handleSaveAuthorEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAuthor) return;
    setBusy(true);
    try {
      await supabase
        .from("publishers")
        .update({
          store_name: editingAuthor.store_name.trim(),
          bio: editingAuthor.bio.trim(),
          ...(editingAuthor.author_code.trim() ? { author_code: editingAuthor.author_code.trim() } : {}),
        })
        .eq("id", editingAuthor.id);
      await updateAccountApprovalInfo(editingAuthor.id, editingAuthor.store_name.trim(), editingAuthor.bio.trim());
      toast.success("تم تحديث بيانات المؤلف بنجاح");
      setEditingAuthor(null);
      refetchAuthors();
      qc.invalidateQueries();
    } catch {
      toast.error("تعذر تحديث بيانات المؤلف");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteAuthor(authorId: string, authorName: string) {
    if (!confirm(`هل أنت متأكد من مسح حساب المؤلف (${authorName}) نهائياً؟`)) return;
    setBusy(true);
    const ok = await deleteAccountApproval(authorId);
    setBusy(false);
    if (ok) {
      toast.success(`تم مسح حساب المؤلف (${authorName})`);
      refetchAuthors();
      qc.invalidateQueries();
    } else {
      toast.error("تعذر مسح الحساب");
    }
  }

  async function handleDeleteAuthorDoc(path: string) {
    if (!confirm("هل تريد مسح هذا الملف من التخزين؟")) return;
    const { error } = await supabase.storage.from("author-documents").remove([path]);
    if (error) {
      toast.error("تعذر مسح الملف");
      return;
    }
    setAuthorDocs((prev) => prev.filter((d) => d.path !== path));
    toast.success("تم مسح الملف");
  }

  // Handle payout review
  async function handleReviewPayout(id: string, status: "paid" | "rejected") {
    const reference = prompt(status === "paid" ? "رقم مرجع التحويل البنكي/المحفظة المنفّذ؟" : "سبب رفض التحويل؟");
    if (!reference) return;
    setBusy(true);
    const { error } = await supabase.rpc("review_author_payout", {
      _id: id,
      _status: status,
      _reference: reference,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message || "تعذر تحديث طلب السحب");
    } else {
      toast.success(status === "paid" ? "تم تسجيل تحويل الأرباح للمؤلف" : "تم رفض طلب السحب");
      refetchPayouts();
    }
  }

  // Pending items count
  const pendingPlans = planRequests.filter((p) => p.status === "pending");
  const pendingPayouts = payouts.filter((p) => p.status === "requested");
  const pendingAuthorsCount = authors.filter(
    (a) => getUserApprovalStatus(a.id, a.email) === "pending"
  ).length;

  return (
    <div className="space-y-8" dir="rtl">
      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground">{t("المؤلفون والباحثون", "Registered Authors")}</p>
            <p className="mt-2 text-3xl font-extrabold text-foreground font-mono">{authors.length}</p>
            <p className="text-[11px] text-amber-600 mt-1 font-semibold">
              {pendingAuthorsCount > 0
                ? `${pendingAuthorsCount} مؤلف بانتظار موافقة الأدمن`
                : "يخضعون لمراجعة الإدارة"}
            </p>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-600">
            <PenLine className="h-6 w-6" />
          </span>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground">{t("طلبات باقات النشر المعلقة", "Pending Plans")}</p>
            <p className="mt-2 text-3xl font-extrabold text-foreground font-mono">{pendingPlans.length}</p>
            <p className="text-[11px] text-primary mt-1 font-semibold">تحويلات محفظة بانتظار التأكيد</p>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </span>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground">{t("طلبات سحب الأرباح", "Pending Payouts")}</p>
            <p className="mt-2 text-3xl font-extrabold text-foreground font-mono">{pendingPayouts.length}</p>
            <p className="text-[11px] text-emerald-600 mt-1 font-semibold">مستحقات أرباح مبيعات الكتب</p>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <Wallet className="h-6 w-6" />
          </span>
        </div>
      </div>

      {/* Sub-navigation matching Author Dropdown */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-border/70 bg-muted/30 p-1.5">
        <button
          type="button"
          onClick={() => setSubTab("accounts")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            subTab === "accounts" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <PenLine className="h-3.5 w-3.5" /> حسابات وبيانات ووثائق المؤلفين ({authors.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab("production")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            subTab === "production" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-3.5 w-3.5" /> ملفات المؤلفين والإنتاج والكتب
        </button>
        <button
          type="button"
          onClick={() => setSubTab("plans")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            subTab === "plans" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" /> باقات النشر ({pendingPlans.length} معلق)
        </button>
        <button
          type="button"
          onClick={() => setSubTab("payouts")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            subTab === "payouts" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Wallet className="h-3.5 w-3.5" /> سحب الأرباح ({pendingPayouts.length} معلق)
        </button>
      </div>

      {subTab === "production" && (
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs">
          <h3 className="font-display text-xl font-bold text-foreground mb-4">
            استعراض ملفات المؤلفين (Word / PDF) ومراحل الإنتاج والنشر
          </h3>
          <ProductionAdmin />
        </div>
      )}

      {/* Section 1: Pending Author Plans */}
      {pendingPlans.length > 0 && (
        <div className="rounded-3xl border-2 border-amber-500/40 bg-amber-500/5 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-600 animate-pulse" />
              <h3 className="font-display text-lg font-extrabold text-foreground">
                طلبات تفعيل باقات النشر بانتظار المراجعة والتأكيد ({pendingPlans.length})
              </h3>
            </div>
            <Badge variant="outline" className="bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
              تأكيد المحفظة
            </Badge>
          </div>

          <div className="space-y-3">
            {pendingPlans.map((req) => (
              <div key={req.id} className="p-4 rounded-2xl border border-amber-500/30 bg-card shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-base text-foreground">{req.authorName}</span>
                    <span className="ms-2 text-xs text-muted-foreground font-mono">({req.userEmail})</span>
                  </div>
                  <Badge variant="outline" className="bg-primary/10 text-primary font-bold">
                    {req.planTitle} ({req.booksCount} كتب)
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-muted/40 p-3 rounded-xl">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">المبلغ المحوّل:</span>
                    <span className="font-bold text-foreground font-mono">{req.priceDisplay}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">محفظة المحوّل:</span>
                    <span className="font-bold text-foreground font-mono" dir="ltr">{req.walletSender}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">المرجع / العملية:</span>
                    <span className="font-bold text-foreground font-mono" dir="ltr">{req.reference}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">التاريخ:</span>
                    <span className="text-muted-foreground font-mono">{new Date(req.requestedAt).toLocaleDateString("ar-EG")}</span>
                  </div>
                </div>

                {req.notes && (
                  <p className="text-xs text-muted-foreground bg-background p-2 rounded-lg border">
                    <strong>ملاحظة المؤلف:</strong> {req.notes}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    className="h-9 rounded-xl font-bold text-xs gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    disabled={busy}
                    onClick={() => handleActivatePlan(req)}
                  >
                    <Check className="h-4 w-4" />
                    <span>تأكيد استلام التحويل وتفعيل الباقة للمؤلف</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 rounded-xl text-xs gap-1.5 cursor-pointer text-destructive hover:bg-destructive/10"
                    disabled={busy}
                    onClick={() => handleRejectPlan(req)}
                  >
                    <X className="h-4 w-4" />
                    <span>رفض التحويل</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Authors Approval & Management */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-bold text-foreground">
              مراجعة واعتماد حسابات المؤلفين
            </h3>
            <p className="text-xs text-muted-foreground">
              لا يفتح حساب المؤلف ولا تتاح له لوحة النشر إلا بعد موافقة الإدارة.
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
              الكل ({authors.length})
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
              تحت المراجعة ({pendingAuthorsCount})
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
              المعتمدون ({authors.filter((a) => getUserApprovalStatus(a.id, a.email) === "approved").length})
            </button>

            <div className="relative w-full sm:w-56">
              <Search className="absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم المؤلف أو الكود..."
                className="ps-9 h-9 rounded-xl text-xs bg-card"
              />
            </div>
          </div>
        </div>

        {authors.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground border rounded-2xl bg-card">
            لا يوجد مؤلفون مسجلون حالياً.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-xs">
            <table className="w-full text-start text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground font-bold text-[11px] sm:text-xs">
                  <th className="py-3 px-4 text-start">المؤلف</th>
                  <th className="py-3 px-4 text-start">كود المؤلف</th>
                  <th className="py-3 px-4 text-start">حالة الاعتماد</th>
                  <th className="py-3 px-4 text-start">المخطوطات والكتب</th>
                  <th className="py-3 px-4 text-center">إجراءات المراجعة والاعتماد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {authors
                  .filter((a) => {
                    const st = getUserApprovalStatus(a.id, a.email);
                    if (filterTab === "pending" && st !== "pending") return false;
                    if (filterTab === "approved" && st !== "approved") return false;
                    const q = searchQuery.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      a.store_name.toLowerCase().includes(q) ||
                      (a.email && a.email.toLowerCase().includes(q)) ||
                      (a.author_code && a.author_code.toLowerCase().includes(q))
                    );
                  })
                  .map((author) => {
                    const status = getUserApprovalStatus(author.id, author.email);

                    return (
                      <tr key={author.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-700 font-bold">
                              {author.store_name[0] || "م"}
                            </span>
                            <div>
                              <div className="font-bold text-foreground">{author.store_name}</div>
                              <div className="text-[11px] text-muted-foreground truncate max-w-44" dir="ltr">
                                {author.email || author.bio || "مؤلف وباحث في unibook"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-xs" dir="ltr">
                          {author.author_code || "AUTH-" + author.id.slice(0, 6)}
                        </td>

                        <td className="py-3.5 px-4">
                          {status === "approved" ? (
                            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40 font-bold text-[11px]">
                              <ShieldCheck className="h-3 w-3 me-1" /> مؤلف معتمد
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

                        <td className="py-3.5 px-4 text-xs font-mono text-muted-foreground">
                          <div>{author.books?.length || 0} كتب منشورة</div>
                          <div className="text-[10px] text-primary">{author.manuscripts?.length || 0} مخطوطات</div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {status !== "approved" && (
                              <Button
                                size="sm"
                                className="h-8 rounded-xl text-xs gap-1 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() =>
                                  handleSetAuthorStatus(author.id, author.store_name, author.email ?? undefined, "approved")
                                }
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>اعتماد الحساب</span>
                              </Button>
                            )}

                            {status === "approved" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-xl text-xs gap-1 cursor-pointer text-amber-700 hover:bg-amber-500/10"
                                onClick={() =>
                                  handleSetAuthorStatus(author.id, author.store_name, author.email ?? undefined, "rejected")
                                }
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span>تعليق</span>
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-xl text-xs gap-1 cursor-pointer"
                              onClick={() => openAuthorEditor(author)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span>تعديل ووثائق</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-xl text-xs gap-1 cursor-pointer text-destructive hover:bg-destructive/10"
                              disabled={busy}
                              onClick={() => handleDeleteAuthor(author.id, author.store_name)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>مسح</span>
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
      </div>

      {/* Section 3: Author Royalty Withdrawals */}
      <div className="space-y-4 pt-4 border-t border-border/70">
        <h3 className="font-display text-xl font-bold text-foreground">
          طلبات سحب أرباح مبيعات المؤلفين
        </h3>

        {payouts.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground border rounded-2xl bg-card">
            لا توجد طلبات سحب أرباح مسجلة حالياً.
          </p>
        ) : (
          <div className="space-y-3">
            {payouts.map((p) => (
              <div key={p.id} className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1 min-w-[240px]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{p.publishers?.store_name}</span>
                    <span className="font-mono text-xs text-muted-foreground" dir="ltr">({p.publishers?.author_code})</span>
                    <Badge variant={p.status === "paid" ? "outline" : p.status === "rejected" ? "destructive" : "secondary"}>
                      {p.status === "paid" ? "تم التحويل بنجاح" : p.status === "rejected" ? "مرفوض" : "بانتظار التحويل"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/40 p-2 rounded-lg">
                    {p.transfer_details}
                  </div>
                  {p.reference && (
                    <div className="text-[11px] font-mono text-emerald-600">
                      مرجع العملية: {p.reference}
                    </div>
                  )}
                </div>

                <div className="text-end">
                  <div className="font-mono font-extrabold text-lg text-primary">
                    {p.amount} {p.currency}
                  </div>
                  {p.status === "requested" && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        className="h-8 rounded-xl text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                        disabled={busy}
                        onClick={() => handleReviewPayout(p.id, "paid")}
                      >
                        <Check className="h-3.5 w-3.5" /> تأكيد التحويل
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-xl text-xs gap-1 text-destructive hover:bg-destructive/10 cursor-pointer"
                        disabled={busy}
                        onClick={() => handleReviewPayout(p.id, "rejected")}
                      >
                        <X className="h-3.5 w-3.5" /> رفض
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Dialog open={!!editingAuthor} onOpenChange={(o) => !o && setEditingAuthor(null)}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل بيانات المؤلف والوثائق المرفوعة</DialogTitle>
          </DialogHeader>
          {editingAuthor && (
            <form onSubmit={handleSaveAuthorEdit} className="space-y-4">
              <div>
                <Label>اسم المؤلف / المتجر</Label>
                <Input
                  className="mt-1"
                  required
                  value={editingAuthor.store_name}
                  onChange={(e) => setEditingAuthor({ ...editingAuthor, store_name: e.target.value })}
                />
              </div>
              <div>
                <Label>كود المؤلف</Label>
                <Input
                  className="mt-1 font-mono"
                  dir="ltr"
                  value={editingAuthor.author_code}
                  onChange={(e) => setEditingAuthor({ ...editingAuthor, author_code: e.target.value })}
                />
              </div>
              <div>
                <Label>النبذة / الملاحظات</Label>
                <Textarea
                  className="mt-1"
                  rows={3}
                  value={editingAuthor.bio}
                  onChange={(e) => setEditingAuthor({ ...editingAuthor, bio: e.target.value })}
                />
              </div>

              <div className="border-t pt-3 space-y-2">
                <Label className="flex items-center gap-1.5">
                  <FolderOpen className="h-4 w-4 text-primary" />
                  الوثائق والملفات المرفوعة (الشهادة الجامعية / الهوية / الملفات)
                </Label>
                {docsLoading ? (
                  <p className="text-xs text-muted-foreground">جارٍ تحميل قائمة الملفات...</p>
                ) : authorDocs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">لا توجد ملفات مرفوعة في التخزين لهذا المؤلف.</p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {authorDocs.map((doc) => (
                      <div key={doc.path} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-xs">
                        <span className="truncate font-mono" dir="ltr">{doc.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => downloadAuthorFile(doc.path)}>
                            <Download className="h-3 w-3 me-1" /> فتح
                          </Button>
                          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs text-destructive" onClick={() => handleDeleteAuthorDoc(doc.path)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingAuthor(null)}>إلغاء</Button>
                <Button type="submit" disabled={busy}>حفظ التعديلات</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
