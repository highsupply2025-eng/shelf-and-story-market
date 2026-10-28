import {useLocale} from "@/lib/locale";
import {useAuth} from "@/lib/auth";
import {Heart} from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { BookOpen, Package, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BookCover, formatLabel, type Book } from "@/components/BookCard";
import { useCart, formatPrice } from "@/lib/cart";

export const Route = createFileRoute("/books/$id")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "تفاصيل الكتاب — رفوف" },
      { name: "description", content: "تفاصيل الكتاب وأسعار النسخ الرقمية والورقية على رفوف." },
      { property: "og:title", content: "تفاصيل الكتاب — رفوف" },
      { property: "og:description", content: "تفاصيل الكتاب وأسعار النسخ الرقمية والورقية." },
    ],
  }),
  component: BookPage,
});

function BookPage() {
  const { id } = Route.useParams();
  const cart = useCart();
  const {t,price:money}=useLocale();const {session}=useAuth();
  const { data: book, isLoading } = useQuery({
    queryKey: ["book", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select("*, publishers(store_name)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as (Book & { publishers: { store_name: string } | null }) | null;
    },
  });
  const [fmt, setFmt] = useState<"digital" | "physical" | null>(null);

  if (isLoading) return <div className="py-32 text-center text-muted-foreground">جارٍ التحميل…</div>;
  if (!book)
    return (
      <div className="py-32 text-center">
        <p>الكتاب غير موجود.</p>
        <Link to="/books" className="text-primary">العودة للمتجر</Link>
      </div>
    );

  const options = [
    book.format !== "physical" && book.price_digital != null && {
      key: "digital" as const, label: t("نسخة رقمية","Digital edition"), icon: FileText, price: Number(book.price_digital), note: t("ملف رقمي","Digital file"),
    },
    book.format !== "digital" && book.price_physical != null && {
      key: "physical" as const, label: t("نسخة ورقية","Print edition"), icon: Package, price: Number(book.price_physical),
      note: book.stock > 0 ? `متوفر: ${book.stock}` : t("نفدت الكمية","Out of stock"),
    },
  ].filter(Boolean) as { key: "digital" | "physical"; label: string; icon: typeof FileText; price: number; note: string }[];
  const selected = fmt ?? options[0]?.key;
  const opt = options.find((o) => o.key === selected);
  const outOfStock = selected === "physical" && book.stock <= 0;

  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 md:grid-cols-[360px_1fr]">
      <div className="animate-rise">
        <div className="book-hover"><BookCover book={book} /></div>
      </div>
      <div className="animate-rise" style={{ animationDelay: "120ms" }}>
        <span className="text-sm text-primary">{book.category} · {formatLabel[book.format]}</span>
        <h1 className="mt-2 text-5xl font-bold">{book.title}</h1>
        <p className="mt-2 text-lg text-muted-foreground">تأليف {book.author}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          الناشر: {book.publishers?.store_name ?? "رفوف"}
          {book.pages ? ` · ${book.pages} صفحة` : ""}
        </p>
        <p className="mt-8 leading-loose">{book.description}</p>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {options.map((o) => (
            <button
              key={o.key}
              onClick={() => setFmt(o.key)}
              className={`rounded-xl border-2 p-5 text-start transition-all ${
                selected === o.key ? "border-primary bg-accent/40" : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <o.icon className="h-5 w-5 text-primary" />
              <div className="mt-2 font-semibold">{o.label}</div>
              <div className="text-2xl font-bold">{money(o.price)}</div>
              <div className="text-xs text-muted-foreground">{o.note}</div>
            </button>
          ))}
        </div>
        <Button
          size="lg"
          className="mt-6 w-full rounded-full sm:w-auto sm:px-12"
          disabled={!opt || outOfStock}
          onClick={() => {
            if (!opt) return;
            cart.add({ book_id: book.id, format: opt.key, title: book.title, cover_url: book.cover_url, price: opt.price });
            toast.success("أُضيف الكتاب إلى السلة");
          }}
        >
          <BookOpen className="me-2 h-4 w-4" /> {t("أضف إلى السلة","Add to cart")}
        </Button>
        <Button variant="outline" className="mt-4 ms-3" onClick={async()=>{if(!session){toast.info(t("سجّل الدخول لحفظ المفضلة","Sign in to save favorites"));return;}const {error}=await supabase.from("reader_favorites").upsert({user_id:session.user.id,book_id:book.id},{onConflict:"user_id,book_id",ignoreDuplicates:true});if(error)toast.error(t("تعذر الحفظ","Could not save"));else toast.success(t("أُضيف إلى المفضلة","Saved to favorites"));}}><Heart className="me-2 h-4 w-4"/>{t("المفضلة","Favorite")}</Button>
      </div>
    </div>
  );
}
