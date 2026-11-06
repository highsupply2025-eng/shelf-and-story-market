import { useLocale } from "@/lib/locale";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { BookCard, type Book } from "@/components/BookCard";

export const Route = createFileRoute("/books/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "المتجر — unibook" },
      { name: "description", content: "تصفّح الكتب الرقمية والورقية حسب التصنيف والصيغة في متجر unibook العالمي." },
      { property: "og:title", content: "المتجر — unibook" },
      { property: "og:description", content: "تصفّح الكتب الرقمية والورقية حسب التصنيف والصيغة في متجر unibook العالمي." },
    ],
  }),
  component: BooksPage,
});

function BooksPage() {
  const { t } = useLocale();
  const [q, setQ] = useState("");
  const [format, setFormat] = useState<"all" | "digital" | "physical">("all");
  const [cat, setCat] = useState("الكل");

  const { data: books = [], isLoading } = useQuery({
    queryKey: ["books", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Book[];
    },
  });

  const cats = ["الكل", ...Array.from(new Set(books.map((b) => b.category)))];
  const filtered = books.filter((b) => {
    if (cat !== "الكل" && b.category !== cat) return false;
    if (format === "digital" && b.format === "physical") return false;
    if (format === "physical" && b.format === "digital") return false;
    const s = q.trim();
    return !s || b.title.includes(s) || b.author.includes(s);
  });

  const chip = (active: boolean) =>
    `rounded-full border px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer shrink-0 ${
      active ? "border-primary bg-primary text-primary-foreground shadow-xs" : "border-border bg-card hover:border-primary text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:py-12 pb-24 sm:pb-32 select-none" dir="rtl">
      <h1 className="animate-rise font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground">
        {t("المتجر", "Bookshop")}
      </h1>
      <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-muted-foreground">
        {books.length} {t("كتاب بانتظارك", "books to discover")}
      </p>

      {/* Search and Filters */}
      <div className="mt-6 sm:mt-8 flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center">
        <div className="relative md:w-80">
          <Search className="absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("ابحث بالعنوان أو المؤلف...", "Search title or author...")}
            className="ps-10 h-11 rounded-2xl text-xs sm:text-sm bg-card border-border/80"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {(["all", "digital", "physical"] as const).map((f) => (
            <button key={f} className={chip(format === f)} onClick={() => setFormat(f)}>
              {f === "all" ? t("كل الصيغ", "All formats") : f === "digital" ? t("رقمي", "Digital") : t("ورقي", "Print")}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 sm:mt-4 flex flex-wrap gap-2">
        {cats.map((c) => (
          <button key={c} className={chip(cat === c)} onClick={() => setCat(c)}>
            {c === "الكل" ? t("الكل", "All") : c}
          </button>
        ))}
      </div>

      {/* Responsive Books Grid (Phones, Tablets & Desktop) */}
      <div className="mt-8 sm:mt-12 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {filtered.map((b, i) => (
          <BookCard key={b.id} book={b} index={i} />
        ))}
      </div>

      {!isLoading && filtered.length === 0 && (
        <div className="py-20 text-center text-muted-foreground text-sm">
          {t("لا توجد كتب مطابقة لبحثك في المتجر حالياً.", "No matching books found.")}
        </div>
      )}
    </div>
  );
}
