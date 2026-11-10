import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Tag,
  Percent,
  Plus,
  Trash2,
  Edit3,
  Check,
  Search,
  BookOpen,
  Sparkles,
  Layers,
  Save,
  DollarSign,
  AlertCircle,
  Megaphone,
  Upload,
  Image as ImageIcon,
  Truck,
  Calendar,
  FileText,
  CheckCircle2,
  X,
  Loader2,
  Clock,
  Link as LinkIcon,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adminCreateBookServerFn } from "@/lib/admin-books.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getAdminCategories,
  addAdminCategory,
  removeAdminCategory,
  getAdminDiscounts,
  setBookDiscount,
  removeBookDiscount,
  getAdminMarqueeText,
  setAdminMarqueeText,
  getAdminBanners,
  setAdminBanners,
  type BookDiscount,
  type SiteBanner,
} from "@/lib/admin-store";
import { useLocale } from "@/lib/locale";
import type { Book } from "@/components/BookCard";

export function AdminSiteControl() {
  const { t, price: formatMoney } = useLocale();
  const qc = useQueryClient();

  // Add Book Dialog & Form State
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [isSubmittingBook, setIsSubmittingBook] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newCategory, setNewCategory] = useState("روايات");
  const [newCustomCategory, setNewCustomCategory] = useState("");
  const [newFormat, setNewFormat] = useState<"both" | "digital" | "physical">("both");
  const [newPriceDigital, setNewPriceDigital] = useState("");
  const [newPricePhysical, setNewPricePhysical] = useState("");
  const [newStock, setNewStock] = useState("50");
  const [newPages, setNewPages] = useState("200");
  const [newPublishYear, setNewPublishYear] = useState(new Date().getFullYear().toString());
  const [newCoverUrl, setNewCoverUrl] = useState("");
  const [newCoverFile, setNewCoverFile] = useState<File | null>(null);
  const [newCoverPreview, setNewCoverPreview] = useState<string | null>(null);
  const [newDescription, setNewDescription] = useState("");
  const [hasDiscount, setHasDiscount] = useState(false);
  const [newDiscountPercent, setNewDiscountPercent] = useState("20");
  const [newDiscountBadge, setNewDiscountBadge] = useState("خصم 20%");
  const [hasShipping, setHasShipping] = useState(true);
  const [newShippingPrice, setNewShippingPrice] = useState("0");
  const [newShippingDays, setNewShippingDays] = useState("2 - 4 أيام عمل");
  const [newDigitalPdfFile, setNewDigitalPdfFile] = useState<File | null>(null);

  const [coverInputMode, setCoverInputMode] = useState<"upload" | "url">("upload");

  function resetAddBookForm() {
    setNewTitle("");
    setNewAuthor("");
    setNewCategory(categories[0] || "روايات");
    setNewCustomCategory("");
    setNewFormat("both");
    setNewPriceDigital("");
    setNewPricePhysical("");
    setNewStock("50");
    setNewPages("200");
    setNewPublishYear(new Date().getFullYear().toString());
    setNewCoverUrl("");
    setNewCoverFile(null);
    setNewCoverPreview(null);
    setCoverInputMode("upload");
    setNewDescription("");
    setHasDiscount(false);
    setNewDiscountPercent("20");
    setNewDiscountBadge("خصم 20%");
    setHasShipping(true);
    setNewShippingPrice("0");
    setNewShippingDays("2 - 4 أيام عمل");
    setNewDigitalPdfFile(null);
  }

  async function handleCreateBook(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("يرجى إدخال عنوان الكتاب", {
        description: "عنوان الكتاب إلزامي لعرضه وتوثيقه في المتجر.",
      });
      return;
    }
    if (!newAuthor.trim()) {
      toast.error("يرجى إدخال اسم المؤلف", {
        description: "اسم الكاتب أو المؤلف مطلوب للبحث وتصنيف الكتب.",
      });
      return;
    }

    setIsSubmittingBook(true);
    try {
      let finalCoverUrl = newCoverUrl.trim();

      // 1. Upload cover file if provided
      if (newCoverFile) {
        try {
          const coverExt = newCoverFile.name.split(".").pop() || "jpg";
          const coverPath = `admin-covers/${crypto.randomUUID()}.${coverExt}`;
          const { error: upErr } = await supabase.storage.from("covers").upload(coverPath, newCoverFile, {
            cacheControl: "3600",
            upsert: true,
          });
          if (!upErr) {
            const { data: pubData } = supabase.storage.from("covers").getPublicUrl(coverPath);
            if (pubData?.publicUrl) {
              finalCoverUrl = pubData.publicUrl;
            }
          }
        } catch (uploadErr) {
          console.warn("Cover upload notice:", uploadErr);
        }
      }

      // 2. Upload digital PDF if provided
      let filePath: string | null = null;
      if (newDigitalPdfFile) {
        try {
          const pdfExt = newDigitalPdfFile.name.split(".").pop() || "pdf";
          const safeName = newDigitalPdfFile.name.replace(/[^\w.-]/g, "_");
          const pdfPath = `admin-books/${crypto.randomUUID()}-${safeName}`;
          const { error: pdfErr } = await supabase.storage.from("book-files").upload(pdfPath, newDigitalPdfFile, {
            cacheControl: "3600",
            upsert: true,
          });
          if (!pdfErr) {
            filePath = pdfPath;
          }
        } catch (pdfErr) {
          console.warn("PDF upload notice:", pdfErr);
        }
      }

      // 3. Format description with metadata (year, pages, shipping)
      let fullDescription = newDescription.trim() || `كتاب ${newTitle} للمؤلف ${newAuthor}.`;
      const metaParts: string[] = [];
      if (newPublishYear) metaParts.push(`سنة الإصدار: ${newPublishYear}`);
      if (newPages) metaParts.push(`عدد الصفحات: ${newPages} صفحة`);
      if (hasShipping && newFormat !== "digital") {
        const shipCost = Number(newShippingPrice) > 0 ? `${newShippingPrice} ر.س` : "شحن مجاني";
        metaParts.push(`الشحن والتوصيل: متوفر (${shipCost} · ${newShippingDays})`);
      }
      if (metaParts.length > 0) {
        fullDescription += `\n\n📌 تفاصيل ومواصفات الكتاب:\n• ${metaParts.join("\n• ")}`;
      }

      const categoryToUse = newCategory === "NEW" ? (newCustomCategory.trim() || "عام") : newCategory;

      const newBookRecord = {
        title: newTitle.trim(),
        author: newAuthor.trim(),
        category: categoryToUse,
        format: newFormat,
        price_digital: newFormat !== "physical" && newPriceDigital ? Number(newPriceDigital) : null,
        price_physical: newFormat !== "digital" && newPricePhysical ? Number(newPricePhysical) : null,
        stock: newFormat !== "digital" ? (Number(newStock) || 0) : 0,
        pages: newPages ? Number(newPages) : null,
        cover_url: finalCoverUrl || null,
        file_path: filePath,
        description: fullDescription,
        status: "approved" as const,
        featured: false,
      };

      let inserted: any = null;

      // 4. Primary insert: Run via server function with Service Role (bypasses RLS)
      try {
        const srvRes = await adminCreateBookServerFn({ data: newBookRecord });
        if (srvRes && srvRes.success && srvRes.book) {
          inserted = srvRes.book;
        } else if (srvRes && !srvRes.success) {
          console.warn("ServerFn returned failure:", srvRes.error);
        }
      } catch (srvErr) {
        console.warn("ServerFn invocation error:", srvErr);
      }

      // 5. Fallback: Direct client insert if server function is unreachable
      if (!inserted) {
        const { data: clientInserted, error: insertError } = await supabase
          .from("books")
          .insert(newBookRecord)
          .select()
          .single();

        if (insertError) {
          if (insertError.message?.includes("row-level security")) {
            throw new Error(
              "تم رفض الإضافة بسبب سياسة حماية قاعدة البيانات (RLS). يُرجى التأكد من تسجيل دخول الأدمن أو توفر صلاحيات السيرفر."
            );
          }
          throw insertError;
        }
        inserted = clientInserted;
      }

      // Save category if new
      if (newCategory === "NEW" && newCustomCategory.trim()) {
        const updated = addAdminCategory(newCustomCategory.trim());
        setCategories(updated);
      }

      // Save discount if enabled
      if (hasDiscount && inserted?.id) {
        const pct = Number(newDiscountPercent) || 20;
        setBookDiscount({
          bookId: inserted.id,
          discountPercent: pct,
          badgeText: newDiscountBadge.trim() || `خصم ${pct}%`,
          originalPriceDigital: inserted.price_digital ? Number(inserted.price_digital) : undefined,
          originalPricePhysical: inserted.price_physical ? Number(inserted.price_physical) : undefined,
        });
      }

      // Rich, elegant Arabic Toast Notification
      toast.success(`تم نشر كتاب "${newTitle}" بنجاح في متجر unibook! ✨`, {
        description: `أصبح الكتاب متاحاً للشراء المباشر للجميع (${newFormat === "both" ? "رقمي وورقي" : newFormat === "digital" ? "رقمي فقط" : "ورقي فقط"}).`,
        duration: 5000,
      });

      resetAddBookForm();
      setIsAddBookOpen(false);
      refetchBooks();
      qc.invalidateQueries();
    } catch (err: any) {
      console.error("Book creation error:", err);
      toast.error("تعذر إضافة ونشر الكتاب في المتجر", {
        description: err?.message || "حدث خطأ غير متوقع، يرجى إعادة المحاولة.",
        duration: 6000,
      });
    } finally {
      setIsSubmittingBook(false);
    }
  }

  // Search & Edit state for books
  const [bookSearch, setBookSearch] = useState("");
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [priceDigital, setPriceDigital] = useState("");
  const [pricePhysical, setPricePhysical] = useState("");
  const [stock, setStock] = useState("");
  const [busy, setBusy] = useState(false);

  // Discount state
  const [discountPercent, setDiscountPercent] = useState("20");
  const [discountBadge, setDiscountBadge] = useState("خصم 20%");

  // Categories state
  const [categories, setCategories] = useState<string[]>(() => getAdminCategories());
  const [newCatInput, setNewCatInput] = useState("");

  // Marquee announcement state
  const [marqueeText, setMarqueeState] = useState(() => getAdminMarqueeText());

  // Banners state
  const [banners, setBanners] = useState<SiteBanner[]>(() => getAdminBanners());

  // Fetch all books for management
  const { data: books = [], refetch: refetchBooks } = useQuery<Book[]>({
    queryKey: ["admin-manage-all-books"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Book[];
    },
  });

  const discountsMap = getAdminDiscounts();

  // 1. Book Pricing & Stock Update
  function openBookEditor(book: Book) {
    setEditingBook(book);
    setPriceDigital(String(book.price_digital ?? ""));
    setPricePhysical(String(book.price_physical ?? ""));
    setStock(String(book.stock ?? 0));
    const d = discountsMap[book.id];
    if (d) {
      setDiscountPercent(String(d.discountPercent));
      setDiscountBadge(d.badgeText || "عرض خاص");
    } else {
      setDiscountPercent("20");
      setDiscountBadge("خصم 20%");
    }
  }

  async function handleSaveBookPricing(e: React.FormEvent) {
    e.preventDefault();
    if (!editingBook) return;

    setBusy(true);
    const updates: Partial<Book> = {
      price_digital: priceDigital ? Number(priceDigital) : null,
      price_physical: pricePhysical ? Number(pricePhysical) : null,
      stock: Number(stock) || 0,
    };

    const { error } = await supabase.from("books").update(updates).eq("id", editingBook.id);
    setBusy(false);

    if (error) {
      toast.error(error.message || "تعذر حفظ التعديلات");
      return;
    }

    toast.success(`تم تحديث أسعار ومخزون كتاب (${editingBook.title}) بنجاح`);
    setEditingBook(null);
    refetchBooks();
    qc.invalidateQueries();
  }

  // 2. Delete Book
  async function handleDeleteBook(book: Book) {
    const confirmDelete = window.confirm(`هل أنت متأكد من حذف كتاب (${book.title}) نهائياً من المتجر؟`);
    if (!confirmDelete) return;

    setBusy(true);
    const { error } = await supabase.from("books").delete().eq("id", book.id);
    setBusy(false);

    if (error) {
      toast.error(error.message || "تعذر حذف الكتاب");
    } else {
      toast.success(`تم حذف كتاب (${book.title}) من المتجر بنجاح`);
      removeBookDiscount(book.id);
      refetchBooks();
      qc.invalidateQueries();
    }
  }

  // 3. Toggle Featured Status
  async function handleToggleFeatured(book: Book) {
    const nextVal = !book.featured;
    const { error } = await supabase.from("books").update({ featured: nextVal }).eq("id", book.id);
    if (error) {
      toast.error("تعذر تحديث تمييز الكتاب");
    } else {
      toast.success(nextVal ? "تم تمييز الكتاب في صدارة المتجر" : "تم إلغاء التمييز");
      refetchBooks();
      qc.invalidateQueries();
    }
  }

  // 4. Set / Remove Discount
  function handleApplyDiscount(book: Book) {
    const pct = Number(discountPercent) || 20;
    setBookDiscount({
      bookId: book.id,
      discountPercent: pct,
      badgeText: discountBadge || `خصم ${pct}%`,
      originalPriceDigital: book.price_digital ? Number(book.price_digital) : undefined,
      originalPricePhysical: book.price_physical ? Number(book.price_physical) : undefined,
    });
    toast.success(`تم تفعيل خصم (${pct}%) وعرض (${discountBadge}) لكتاب ${book.title}`);
    setEditingBook(null);
  }

  function handleCancelDiscount(bookId: string) {
    removeBookDiscount(bookId);
    toast.info("تم إلغاء العرض والخصم للكتاب");
    setEditingBook(null);
  }

  // 5. Categories Management
  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatInput.trim()) return;
    const updated = addAdminCategory(newCatInput);
    setCategories(updated);
    setNewCatInput("");
    toast.success(`تمت إضافة قسم (${newCatInput.trim()}) إلى أقسام المتجر`);
  }

  function handleRemoveCategory(cat: string) {
    const confirmRemove = window.confirm(`هل ترغب بحذف قسم (${cat})؟`);
    if (!confirmRemove) return;
    const updated = removeAdminCategory(cat);
    setCategories(updated);
    toast.info(`تم حذف قسم (${cat})`);
  }

  // 6. Save Announcements & Banners
  function handleSaveMarquee() {
    setAdminMarqueeText(marqueeText);
    toast.success("تم تحديث وحفظ شريط الإعلانات الترويجي في الموقع والتطبيق بنجاح");
  }

  function handleSaveBanners() {
    setAdminBanners(banners);
    toast.success("تم تحديث البنرات الترويجية للموقع والتطبيق بنجاح");
  }

  const filteredBooks = books.filter((b) => {
    const q = bookSearch.toLowerCase().trim();
    if (!q) return true;
    return b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.category.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-10" dir="rtl">
      {/* SECTION 1: Books & Pricing Full Control */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <h3 className="font-display text-xl font-bold text-foreground">
                التحكم بالكتب والأسعار والعروض والتخفيضات
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              إضافة كتب جديدة للمتجر بالكامل، تعديل أسعار النسخ، عمل عروض وخصومات، أو حذف الكتب بنقرة واحدة.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              type="button"
              onClick={() => {
                resetAddBookForm();
                setIsAddBookOpen(true);
              }}
              className="h-10 rounded-xl text-xs sm:text-sm font-extrabold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md cursor-pointer shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>إضافة كتاب جديد للمتجر</span>
            </Button>

            <div className="relative w-full sm:w-64">
              <Search className="absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
                placeholder="ابحث بالعنوان أو الكاتب أو القسم..."
                className="ps-9 h-10 rounded-xl text-xs bg-background/50"
              />
            </div>
          </div>
        </div>

        {/* Books List Table */}
        <div className="overflow-x-auto rounded-2xl border border-border/70">
          <table className="w-full text-start text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground font-bold text-[11px] sm:text-xs">
                <th className="py-3 px-4 text-start">الكتاب والمؤلف</th>
                <th className="py-3 px-4 text-start">القسم</th>
                <th className="py-3 px-4 text-start">سعر الرقمي</th>
                <th className="py-3 px-4 text-start">سعر الورقي والمخزون</th>
                <th className="py-3 px-4 text-start">العرض النشط</th>
                <th className="py-3 px-4 text-center">التحكم السريع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredBooks.slice(0, 50).map((b) => {
                const discount = discountsMap[b.id];

                return (
                  <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        {b.cover_url ? (
                          <img src={b.cover_url} alt="" className="h-12 w-9 rounded-md object-cover shadow-xs shrink-0" />
                        ) : (
                          <div className="h-12 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-foreground line-clamp-1">{b.title}</div>
                          <div className="text-[11px] text-muted-foreground">{b.author}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        {b.category}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-primary">
                      {b.price_digital ? formatMoney(b.price_digital) : "—"}
                    </td>

                    <td className="py-3 px-4 font-mono">
                      {b.price_physical ? (
                        <div>
                          <span className="font-bold text-foreground">{formatMoney(b.price_physical)}</span>
                          <span className="text-[10px] text-muted-foreground block font-sans">
                            متوفر: {b.stock}
                          </span>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {discount ? (
                        <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 text-[10px] font-bold">
                          {discount.badgeText || `خصم ${discount.discountPercent}%`}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground/50 text-xs">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-xl text-xs gap-1 cursor-pointer hover:border-primary"
                          onClick={() => openBookEditor(b)}
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>تعديل السعر والعرض</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-8 w-8 p-0 rounded-xl cursor-pointer ${
                            b.featured ? "text-amber-600 bg-amber-500/10" : "text-muted-foreground"
                          }`}
                          title="تمييز في صدارة المتجر"
                          onClick={() => handleToggleFeatured(b)}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                          title="حذف الكتاب"
                          onClick={() => handleDeleteBook(b)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: Categories Management */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <h3 className="font-display text-xl font-bold text-foreground">
                إدارة أقسام وتصنيفات المتجر
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              إضافة أقسام جديدة، وتعديل وتصنيف الكتب في الموقع والتطبيق تلقائياً.
            </p>
          </div>

          <Badge variant="outline" className="font-bold text-xs">
            {categories.length} قسم نشط
          </Badge>
        </div>

        {/* Add Category Form */}
        <form onSubmit={handleAddCategory} className="flex gap-2 max-w-md">
          <Input
            value={newCatInput}
            onChange={(e) => setNewCatInput(e.target.value)}
            placeholder="اكتب اسم القسم الجديد (مثال: كتب أطفال، علوم شرعية)..."
            className="h-10 rounded-xl text-xs sm:text-sm bg-background/50"
          />
          <Button type="submit" className="h-10 rounded-xl text-xs font-bold gap-1 px-4 cursor-pointer">
            <Plus className="h-4 w-4" /> إضافة قسم
          </Button>
        </form>

        {/* Categories Chips with delete */}
        <div className="flex flex-wrap gap-2 pt-2">
          {categories.map((cat) => (
            <div
              key={cat}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/80 bg-muted/40 text-xs font-bold text-foreground group"
            >
              <span>{cat}</span>
              <button
                type="button"
                aria-label="حذف القسم"
                onClick={() => handleRemoveCategory(cat)}
                className="text-muted-foreground hover:text-destructive p-0.5 rounded-full transition-colors cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: Announcements & Site Banners Control */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-border/60">
          <Megaphone className="h-5 w-5 text-primary" />
          <h3 className="font-display text-xl font-bold text-foreground">
            التحكم بإعلانات وبنرات الموقع والتطبيق
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-bold text-foreground mb-1 block">
              نص شريط الإعلانات الترويجي المتحرك (Marquee Bar):
            </Label>
            <div className="flex gap-2">
              <Input
                value={marqueeText}
                onChange={(e) => setMarqueeState(e.target.value)}
                placeholder="اكتب العبارات الترويجية الفاصلة بينها نقاط..."
                className="h-11 rounded-xl text-xs sm:text-sm bg-background/50 font-medium"
              />
              <Button type="button" onClick={handleSaveMarquee} className="h-11 rounded-xl text-xs font-bold gap-1 px-5 cursor-pointer">
                <Save className="h-4 w-4" /> حفظ الشريط
              </Button>
            </div>
          </div>

          <div className="pt-2">
            <Label className="text-xs font-bold text-foreground mb-1 block">
              البنر الترويجي الرئيسي في الصفحة الرئيسية:
            </Label>
            {banners.map((b, idx) => (
              <div key={b.id} className="p-4 rounded-2xl border border-border/70 bg-muted/20 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">عنوان البنر:</Label>
                    <Input
                      value={b.title}
                      onChange={(e) => {
                        const copy = [...banners];
                        copy[idx].title = e.target.value;
                        setBanners(copy);
                      }}
                      className="h-9 rounded-xl text-xs mt-0.5 bg-card"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">نص الشارة (Badge):</Label>
                    <Input
                      value={b.badge}
                      onChange={(e) => {
                        const copy = [...banners];
                        copy[idx].badge = e.target.value;
                        setBanners(copy);
                      }}
                      className="h-9 rounded-xl text-xs mt-0.5 bg-card"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[11px] text-muted-foreground">وصف العرض:</Label>
                  <Input
                    value={b.subtitle}
                    onChange={(e) => {
                      const copy = [...banners];
                      copy[idx].subtitle = e.target.value;
                      setBanners(copy);
                    }}
                    className="h-9 rounded-xl text-xs mt-0.5 bg-card"
                  />
                </div>

                <Button type="button" size="sm" onClick={handleSaveBanners} className="h-9 rounded-xl text-xs font-bold gap-1">
                  <Save className="h-3.5 w-3.5" /> حفظ البنر
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal: Add New Book to Store */}
      <Dialog open={isAddBookOpen} onOpenChange={setIsAddBookOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8" dir="rtl">
          <DialogHeader className="pb-3 border-b border-border/70">
            <DialogTitle className="font-display text-2xl font-extrabold flex items-center gap-2.5 text-foreground">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
              <span>إضافة كتاب جديد إلى متجر unibook</span>
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              أدخل كافة تفاصيل الكتاب والعنوان والأسعار والغلاف ومواصفات الشحن لنشره فوراً في المتجر والتطبيق.
            </p>
          </DialogHeader>

          <form onSubmit={handleCreateBook} className="space-y-6 pt-3 text-xs sm:text-sm">
            {/* 1. Basic Info: Title & Author */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                <FileText className="h-4 w-4" />
                <span>1. البيانات الأساسية للكتاب</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-foreground block mb-1">
                    عنوان الكتاب <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="مثال: رحلة إلى أسرار الكون..."
                    className="h-10 rounded-xl bg-background/60"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-foreground block mb-1">
                    اسم المؤلف <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    required
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    placeholder="اسم الكاتب أو المؤلف..."
                    className="h-10 rounded-xl bg-background/60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-bold text-foreground block mb-1">
                    تصنيف / قسم الكتاب
                  </Label>
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger className="h-10 rounded-xl bg-background/60">
                      <SelectValue placeholder="اختر القسم..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                      <SelectItem value="NEW">+ كتابة قسم جديد...</SelectItem>
                    </SelectContent>
                  </Select>

                  {newCategory === "NEW" && (
                    <Input
                      value={newCustomCategory}
                      onChange={(e) => setNewCustomCategory(e.target.value)}
                      placeholder="اكتب اسم القسم الجديد..."
                      className="h-9 rounded-xl mt-2 text-xs"
                      autoFocus
                    />
                  )}
                </div>

                <div>
                  <Label className="text-xs font-bold text-foreground block mb-1">
                    سنة الإصدار
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={newPublishYear}
                      onChange={(e) => setNewPublishYear(e.target.value)}
                      placeholder="مثلاً: 2026"
                      className="ps-9 h-10 rounded-xl bg-background/60 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold text-foreground block mb-1">
                    عدد الصفحات
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={newPages}
                    onChange={(e) => setNewPages(e.target.value)}
                    placeholder="مثلاً: 280"
                    className="h-10 rounded-xl bg-background/60 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 2. Format & Pricing */}
            <div className="space-y-4 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                  <DollarSign className="h-4 w-4" />
                  <span>2. صيغة الكتاب والتسعير</span>
                </h4>
                <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/15 font-bold text-[10px] gap-1 py-0.5 px-2">
                  <Sparkles className="h-3 w-3" />
                  عينة 10 صفحات مجاناً مفعلة
                </Badge>
              </div>

              {/* Free 10-Page Preview Feature Banner */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-primary/5 to-amber-500/10 border border-amber-500/25 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600 shrink-0">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-foreground block">
                      العينة المجانية (أول 10 صفحات) مفعلة تلقائياً
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      يتاح لأي قارئ في المتجر تصفح الفهرس والمقدمة ومحتويات الكتاب حتى الصفحة 10 مجاناً لتشجيعه على الشراء.
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-500/10 font-bold text-[10px] shrink-0">
                  متاح للجميع ✓
                </Badge>
              </div>

              <div>
                <Label className="text-xs font-bold text-foreground block mb-1.5">
                  نوع وصيغة التوفر في المتجر:
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewFormat("both")}
                    className={`h-11 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                      newFormat === "both"
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-muted/40 hover:bg-muted text-foreground border-border/80"
                    }`}
                  >
                    رقمي وورقي معاً
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewFormat("physical")}
                    className={`h-11 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                      newFormat === "physical"
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-muted/40 hover:bg-muted text-foreground border-border/80"
                    }`}
                  >
                    ورقي مطبوع فقط
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewFormat("digital")}
                    className={`h-11 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                      newFormat === "digital"
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-muted/40 hover:bg-muted text-foreground border-border/80"
                    }`}
                  >
                    نسخة رقمية فقط
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {newFormat !== "physical" && (
                  <div>
                    <Label className="text-xs font-bold text-foreground block mb-1">
                      سعر النسخة الرقمية (ر.س)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newPriceDigital}
                      onChange={(e) => setNewPriceDigital(e.target.value)}
                      placeholder="مثال: 35"
                      className="h-10 rounded-xl bg-background/60 font-mono font-bold"
                    />
                  </div>
                )}

                {newFormat !== "digital" && (
                  <>
                    <div>
                      <Label className="text-xs font-bold text-foreground block mb-1">
                        سعر النسخة الورقية (ر.س)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newPricePhysical}
                        onChange={(e) => setNewPricePhysical(e.target.value)}
                        placeholder="مثال: 75"
                        className="h-10 rounded-xl bg-background/60 font-mono font-bold"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-foreground block mb-1">
                        المخزون المتوفر (نسخة)
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={newStock}
                        onChange={(e) => setNewStock(e.target.value)}
                        placeholder="مثال: 50"
                        className="h-10 rounded-xl bg-background/60 font-mono"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 3. Shipping Details */}
            {newFormat !== "digital" && (
              <div className="space-y-3 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                    <Truck className="h-4 w-4" />
                    <span>3. الشحن والتوصيل للنسخة الورقية</span>
                  </h4>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">شحن متاح</span>
                    <Switch checked={hasShipping} onCheckedChange={setHasShipping} />
                  </div>
                </div>

                {hasShipping && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-2xl bg-muted/20 border border-border/70">
                    <div>
                      <Label className="text-xs font-bold text-foreground block mb-1">
                        سعر وتكلفة الشحن (ر.س):
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={newShippingPrice}
                        onChange={(e) => setNewShippingPrice(e.target.value)}
                        placeholder="0 يعني شحن مجاني..."
                        className="h-10 rounded-xl bg-card font-mono"
                      />
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">
                        اكتب 0 في حال كان الشحن مجانياً للعملاء
                      </span>
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-foreground block mb-1">
                        مدة التوصيل المتوقعة:
                      </Label>
                      <Input
                        value={newShippingDays}
                        onChange={(e) => setNewShippingDays(e.target.value)}
                        placeholder="مثال: 2 - 4 أيام عمل"
                        className="h-10 rounded-xl bg-card"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. Special Offers & Discounts */}
            <div className="space-y-3 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                  <Percent className="h-4 w-4" />
                  <span>4. العروض والخصومات الترويجية</span>
                </h4>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">تفعيل خصم</span>
                  <Switch checked={hasDiscount} onCheckedChange={setHasDiscount} />
                </div>
              </div>

              {hasDiscount && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                  <div>
                    <Label className="text-xs font-bold text-foreground block mb-1">
                      نسبة الخصم المئوية (%):
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      max="90"
                      value={newDiscountPercent}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewDiscountPercent(val);
                        setNewDiscountBadge(`خصم ${val}%`);
                      }}
                      placeholder="مثال: 20"
                      className="h-10 rounded-xl bg-card font-mono font-bold"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-foreground block mb-1">
                      نص الشارة الترويجية (Badge):
                    </Label>
                    <Input
                      value={newDiscountBadge}
                      onChange={(e) => setNewDiscountBadge(e.target.value)}
                      placeholder="مثال: خصم 20% أو عرض خاص"
                      className="h-10 rounded-xl bg-card font-bold text-amber-700 dark:text-amber-300"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 5. Book Cover & Digital PDF */}
            <div className="space-y-4 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                  <ImageIcon className="h-4 w-4" />
                  <span>5. صورة الغلاف والملف الرقمي</span>
                </h4>

                {/* Tabs switcher: File Upload vs Direct URL */}
                <div className="inline-flex items-center rounded-xl bg-muted/60 p-1 border border-border/70 text-xs">
                  <button
                    type="button"
                    onClick={() => setCoverInputMode("upload")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      coverInputMode === "upload"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    رفع صورة من جهازك
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoverInputMode("url")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      coverInputMode === "url"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    رابط صورة (URL)
                  </button>
                </div>
              </div>

              {coverInputMode === "upload" ? (
                <div>
                  {!newCoverFile && !newCoverPreview ? (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-border/80 hover:border-primary/80 rounded-2xl p-6 cursor-pointer bg-muted/15 hover:bg-muted/25 transition-all text-center group">
                      <div className="h-11 w-11 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center mb-2.5 text-primary transition-colors">
                        <Upload className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-bold text-foreground">
                        اضغط هنا لاختيار صورة غلاف الكتاب (PNG / JPG / WEBP)
                      </span>
                      <span className="text-[11px] text-muted-foreground mt-1">
                        الأبعاد المثالية بنسبة 2:3 لتظهر بكامل رونقها في واجهة المتجر
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setNewCoverFile(file);
                          if (file) {
                            setNewCoverPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                  ) : (
                    <div className="flex items-center justify-between p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {newCoverPreview && (
                          <img
                            src={newCoverPreview}
                            alt="معاينة الغلاف"
                            className="h-16 w-12 rounded-lg object-cover shadow-sm shrink-0 border border-border/80 bg-background"
                          />
                        )}
                        <div className="min-w-0 text-xs">
                          <p
                            className="font-bold text-foreground truncate max-w-[200px] sm:max-w-[360px]"
                            title={newCoverFile?.name || "صورة الغلاف"}
                            dir="ltr"
                          >
                            {newCoverFile ? newCoverFile.name : "صورة الغلاف المختارة"}
                          </p>
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            {newCoverFile
                              ? `${(newCoverFile.size / 1024).toFixed(0)} KB · تم تجهيز الغلاف بنجاح`
                              : "تم التحميل بنجاح"}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setNewCoverFile(null);
                          setNewCoverPreview(null);
                        }}
                        className="text-muted-foreground hover:text-destructive h-8 px-2.5 text-xs shrink-0 rounded-lg hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4 mr-1 text-destructive" />
                        إزالة
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-bold text-foreground block mb-1.5">
                      رابط صورة الغلاف مباشرة (Image URL):
                    </Label>
                    <Input
                      value={newCoverUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewCoverUrl(val);
                        if (val.startsWith("http")) {
                          setNewCoverPreview(val);
                        } else if (!val) {
                          setNewCoverPreview(null);
                        }
                      }}
                      placeholder="https://example.com/cover.jpg"
                      className="h-10 rounded-xl bg-background/60 text-xs font-mono"
                    />
                  </div>

                  {newCoverPreview && (
                    <div className="flex items-center gap-3 p-2.5 rounded-xl border border-border/80 bg-card">
                      <img
                        src={newCoverPreview}
                        alt="معاينة"
                        className="h-14 w-10 rounded-lg object-cover shadow-xs border shrink-0 bg-background"
                      />
                      <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" /> تم التعرف على رابط الصورة بنجاح
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Digital PDF file */}
              {newFormat !== "physical" && (
                <div className="pt-2 border-t border-border/40">
                  <Label className="text-xs font-bold text-foreground block mb-1.5">
                    ملف الكتاب الرقمي (PDF للقراءة المحمية داخل الموقع والتطبيق):
                  </Label>
                  {!newDigitalPdfFile ? (
                    <label className="flex items-center justify-between border border-dashed border-border/80 hover:border-primary/80 rounded-xl p-3 cursor-pointer bg-muted/15 hover:bg-muted/25 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <FileText className="h-5 w-5 text-primary shrink-0" />
                        <span className="text-xs font-semibold text-foreground">
                          اضغط لاختيار ملف الكتاب بصيغة PDF أو EPUB
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg shrink-0">
                        اختيار ملف
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.epub"
                        className="hidden"
                        onChange={(e) => setNewDigitalPdfFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  ) : (
                    <div className="flex items-center justify-between p-3 rounded-xl border border-primary/30 bg-primary/5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="h-5 w-5 text-primary shrink-0" />
                        <div className="min-w-0 text-xs">
                          <p
                            className="font-bold text-foreground truncate max-w-[220px] sm:max-w-[360px]"
                            title={newDigitalPdfFile.name}
                            dir="ltr"
                          >
                            {newDigitalPdfFile.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {(newDigitalPdfFile.size / (1024 * 1024)).toFixed(2)} MB · جاهز للتخزين المشفر
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setNewDigitalPdfFile(null)}
                        className="text-muted-foreground hover:text-destructive h-8 px-2 text-xs shrink-0 rounded-lg hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4 mr-1 text-destructive" />
                        إلغاء
                      </Button>
                    </div>
                  )}
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    يتم حفظ الملف في مساحة تخزين مشفرة مع حظر التحميل والطباعة لحماية حقوق الملكية الفكرية.
                  </span>
                </div>
              )}
            </div>

            {/* 6. Description */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <Label className="text-xs font-bold text-foreground block">
                نبذة ووصف الكتاب:
              </Label>
              <Textarea
                rows={3}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="اكتب نبذة تعريفية شيقة عن موضوع الكتاب ومحتواه..."
                className="rounded-2xl bg-background/60 text-xs sm:text-sm leading-relaxed"
              />
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/70">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl px-5 text-xs font-bold cursor-pointer"
                onClick={() => setIsAddBookOpen(false)}
                disabled={isSubmittingBook}
              >
                إلغاء
              </Button>

              <Button
                type="submit"
                disabled={isSubmittingBook}
                className="h-11 rounded-xl px-8 text-xs sm:text-sm font-extrabold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md cursor-pointer active:scale-[0.99]"
              >
                {isSubmittingBook ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري رفع ونشر الكتاب...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    حفظ ونشر الكتاب فوراً في المتجر
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Book Pricing & Discount Dialog */}
      <Dialog open={Boolean(editingBook)} onOpenChange={(open) => !open && setEditingBook(null)}>
        <DialogContent className="max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span>تعديل أسعار وعروض الكتاب</span>
            </DialogTitle>
          </DialogHeader>

          {editingBook && (
            <form onSubmit={handleSaveBookPricing} className="space-y-4 pt-2 text-xs sm:text-sm">
              <div className="p-3 rounded-2xl bg-muted/40 border border-border/70 flex items-center gap-3">
                {editingBook.cover_url && (
                  <img src={editingBook.cover_url} alt="" className="h-12 w-9 rounded-md object-cover shadow-xs" />
                )}
                <div>
                  <h4 className="font-bold text-sm text-foreground line-clamp-1">{editingBook.title}</h4>
                  <p className="text-[11px] text-muted-foreground">{editingBook.author}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-muted-foreground">سعر النسخة الرقمية (ر.س):</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={priceDigital}
                    onChange={(e) => setPriceDigital(e.target.value)}
                    placeholder="مثال: 35"
                    className="h-10 rounded-xl mt-1 text-sm font-mono font-bold"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-muted-foreground">سعر النسخة الورقية (ر.س):</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pricePhysical}
                    onChange={(e) => setPricePhysical(e.target.value)}
                    placeholder="مثال: 75"
                    className="h-10 rounded-xl mt-1 text-sm font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-muted-foreground">الكمية المتوفرة في المستودع (المخزون):</Label>
                <Input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="عدد النسخ المتاحة..."
                  className="h-10 rounded-xl mt-1 text-sm font-mono"
                />
              </div>

              {/* Discount Offer Box */}
              <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs">
                  <Percent className="h-4 w-4" />
                  <span>تفعيل عرض ترويجي أو خصم خاص</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">نسبة الخصم (%):</Label>
                    <Input
                      type="number"
                      min="1"
                      max="90"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                      className="h-9 rounded-xl text-xs font-mono font-bold bg-card"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">نص شارة العرض:</Label>
                    <Input
                      value={discountBadge}
                      onChange={(e) => setDiscountBadge(e.target.value)}
                      placeholder="خصم 20%..."
                      className="h-9 rounded-xl text-xs bg-card"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1 h-8 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                    onClick={() => handleApplyDiscount(editingBook)}
                  >
                    تطبيق الخصم
                  </Button>

                  {discountsMap[editingBook.id] && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-xl text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                      onClick={() => handleCancelDiscount(editingBook.id)}
                    >
                      إلغاء الخصم
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl h-10 px-4 text-xs"
                  onClick={() => setEditingBook(null)}
                >
                  إلغاء
                </Button>

                <Button
                  type="submit"
                  className="rounded-xl h-10 px-6 font-bold text-xs gap-1.5 shadow-sm cursor-pointer"
                  disabled={busy}
                >
                  <Save className="h-4 w-4" />
                  <span>حفظ التعديلات في المتجر</span>
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
