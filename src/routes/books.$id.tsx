import { useLocale } from "@/lib/locale";
import { useAuth } from "@/lib/auth";
import { Heart, BookOpen, Package, FileText, ArrowRight, ArrowLeft, ShieldCheck, Truck, Sparkles, Tag } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BookCover, formatLabel, type Book } from "@/components/BookCard";
import { useCart } from "@/lib/cart";
import { ProtectedBookReader } from "@/components/ProtectedBookReader";
import { getBookDiscount, getLocalBooks } from "@/lib/book-helpers";

export const Route = createFileRoute("/books/$id")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "تفاصيل الكتاب — unibook" },
      { name: "description", content: "تفاصيل الكتاب وأسعار النسخ الرقمية والورقية على منصة unibook العالمية." },
      { property: "og:title", content: "تفاصيل الكتاب — unibook" },
      { property: "og:description", content: "تفاصيل الكتاب وأسعار النسخ الرقمية والورقية." },
    ],
  }),
  component: BookPage,
});

function BookPage() {
  const { id } = Route.useParams();
  const cart = useCart();
  const { t, price: money, language, currency } = useLocale();
  const { session } = useAuth();

  const BackIcon = language === "ar" ? ArrowRight : ArrowLeft;

  const { data: book, isLoading } = useQuery({
    queryKey: ["book", id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("books")
          .select("*, publishers(store_name)")
          .eq("id", id)
          .maybeSingle();
        if (data) {
          return data as (Book & { publishers: { store_name: string } | null }) | null;
        }
      } catch (err) {
        console.warn("Remote book fetch notice:", err);
      }
      // Local fallback
      const local = getLocalBooks().find((b) => b.id === id);
      return (local || null) as (Book & { publishers: { store_name: string } | null }) | null;
    },
  });

  const [fmt, setFmt] = useState<"digital" | "physical" | null>(null);
  const [isSampleReaderOpen, setIsSampleReaderOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center py-20 px-4 text-center select-none" dir="rtl">
        <div className="h-16 w-16 rounded-3xl bg-muted flex items-center justify-center mb-4">
          <BookOpen className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground">{t("الكتاب غير موجود", "Book not found")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("قد يكون تم نقله أو حذفه من المتجر.", "It may have been removed.")}</p>
        <Button asChild className="mt-6 rounded-2xl">
          <Link to="/books">{t("العودة لمتجر الكتب", "Back to bookshop")}</Link>
        </Button>
      </div>
    );
  }

  const discount = book ? getBookDiscount(book) : { hasDiscount: false, percent: 0, badgeText: "", apply: (p: number) => p };

  const options = [
    book.format !== "physical" && book.price_digital != null && {
      key: "digital" as const,
      label: t("نسخة رقمية فورية", "Digital edition"),
      icon: FileText,
      rawPrice: Number(book.price_digital),
      price: discount.hasDiscount ? Number(discount.apply(Number(book.price_digital))) : Number(book.price_digital),
      note: t("ملف رقمي عالي الدقة يتاح فوراً", "Instant digital file"),
    },
    book.format !== "digital" && book.price_physical != null && {
      key: "physical" as const,
      label: t("نسخة مطبوعة ورقية", "Print edition"),
      icon: Package,
      rawPrice: Number(book.price_physical),
      price: discount.hasDiscount ? Number(discount.apply(Number(book.price_physical))) : Number(book.price_physical),
      note: book.stock > 0 ? `${t("متوفر بالمستودع:", "In stock:")} ${book.stock}` : t("نفدت الكمية مؤقتاً", "Out of stock"),
    },
  ].filter(Boolean) as { key: "digital" | "physical"; label: string; icon: typeof FileText; rawPrice: number; price: number; note: string }[];

  const selected = fmt ?? options[0]?.key;
  const opt = options.find((o) => o.key === selected);
  const outOfStock = selected === "physical" && book.stock <= 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8 md:py-14 pb-24 sm:pb-32 select-none" dir="rtl">
      {/* Return button */}
      <div className="mb-6">
        <Link
          to="/books"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <BackIcon className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          <span>{t("العودة لمتجر الكتب", "Back to bookshop")}</span>
        </Link>
      </div>

      <div className="grid gap-8 sm:gap-10 md:gap-12 md:grid-cols-[300px_1fr] lg:grid-cols-[360px_1fr] items-start">
        {/* Book Cover (Responsive on mobile & tablet) */}
        <div className="animate-rise max-w-[240px] sm:max-w-[280px] md:max-w-none mx-auto md:mx-0 w-full">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-border/80 bg-card p-3 sm:p-4">
            <BookCover book={book} className="w-full aspect-[2/3] object-cover rounded-2xl shadow-book" />
          </div>

          {/* Free 10-Page Sample Banner Under Cover */}
          <button
            type="button"
            onClick={() => setIsSampleReaderOpen(true)}
            className="w-full mt-3.5 flex items-center justify-center gap-2 p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-primary/10 to-amber-500/15 hover:from-amber-500/25 hover:to-primary/20 border border-amber-500/35 text-amber-900 dark:text-amber-200 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-[0.99] group"
          >
            <BookOpen className="h-4 w-4 text-amber-600 transition-transform group-hover:scale-110" />
            <span>{t("قراءة عينة مجانية (أول 10 صفحات)", "Read Free Sample (First 10 Pages)")}</span>
          </button>

          {/* Quick Perks under cover on tablet/desktop */}
          <div className="mt-4 hidden md:flex flex-col gap-2 p-3.5 rounded-2xl bg-muted/40 border border-border/60 text-xs">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>{t("حقوق ملكية وطباعة أصلية معتمدة", "Verified Authentic Copyright")}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
              <Truck className="h-4 w-4 text-blue-600" />
              <span>{t("شحن وتوصيل لكافة مدن العالم العربي", "Global distribution & shipping")}</span>
            </div>
          </div>
        </div>

        {/* Book Information & Purchase Controls */}
        <div className="animate-rise flex-1 min-w-0" style={{ animationDelay: "100ms" }}>
          {discount.hasDiscount && (
            <div className="mb-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-rose-500/15 via-amber-500/15 to-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 font-extrabold text-xs shadow-xs">
              <Sparkles className="h-4 w-4 text-amber-500 animate-spin" />
              <span>{t(`🔥 عرض خاص: ${discount.badgeText} لفترة محدودة!`, `🔥 Special Offer: ${discount.badgeText} for a limited time!`)}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary">
              {book.category}
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
              {formatLabel[book.format] || book.format}
            </span>
            {discount.hasDiscount && (
              <span className="text-xs font-black px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                {discount.badgeText}
              </span>
            )}
          </div>

          <h1 className="font-display text-2xl sm:text-3xl md:text-5xl font-extrabold text-foreground leading-tight">
            {book.title}
          </h1>

          <p className="mt-2 text-sm sm:text-lg text-muted-foreground font-medium">
            {t("تأليف:", "By:")} <span className="text-foreground font-bold">{book.author}</span>
          </p>

          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            {t("الناشر:", "Publisher:")}{" "}
            <span className="text-foreground font-semibold">
              {book.publishers?.store_name ?? "دار عبيد للنشر والتوزيع"}
            </span>
            {book.pages ? ` · ${book.pages} ${t("صفحة", "pages")}` : ""}
          </p>

          <div className="mt-6 pt-4 border-t border-border/60">
            <h3 className="font-bold text-xs sm:text-sm text-muted-foreground mb-2">
              {t("نبذة عن الكتاب والمحتوى:", "Book Overview:")}
            </h3>
            <p className="text-xs sm:text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
              {book.description || t("لا يتوفر وصف مفصل لهذا الكتاب حالياً.", "No description available.")}
            </p>
          </div>

          {/* Formats Selection */}
          <div className="mt-8">
            <h3 className="font-bold text-xs sm:text-sm text-foreground mb-3">
              {t("اختر صيغة الكتاب المطلوبة:", "Select Format:")}
            </h3>

            <div className="grid gap-3 sm:grid-cols-2">
              {options.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setFmt(o.key)}
                  className={`rounded-2xl border-2 p-4 text-start transition-all cursor-pointer active:scale-[0.99] ${
                    selected === o.key
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/80 bg-card hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                      <o.icon className="h-4.5 w-4.5" />
                    </span>
                    <div className="text-end">
                      <div className="flex items-center gap-2 justify-end">
                        {discount.hasDiscount && (
                          <span className="text-xs text-muted-foreground line-through font-mono">
                            {money(o.rawPrice)}
                          </span>
                        )}
                        <span className={`text-xl font-extrabold font-mono ${discount.hasDiscount ? "text-rose-600 dark:text-rose-400" : "text-primary"}`}>
                          {money(o.price)}
                        </span>
                      </div>
                      {currency !== "SAR" && (
                        <span className="text-[11px] text-muted-foreground font-medium block mt-0.5">
                          ({o.price} ر.س)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="font-bold text-sm text-foreground">{o.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{o.note}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Free Sample (10 Pages) Preview CTA */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setIsSampleReaderOpen(true)}
              className="h-12 rounded-2xl font-extrabold text-xs sm:text-sm border-2 border-primary/50 text-primary hover:bg-primary/10 gap-2 cursor-pointer shadow-xs active:scale-[0.99] flex-1 sm:flex-initial sm:px-6"
            >
              <Sparkles className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
              <span>{t("تصفح الفهرس والمقدمة (10 صفحات مجاناً)", "Explore Index & Sample (10 Pages Free)")}</span>
            </Button>

            <Button
              size="lg"
              className="h-12 rounded-2xl font-extrabold text-sm shadow-md hover:shadow-lg transition-transform active:scale-[0.99] flex-1 sm:flex-initial sm:px-10 gap-2 cursor-pointer"
              disabled={!opt || outOfStock}
              onClick={() => {
                if (!opt) return;
                cart.add({
                  book_id: book.id,
                  format: opt.key,
                  title: book.title,
                  cover_url: book.cover_url,
                  price: opt.price,
                });
                toast.success(t("أُضيف الكتاب إلى سلة مشترياتك بنجاح", "Added to cart successfully"));
              }}
            >
              <BookOpen className="h-4.5 w-4.5" />
              <span>{outOfStock ? t("نفدت الكمية", "Out of stock") : t("أضف إلى السلة", "Add to Cart")}</span>
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="h-12 rounded-2xl font-bold text-sm border-border/80 hover:bg-muted/50 gap-2 cursor-pointer"
              onClick={async () => {
                if (!session) {
                  toast.info(t("سجّل الدخول لحفظ الكتاب في قائمتك المفضلة", "Sign in to save favorites"));
                  return;
                }
                const { error } = await supabase.from("reader_favorites").upsert(
                  { user_id: session.user.id, book_id: book.id },
                  { onConflict: "user_id,book_id", ignoreDuplicates: true }
                );
                if (error) toast.error(t("تعذر الحفظ في المفضلة", "Could not save"));
                else toast.success(t("أُضيف الكتاب إلى قائمة مفضلتك", "Saved to favorites"));
              }}
            >
              <Heart className="h-4.5 w-4.5 text-rose-500 fill-rose-500/20" />
              <span>{t("المفضلة", "Favorites")}</span>
            </Button>
          </div>
        </div>
      </div>
      {/* 10-Page Protected Free Sample Reader Modal */}
      {isSampleReaderOpen && (
        <ProtectedBookReader
          book={book}
          open={isSampleReaderOpen}
          isFreeSample={true}
          maxFreePages={10}
          onClose={() => setIsSampleReaderOpen(false)}
          onBuy={() => {
            setIsSampleReaderOpen(false);
            if (opt) {
              cart.add({
                book_id: book.id,
                format: opt.key,
                title: book.title,
                cover_url: book.cover_url,
                price: opt.price,
              });
              toast.success(t("أُضيف الكتاب إلى سلة مشترياتك بنجاح", "Added to cart successfully"));
            }
          }}
        />
      )}
    </div>
  );
}
