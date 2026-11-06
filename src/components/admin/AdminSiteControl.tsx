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
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <h3 className="font-display text-xl font-bold text-foreground">
                التحكم بالكتب والأسعار والعروض والتخفيضات
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              تعديل أسعار النسخ الرقمية والورقية فورياً، عمل عروض وخصومات، أو حذف الكتب بنقرة واحدة.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={bookSearch}
              onChange={(e) => setBookSearch(e.target.value)}
              placeholder="ابحث بالعنوان أو الكاتب أو القسم..."
              className="ps-9 h-10 rounded-xl text-xs bg-background/50"
            />
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
