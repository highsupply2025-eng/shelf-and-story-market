import { Link } from "@tanstack/react-router";
import { formatPrice } from "@/lib/cart";
import type { Tables } from "@/integrations/supabase/types";
import { useLocale } from "@/lib/locale";
import { getResolvedBookCover, getBookDiscount } from "@/lib/book-helpers";

export type Book = Tables<"books">;

export const formatLabel: Record<string, string> = {
  digital: "رقمي",
  physical: "ورقي",
  both: "رقمي وورقي",
};

export function BookCover({
  book,
  className = "",
}: {
  book: Pick<Book, "id" | "cover_url" | "title">;
  className?: string;
}) {
  const resolvedCover = getResolvedBookCover(book);

  return resolvedCover ? (
    <img
      src={resolvedCover}
      alt={book.title}
      loading="lazy"
      className={`aspect-[2/3] w-full rounded-md object-cover shadow-book ${className}`}
    />
  ) : (
    <div
      className={`grid aspect-[2/3] w-full place-items-center rounded-md bg-secondary p-4 text-center font-display text-lg shadow-book ${className}`}
    >
      {book.title}
    </div>
  );
}

export function BookCard({ book, index = 0 }: { book: Book; index?: number }) {
  const { t, price: money, currency } = useLocale();
  const rawPrice = Math.min(
    ...[book.price_digital, book.price_physical].filter((p): p is number => p != null).map(Number),
  );
  const discount = getBookDiscount(book);
  const finalPrice = discount.hasDiscount ? discount.apply(rawPrice) : rawPrice;

  return (
    <Link
      to="/books/$id"
      params={{ id: book.id }}
      className="group block animate-rise relative"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="book-hover relative">
        <BookCover book={book} />
        {discount.hasDiscount && (
          <span className="absolute top-2.5 end-2.5 bg-gradient-to-r from-rose-600 to-amber-600 text-white font-black text-[11px] px-2.5 py-1 rounded-xl shadow-lg z-10 animate-pulse">
            {discount.badgeText}
          </span>
        )}
      </div>

      <div className="mt-4 space-y-1">
        <span className="text-xs text-primary font-bold">
          {t(
            formatLabel[book.format] ?? book.format,
            book.format === "both" ? "Digital & print" : book.format === "digital" ? "Digital" : "Print",
          )}
        </span>
        <h3 className="line-clamp-1 font-display text-lg font-semibold group-hover:text-primary">
          {book.title}
        </h3>
        <p className="text-sm text-muted-foreground">{book.author}</p>

        {Number.isFinite(rawPrice) && (
          <div className="pt-0.5">
            {discount.hasDiscount && finalPrice != null ? (
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-extrabold text-foreground font-mono text-base text-rose-600 dark:text-rose-400">
                  {money(finalPrice)}
                </span>
                <span className="text-xs text-muted-foreground line-through font-mono">
                  {money(rawPrice)}
                </span>
              </div>
            ) : (
              <p className="font-semibold font-mono">
                {t("يبدأ من", "From")} {money(rawPrice)}
              </p>
            )}

            {/* Currency conversion reminder if not SAR */}
            {currency !== "SAR" && (
              <span className="text-[10px] text-muted-foreground block font-mono">
                (ما يعادل {finalPrice ?? rawPrice} ر.س)
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
