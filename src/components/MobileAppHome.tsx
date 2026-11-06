import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Search,
  Sparkles,
  BookOpen,
  TrendingUp,
  Clock,
  Zap,
  ChevronLeft,
  PenLine,
  Bookmark,
  Award,
  Layers,
  Compass,
} from "lucide-react";
import type { Book } from "@/components/BookCard";
import { BookCover, formatLabel } from "@/components/BookCard";
import { useLocale } from "@/lib/locale";
import { Button } from "@/components/ui/button";

interface MobileAppHomeProps {
  books: Book[];
  isLoading?: boolean;
}

const CATEGORY_TAGS = [
  { id: "all", label: "الكل", icon: "✨" },
  { id: "روايات", label: "روايات", icon: "📖" },
  { id: "تطوير الذات", label: "تطوير الذات", icon: "🌱" },
  { id: "علوم", label: "علوم", icon: "🔬" },
  { id: "تاريخ", label: "تاريخ", icon: "🏛️" },
  { id: "أعمال", label: "أعمال ومال", icon: "💼" },
  { id: "شعر", label: "شعر وأدب", icon: "✒️" },
];

export function MobileAppHome({ books, isLoading }: MobileAppHomeProps) {
  const { t, price: money } = useLocale();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");

  const featuredBooks = books.filter((b) => b.featured).slice(0, 8);
  const spotlightBook = featuredBooks[0] || books[0];
  const latestBooks = [...books].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 8);
  const digitalBooks = books.filter((b) => b.format === "digital" || b.format === "both").slice(0, 8);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate({ to: "/books", search: { q: searchQuery.trim() } as any });
    } else {
      navigate({ to: "/books" });
    }
  };

  const getLowestPrice = (b: Book) => {
    const p = Math.min(
      ...[b.price_digital, b.price_physical].filter((val): val is number => val != null).map(Number)
    );
    return Number.isFinite(p) ? p : null;
  };

  return (
    <div className="min-h-screen bg-background pb-12 select-none">
      {/* 1. App Top Search Bar & Category Chips */}
      <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-md px-4 pt-3 pb-2 border-b border-border/50">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("ابحث عن كتاب، مؤلف، أو موضوع...", "Search books, authors, or topics...")}
            className="w-full h-11 ps-10 pe-4 rounded-2xl bg-card border border-border/80 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-xs"
          />
        </form>

        {/* Scrollable category pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2.5 -mx-4 px-4 mt-1">
          {CATEGORY_TAGS.map((tag) => (
            <button
              key={tag.id}
              onClick={() => {
                setSelectedTag(tag.id);
                if (tag.id === "all") navigate({ to: "/books" });
                else navigate({ to: "/books", search: { category: tag.id } as any });
              }}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedTag === tag.id
                  ? "bg-primary text-primary-foreground shadow-xs scale-105"
                  : "bg-card border border-border/70 text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{tag.icon}</span>
              <span>{t(tag.label, tag.label)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6 pt-3">
        {/* 2. Spotlight Hero Card */}
        {spotlightBook && (
          <div className="px-4">
            <Link
              to="/books/$id"
              params={{ id: spotlightBook.id }}
              className="block group relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-card to-amber-500/10 border border-primary/25 p-4 shadow-sm active:scale-[0.99] transition-transform"
            >
              <div className="flex items-center gap-4">
                {/* 3D Book Cover */}
                <div className="w-24 shrink-0 transition-transform duration-300 group-hover:scale-105">
                  <BookCover
                    book={spotlightBook}
                    className="aspect-[2/3] rounded-xl shadow-[0_8px_20px_rgba(0,0,0,0.18)] object-cover"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary mb-1">
                    <Sparkles className="h-3.5 w-3.5 fill-primary" />
                    <span>{t("كتاب الأسبوع المميز", "Book of the Week")}</span>
                  </div>

                  <h3 className="font-display text-lg font-extrabold text-foreground leading-snug line-clamp-2">
                    {spotlightBook.title}
                  </h3>

                  <p className="text-xs text-muted-foreground font-medium mt-1 truncate">
                    {spotlightBook.author}
                  </p>

                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      {getLowestPrice(spotlightBook) != null && (
                        <span className="font-extrabold text-sm text-foreground">
                          {money(getLowestPrice(spotlightBook)!)}
                        </span>
                      )}
                    </div>

                    <span className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-xs group-hover:bg-primary/90 transition-colors">
                      {t("استكشف", "Explore")}
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* 3. Shelf #1: الأكثر قراءة ورواجاً 🔥 */}
        <section>
          <div className="flex items-center justify-between px-4 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-rose-500/10 text-rose-600 font-bold">
                🔥
              </span>
              <h2 className="font-display text-lg font-extrabold text-foreground">
                {t("الأكثر رواجاً وقراءة", "Trending Books")}
              </h2>
            </div>
            <Link to="/books" className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5">
              <span>{t("الكل", "All")}</span>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="flex gap-3.5 overflow-x-auto no-scrollbar px-4 pb-2 snap-x">
            {(featuredBooks.length > 0 ? featuredBooks : books.slice(0, 6)).map((book) => {
              const lowest = getLowestPrice(book);
              return (
                <Link
                  key={book.id}
                  to="/books/$id"
                  params={{ id: book.id }}
                  className="snap-start shrink-0 w-32 group flex flex-col active:scale-95 transition-transform"
                >
                  <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-[0_6px_16px_rgba(0,0,0,0.12)] border border-border/50 bg-muted">
                    <BookCover book={book} className="h-full w-full object-cover" />
                    <span className="absolute top-1.5 start-1.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-background/90 text-foreground backdrop-blur-xs shadow-xs">
                      {formatLabel[book.format] || book.format}
                    </span>
                  </div>
                  <h4 className="mt-2 text-xs font-extrabold text-foreground line-clamp-1 group-hover:text-primary">
                    {book.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground truncate">{book.author}</p>
                  {lowest != null && (
                    <p className="text-xs font-bold text-primary mt-0.5">{money(lowest)}</p>
                  )}
                </Link>
              );
            })}
          </div>
        </section>

        {/* 4. Shelf #2: أحدث الإصدارات 🆕 */}
        <section>
          <div className="flex items-center justify-between px-4 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-500/10 text-blue-600 font-bold">
                🆕
              </span>
              <h2 className="font-display text-lg font-extrabold text-foreground">
                {t("أحدث الإصدارات الحصرية", "New Releases")}
              </h2>
            </div>
            <Link to="/books" className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5">
              <span>{t("الكل", "All")}</span>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="flex gap-3.5 overflow-x-auto no-scrollbar px-4 pb-2 snap-x">
            {latestBooks.map((book) => {
              const lowest = getLowestPrice(book);
              return (
                <Link
                  key={book.id}
                  to="/books/$id"
                  params={{ id: book.id }}
                  className="snap-start shrink-0 w-32 group flex flex-col active:scale-95 transition-transform"
                >
                  <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-[0_6px_16px_rgba(0,0,0,0.12)] border border-border/50 bg-muted">
                    <BookCover book={book} className="h-full w-full object-cover" />
                  </div>
                  <h4 className="mt-2 text-xs font-extrabold text-foreground line-clamp-1 group-hover:text-primary">
                    {book.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground truncate">{book.author}</p>
                  {lowest != null && (
                    <p className="text-xs font-bold text-primary mt-0.5">{money(lowest)}</p>
                  )}
                </Link>
              );
            })}
          </div>
        </section>

        {/* 5. Shelf #3: كتب رقمية للتحميل الفوري ⚡ */}
        {digitalBooks.length > 0 && (
          <section>
            <div className="flex items-center justify-between px-4 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 font-bold">
                  ⚡
                </span>
                <h2 className="font-display text-lg font-extrabold text-foreground">
                  {t("كتب رقمية للقراءة الفورية", "Instant Digital Books")}
                </h2>
              </div>
              <Link to="/books" className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5">
                <span>{t("الكل", "All")}</span>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="flex gap-3.5 overflow-x-auto no-scrollbar px-4 pb-2 snap-x">
              {digitalBooks.map((book) => {
                const lowest = getLowestPrice(book);
                return (
                  <Link
                    key={book.id}
                    to="/books/$id"
                    params={{ id: book.id }}
                    className="snap-start shrink-0 w-32 group flex flex-col active:scale-95 transition-transform"
                  >
                    <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-[0_6px_16px_rgba(0,0,0,0.12)] border border-border/50 bg-muted">
                      <BookCover book={book} className="h-full w-full object-cover" />
                      <span className="absolute bottom-1.5 start-1.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-500 text-white shadow-xs">
                        {t("قراءة فورية", "Digital")}
                      </span>
                    </div>
                    <h4 className="mt-2 text-xs font-extrabold text-foreground line-clamp-1 group-hover:text-primary">
                      {book.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground truncate">{book.author}</p>
                    {lowest != null && (
                      <p className="text-xs font-bold text-emerald-600 mt-0.5">{money(lowest)}</p>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* 6. Quick Categories Cards Grid */}
        <section className="px-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500/10 text-amber-600 font-bold">
                📚
              </span>
              <h2 className="font-display text-lg font-extrabold text-foreground">
                {t("تصفّح حسب التصنيف", "Browse Categories")}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              { name: "روايات وأدب", icon: "📖", bg: "from-amber-500/10 to-orange-500/5", color: "text-amber-700" },
              { name: "تطوير الذات", icon: "🌱", bg: "from-emerald-500/10 to-teal-500/5", color: "text-emerald-700" },
              { name: "علوم وتكنولوجيا", icon: "🔬", bg: "from-blue-500/10 to-indigo-500/5", color: "text-blue-700" },
              { name: "مال وأعمال", icon: "💼", bg: "from-purple-500/10 to-pink-500/5", color: "text-purple-700" },
            ].map((cat) => (
              <Link
                key={cat.name}
                to="/books"
                className={`p-3 rounded-2xl border border-border/80 bg-gradient-to-br ${cat.bg} flex items-center gap-2.5 active:scale-95 transition-transform shadow-xs`}
              >
                <span className="text-xl">{cat.icon}</span>
                <span className="text-xs font-extrabold text-foreground truncate">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* 7. Author Studio In-App Card */}
        <section className="px-4">
          <div className="relative overflow-hidden rounded-3xl bg-card border border-primary/30 p-5 shadow-xs">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full mb-1.5">
                  <PenLine className="h-3 w-3" />
                  {t("استوديو المؤلفين ودور النشر", "Author & Publisher Studio")}
                </span>
                <h3 className="font-display text-base font-extrabold text-foreground leading-snug">
                  {t("لديك كتاب؟ انشره ووصل إلى آلاف القرّاء", "Have a manuscript? Publish with unibook")}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("مراجعة، نشر ورقي ورقمي، ومتابعة فورية للمبيعات والأرباح.", "Review, digital & print distribution, and real-time royalty tracking.")}
                </p>
              </div>
            </div>

            <Button asChild size="sm" className="mt-3.5 w-full rounded-xl font-bold shadow-xs">
              <Link to="/author">
                {t("ابدأ النشر الآن", "Start Publishing")}
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
