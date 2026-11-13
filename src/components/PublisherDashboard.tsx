import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  BookOpen,
  Plus,
  TrendingUp,
  PackageCheck,
  FileText,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Edit,
  Trash2,
  Loader2,
  Save,
  Layers,
  Sparkles,
  Truck,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLocale } from "@/lib/locale";
import { formatPrice } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tables } from "@/integrations/supabase/types";

export function PublisherDashboard() {
  const { session, loading, refresh } = useAuth();
  const { t } = useLocale();
  const qc = useQueryClient();
  const uid = session?.user.id;

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = window.sessionStorage.getItem("unibook_publisher_tab");
      if (saved === "new-book") return "books";
      if (saved) return saved;
    }
    return "books";
  });
  const [newBookDialogOpen, setNewBookDialogOpen] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.sessionStorage.getItem("unibook_publisher_tab") === "new-book";
    }
    return false;
  });

  useEffect(() => {
    const onTab = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (!detail) return;
      if (detail === "new-book") {
        setActiveTab("books");
        setNewBookDialogOpen(true);
      } else {
        setActiveTab(detail);
      }
    };
    window.addEventListener("unibook_publisher_tab", onTab);
    return () => window.removeEventListener("unibook_publisher_tab", onTab);
  }, []);
  const [submittingBook, setSubmittingBook] = useState(false);

  // New Book Form State
  const [bookForm, setBookForm] = useState({
    title: "",
    author: "",
    category: "علمي",
    description: "",
    format: "both" as "digital" | "physical" | "both",
    price_digital: "120",
    price_physical: "240",
    pages: "250",
    stock: "50",
    cover_url: "",
  });

  // Publisher Profile Data
  const { data: publisher, refetch: refetchPublisher } = useQuery({
    queryKey: ["publisher-profile", uid],
    enabled: !!uid,
    queryFn: async () => {
      if (!uid) return null;
      const { data, error } = await supabase
        .from("publishers")
        .select("*")
        .eq("id", uid)
        .maybeSingle();
      if (error) return null;
      return data;
    },
  });

  // Publisher Books
  const { data: books = [], isLoading: booksLoading, refetch: refetchBooks } = useQuery({
    queryKey: ["publisher-books", uid],
    enabled: !!uid,
    queryFn: async () => {
      if (!uid) return [];
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("publisher_id", uid)
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data ?? []) as Tables<"books">[];
    },
  });

  // Publisher Earnings
  const { data: earnings = [] } = useQuery({
    queryKey: ["publisher-earnings", uid],
    enabled: !!uid,
    queryFn: async () => {
      if (!uid) return [];
      const { data, error } = await supabase
        .from("author_earnings")
        .select("*")
        .eq("author_id", uid)
        .order("created_at", { ascending: false });
      if (error) return [];
      return data ?? [];
    },
  });

  // Publisher Profile Update
  const [editStoreName, setEditStoreName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!uid) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("publishers")
        .update({
          store_name: editStoreName || publisher?.store_name || "",
          bio: editBio || publisher?.bio || null,
        })
        .eq("id", uid);

      if (error) throw error;
      toast.success(t("تم تحديث بيانات دار النشر بنجاح!", "Publisher profile updated!"));
      refetchPublisher();
      await refresh();
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : "") || t("تعذر التحديث", "Update failed"));
    } finally {
      setSavingProfile(false);
    }
  }

  // Create Book under Publisher
  async function handleCreateBook(e: React.FormEvent) {
    e.preventDefault();
    if (!uid) return;
    setSubmittingBook(true);

    try {
      const payload = {
        title: bookForm.title.trim(),
        author: bookForm.author.trim(),
        category: bookForm.category.trim() || "علمي",
        description: bookForm.description.trim(),
        format: bookForm.format,
        price_digital: bookForm.format !== "physical" ? Number(bookForm.price_digital) || 0 : null,
        price_physical: bookForm.format !== "digital" ? Number(bookForm.price_physical) || 0 : null,
        pages: Number(bookForm.pages) || 100,
        stock: Number(bookForm.stock) || 10,
        cover_url: bookForm.cover_url.trim() || null,
        publisher_id: uid,
        status: "pending" as const, // Admin reviews and approves
      };

      const { error } = await supabase.from("books").insert(payload);
      if (error) throw error;

      toast.success(t("تمت إضافة الكتاب بنجاح وإرساله للمراجعة العلمية!", "Book submitted for review!"));
      setNewBookDialogOpen(false);
      refetchBooks();
      qc.invalidateQueries({ queryKey: ["publisher-books", uid] });

      // Reset form
      setBookForm({
        title: "",
        author: "",
        category: "علمي",
        description: "",
        format: "both",
        price_digital: "120",
        price_physical: "240",
        pages: "250",
        stock: "50",
        cover_url: "",
      });
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : "") || t("تعذر إضافة الكتاب", "Failed to add book"));
    } finally {
      setSubmittingBook(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const publishedCount = books.filter((b) => b.status === "approved").length;
  const pendingCount = books.filter((b) => b.status === "pending").length;
  const totalSalesGross = earnings.reduce((sum, item) => sum + Number(item.gross || 0), 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 space-y-8" dir="rtl">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-l from-primary/10 via-card to-card p-6 md:p-8 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Building2 className="h-9 w-9" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl md:text-3xl font-extrabold text-foreground">
                  {publisher?.store_name || t("دار النشر والمؤسسة العلمية", "Publishing House")}
                </h1>
                <Badge variant="outline" className="border-primary/40 text-primary text-xs font-bold">
                  دار نشر معتمدة
                </Badge>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mt-1 max-w-xl">
                {publisher?.bio || t("إدارة كتالوج إصدارات الكتب العلمية والرقمية والورقية ومتابعة المبيعات والطباعة.", "Manage scientific books, physical editions, and distribution.")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setNewBookDialogOpen(true)}
              className="gap-2 font-bold shadow-sm rounded-xl h-11 px-5"
            >
              <Plus className="h-4 w-4" />
              {t("إضافة كتاب جديد للدار", "Add New Book")}
            </Button>
          </div>
        </div>

        {/* Quick KPI Stats */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
            <p className="text-xs text-muted-foreground font-medium">{t("إجمالي الكتب المسجلة", "Total Books")}</p>
            <p className="mt-1 text-2xl font-extrabold text-foreground">{books.length}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
            <p className="text-xs text-muted-foreground font-medium">{t("كتب معتمدة ومنشورة", "Published")}</p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{publishedCount}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
            <p className="text-xs text-muted-foreground font-medium">{t("قيد المراجعة العلمية", "Pending Review")}</p>
            <p className="mt-1 text-2xl font-extrabold text-amber-600 dark:text-amber-400">{pendingCount}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
            <p className="text-xs text-muted-foreground font-medium">{t("إجمالي المبيعات", "Total Sales")}</p>
            <p className="mt-1 text-2xl font-extrabold text-primary">{formatPrice(totalSalesGross)}</p>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="h-auto w-full flex-wrap justify-start rounded-2xl bg-muted/70 p-1.5 border border-border/70 gap-1">
          <TabsTrigger value="books" className="rounded-xl px-4 py-2 text-sm font-bold gap-2">
            <BookOpen className="h-4 w-4" />
            {t("كتالوج إصدارات الدار", "Books Catalog")} ({books.length})
          </TabsTrigger>
          <TabsTrigger value="sales" className="rounded-xl px-4 py-2 text-sm font-bold gap-2">
            <TrendingUp className="h-4 w-4" />
            {t("المبيعات والأرباح", "Sales & Royalties")}
          </TabsTrigger>
          <TabsTrigger value="orders" className="rounded-xl px-4 py-2 text-sm font-bold gap-2">
            <Truck className="h-4 w-4" />
            {t("طلبات الشحن والتوزيع", "Shipping & Orders")}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-xl px-4 py-2 text-sm font-bold gap-2">
            <BarChart3 className="h-4 w-4" />
            {t("التقارير والتحليلات", "Reports & Analytics")}
          </TabsTrigger>
          <TabsTrigger value="contracts" className="rounded-xl px-4 py-2 text-sm font-bold gap-2">
            <ShieldCheck className="h-4 w-4" />
            {t("التراخيص والاتفاقيات", "Licenses & Contracts")}
          </TabsTrigger>
          <TabsTrigger value="profile" className="rounded-xl px-4 py-2 text-sm font-bold gap-2">
            <Building2 className="h-4 w-4" />
            {t("الملف التعريفي لدار النشر", "Publisher Profile")}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Books Catalog */}
        <TabsContent value="books" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span>{t("قائمة الكتب الصادرة عن الدار", "Published Books")}</span>
              <span className="text-xs text-muted-foreground font-normal">({books.length} كتاب)</span>
            </h2>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setNewBookDialogOpen(true)}
              className="gap-2 rounded-xl text-xs font-bold"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("إصدار كتاب جديد", "Publish Book")}
            </Button>
          </div>

          {booksLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-xs">{t("جاري تحميل كتالوج الكتب...", "Loading catalog...")}</p>
            </div>
          ) : books.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/80 p-12 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <BookOpen className="h-7 w-7" />
              </div>
              <h3 className="font-bold text-base text-foreground">
                {t("لم تقم دار النشر بإضافة أي كتب بعد", "No books published yet")}
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {t("ابدأ بإضافة كتبك العلمية والرقمية والورقية لتبدأ بالظهور للقراء في متجر unibook فور اعتمادها.", "Publish your books to make them available in unibook store.")}
              </p>
              <Button onClick={() => setNewBookDialogOpen(true)} className="gap-2 rounded-xl font-bold">
                <Plus className="h-4 w-4" />
                {t("إضافة أول كتاب الآن", "Add First Book")}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {books.map((book) => {
                const statusBadge = {
                  approved: { label: "معتمد ومنشور", class: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
                  pending: { label: "قيد المراجعة", class: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
                  rejected: { label: "تعديلات مطلوبة", class: "bg-destructive/15 text-destructive border-destructive/30" },
                }[book.status] || { label: book.status, class: "" };

                return (
                  <div
                    key={book.id}
                    className="flex flex-col rounded-2xl border border-border/80 bg-card p-4 shadow-xs hover:border-primary/40 hover:shadow-sm transition-all"
                  >
                    <div className="flex gap-4">
                      {book.cover_url ? (
                        <img
                          src={book.cover_url}
                          alt={book.title}
                          className="h-28 w-20 rounded-xl object-cover shadow-xs border border-border/70 shrink-0"
                        />
                      ) : (
                        <div className="flex h-28 w-20 shrink-0 items-center justify-center rounded-xl bg-muted border border-border/70 text-muted-foreground">
                          <BookOpen className="h-6 w-6" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <Badge variant="outline" className={`text-[10px] font-bold ${statusBadge.class}`}>
                            {statusBadge.label}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground font-medium">
                            {book.category || "علمي"}
                          </span>
                        </div>

                        <h4 className="font-bold text-sm text-foreground line-clamp-1">{book.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-1">{t("المؤلف:", "Author:")} {book.author}</p>

                        <div className="pt-2 text-xs font-bold text-primary">
                          {book.price_digital ? `${formatPrice(book.price_digital)} (رقمي)` : ""}
                          {book.price_digital && book.price_physical ? " • " : ""}
                          {book.price_physical ? `${formatPrice(book.price_physical)} (ورقي)` : ""}
                        </div>
                      </div>
                    </div>

                    {book.rejection_reason && book.status === "rejected" && (
                      <div className="mt-3 rounded-xl bg-destructive/10 p-2.5 text-xs text-destructive flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>ملاحظات المراجعة: {book.rejection_reason}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Sales & Royalties */}
        <TabsContent value="sales" className="space-y-4">
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {t("سجل مبيعات كتب دار النشر", "Sales Record")}
            </h3>

            {earnings.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                {t("لا توجد عمليات بيع مسجلة حتى الآن. ستظهر أرباح الكتب هنا فور شرائها من المتجر.", "No sales yet.")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="border-b border-border/70 text-muted-foreground">
                      <th className="py-2.5 text-start font-semibold">الكتاب</th>
                      <th className="py-2.5 text-start font-semibold">الصيغة</th>
                      <th className="py-2.5 text-start font-semibold">الكمية</th>
                      <th className="py-2.5 text-start font-semibold">المبلغ الإجمالي</th>
                      <th className="py-2.5 text-start font-semibold">صافي الدار</th>
                      <th className="py-2.5 text-start font-semibold">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.map((e) => (
                      <tr key={e.id} className="border-b border-border/50">
                        <td className="py-3 font-bold text-foreground">{e.book_title}</td>
                        <td className="py-3 text-muted-foreground">{e.format === "digital" ? "رقمي" : "ورقي"}</td>
                        <td className="py-3">{e.quantity}</td>
                        <td className="py-3">{formatPrice(e.gross)}</td>
                        <td className="py-3 font-bold text-emerald-600">{formatPrice(e.amount)}</td>
                        <td className="py-3 text-muted-foreground">{new Date(e.created_at).toLocaleDateString("ar-EG")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 3: Publisher Profile */}
        <TabsContent value="profile" className="space-y-4">
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs max-w-2xl">
            <h3 className="font-bold text-base text-foreground mb-4">
              {t("بيانات دار النشر والمؤسسة العلمية", "Publishing House Details")}
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="storeName" className="text-xs font-semibold">اسم دار النشر</Label>
                <Input
                  id="storeName"
                  defaultValue={publisher?.store_name}
                  onChange={(e) => setEditStoreName(e.target.value)}
                  placeholder="اسم دار النشر أو المؤسسة"
                  className="rounded-xl h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bio" className="text-xs font-semibold">نبذة تعريفية عن الدار وتخصصاتها العلمية</Label>
                <Textarea
                  id="bio"
                  rows={4}
                  defaultValue={publisher?.bio || ""}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="اكتب نبذة عن تاريخ الدار وتخصصاتها في نشر الكتب والرسائل العلمية..."
                  className="rounded-xl"
                />
              </div>

              <Button type="submit" disabled={savingProfile} className="gap-2 font-bold rounded-xl">
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t("حفظ التعديلات", "Save Changes")}
              </Button>
            </form>
          </div>
        </TabsContent>

        {/* Tab 4: Shipping & Orders */}
        <TabsContent value="orders" className="space-y-4">
          <div className="rounded-2xl border bg-card p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  <span>{t("طلبات الشحن والمخزون الورقي", "Physical Stock & Shipping Orders")}</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("متابعة توفر النسخ الورقية للكتب الصادرة عن الدار وحالة تجهيز الشحن.", "Monitor physical book stock and shipping readiness.")}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setActiveTab("books")} className="rounded-xl text-xs font-bold">
                {t("عرض الكتالوج", "View Catalog")}
              </Button>
            </div>
            {books.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {t("لا توجد إصدارات مسجلة لدار النشر بعد لمتابعة مخزونها.", "No books registered yet to track stock.")}
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {books.map((b) => (
                  <div key={b.id} className="rounded-xl border bg-muted/30 p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm line-clamp-1">{b.title}</h3>
                      <Badge variant="outline" className="text-[10px]">
                        {b.format === "digital" ? t("رقمي", "Digital") : b.format === "physical" ? t("ورقي", "Print") : t("رقمي وورقي", "Both")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("المخزون المتاح:", "Available Stock:")} <strong className="text-foreground">{b.stock ?? 0}</strong>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 5: Reports & Analytics */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="rounded-2xl border bg-card p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <span>{t("التقارير والتحليلات التفصيلية", "Catalog & Sales Analytics")}</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {t("ملخص أداء إصدارات الدار ونسب الاعتماد والمبيعات.", "Overview of catalog approval rates, formats, and sales.")}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">{t("إصدارات رقمية / مزدوجة", "Digital / Hybrid Titles")}</p>
                <p className="mt-1 text-2xl font-extrabold text-primary">
                  {books.filter((b) => b.format === "digital" || b.format === "both").length}
                </p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">{t("إصدارات ورقية / مزدوجة", "Print / Hybrid Titles")}</p>
                <p className="mt-1 text-2xl font-extrabold text-amber-600">
                  {books.filter((b) => b.format === "physical" || b.format === "both").length}
                </p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">{t("النسخ المباعة", "Copies Sold")}</p>
                <p className="mt-1 text-2xl font-extrabold text-emerald-600">
                  {earnings.filter((e) => !e.reversed).reduce((s, e) => s + Number(e.quantity || 0), 0)}
                </p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">{t("صافي الأرباح المسجلة", "Net Recorded Royalties")}</p>
                <p className="mt-1 text-2xl font-extrabold text-foreground">
                  {formatPrice(earnings.filter((e) => !e.reversed).reduce((s, e) => s + Number(e.amount || 0), 0))}
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 6: Licenses & Contracts */}
        <TabsContent value="contracts" className="space-y-4">
          <div className="rounded-2xl border bg-card p-6 md:p-8 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <span>{t("تراخيص دار النشر واتفاقية التوزيع", "Publisher Licensing & Distribution Terms")}</span>
              </h2>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                {t("حساب دار نشر معتمد", "Verified Publisher")}
              </Badge>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 text-sm">
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">{t("كود الدار المرجعي", "Publisher Code")}</p>
                <p className="mt-1 font-mono font-bold text-primary">{publisher?.author_code || "PUB-UNIBOOK"}</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">{t("تغطية النشر الرقمي", "Digital Distribution")}</p>
                <p className="mt-1 font-bold text-emerald-600">{t("تفعيل عالمي فوري", "Global Instant Access")}</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">{t("دعم الشحن واللوجستيات", "Shipping & Fulfillment")}</p>
                <p className="mt-1 font-bold text-foreground">{t("متابعة مركزية عبر المنصة", "Managed via unibook")}</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc ps-5">
              <li>{t("تلتزم دار النشر بملكية حقوق النشر والتوزيع لجميع الكتب المضافة في الكتالوج.", "The publisher certifies ownership of publishing and distribution rights for all listed titles.")}</li>
              <li>{t("تُراجع الكتب الجديدة علمياً وفنياً قبل ظهورها العام في متجر unibook.", "New titles undergo editorial and technical review before store publication.")}</li>
              <li>{t("يمكن للدار تحديث ملفها التعريفي وإضافة إصدارات غير محدودة في أي وقت.", "Publishers can update their profile and add titles anytime.")}</li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add New Book Modal Dialog */}
      <Dialog open={newBookDialogOpen} onOpenChange={setNewBookDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <span>{t("إصدار وإضافة كتاب جديد لدار النشر", "Publish New Book")}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t("أدخل تفاصيل الكتاب العلمي ليتم اعتماده ونشره في متجر unibook.", "Enter book details to publish in unibook store.")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateBook} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{t("عنوان الكتاب", "Book Title")}</Label>
              <Input
                required
                value={bookForm.title}
                onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                placeholder="اكتب عنوان الكتاب العلمي كاملاً"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{t("اسم المؤلف / الكاتب", "Author Name")}</Label>
                <Input
                  required
                  value={bookForm.author}
                  onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                  placeholder="د. فلان الفلاني"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{t("المجال / التصنيف العلمي", "Category")}</Label>
                <Input
                  value={bookForm.category}
                  onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                  placeholder="طب، هندسة، تقنية، علوم شرعية..."
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{t("صيغة النشر", "Format")}</Label>
                <Select
                  value={bookForm.format}
                  onValueChange={(val: "digital" | "physical" | "both") => setBookForm({ ...bookForm, format: val })}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">كتاب رقمي + ورقي مطبوع</SelectItem>
                    <SelectItem value="digital">كتاب رقمي فقط (PDF)</SelectItem>
                    <SelectItem value="physical">كتاب ورقي مطبوع فقط</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{t("عدد الصفحات", "Pages")}</Label>
                <Input
                  type="number"
                  value={bookForm.pages}
                  onChange={(e) => setBookForm({ ...bookForm, pages: e.target.value })}
                  placeholder="250"
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-2 gap-3">
              {bookForm.format !== "physical" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">{t("سعر النسخة الرقمية (ر.س)", "Digital Price (SAR)")}</Label>
                  <Input
                    type="number"
                    value={bookForm.price_digital}
                    onChange={(e) => setBookForm({ ...bookForm, price_digital: e.target.value })}
                    className="h-11 rounded-xl"
                  />
                </div>
              )}
              {bookForm.format !== "digital" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">{t("سعر النسخة الورقية (ر.س)", "Physical Price (SAR)")}</Label>
                  <Input
                    type="number"
                    value={bookForm.price_physical}
                    onChange={(e) => setBookForm({ ...bookForm, price_physical: e.target.value })}
                    className="h-11 rounded-xl"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{t("رابط صورة الغلاف (اختياري)", "Cover Image URL")}</Label>
              <Input
                value={bookForm.cover_url}
                onChange={(e) => setBookForm({ ...bookForm, cover_url: e.target.value })}
                placeholder="https://..."
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{t("نبذة عن الكتاب والمحتوى العلمي", "Synopsis / Description")}</Label>
              <Textarea
                rows={3}
                value={bookForm.description}
                onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                placeholder="اكتب ملخصاً علمياً شاملاً عن محتوى الكتاب وأهم محاوره..."
                className="rounded-xl"
              />
            </div>

            <Button
              type="submit"
              disabled={submittingBook}
              className="w-full h-12 font-bold rounded-xl gap-2 mt-2"
            >
              {submittingBook ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري تسجيل الكتاب...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  تأكيد إضافة الكتاب ونشره
                </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
