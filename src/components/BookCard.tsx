import { Link } from "@tanstack/react-router";
import { formatPrice } from "@/lib/cart";
import type { Tables } from "@/integrations/supabase/types";

export type Book = Tables<"books">;

export const formatLabel: Record<string, string> = {
  digital: "رقمي",
  physical: "ورقي",
  both: "رقمي وورقي",
};

export function BookCover({ book, className = "" }: { book: Pick<Book, "cover_url" | "title">; className?: string }) {
  return book.cover_url ? (
    <img
      src={book.cover_url}
      alt={book.title}
      loading="lazy"
      className={`aspect-[2/3] w-full rounded-md object-cover shadow-book ${className}`}
    />
  ) : (
    <div className={`grid aspect-[2/3] w-full place-items-center rounded-md bg-secondary p-4 text-center font-display text-lg shadow-book ${className}`}>
      {book.title}
    </div>
  );
}

export function BookCard({ book, index = 0 }: { book: Book; index?: number }) {
  const price = Math.min(
    ...[book.price_digital, book.price_physical].filter((p): p is number => p != null).map(Number),
  );
  return (
    <Link
      to="/books/$id"
      params={{ id: book.id }}
      className="group block animate-rise"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="book-hover">
        <BookCover book={book} />
      </div>
      <div className="mt-4 space-y-1">
        <span className="text-xs text-primary">{formatLabel[book.format]}</span>
        <h3 className="line-clamp-1 font-display text-lg font-semibold group-hover:text-primary">
          {book.title}
        </h3>
        <p className="text-sm text-muted-foreground">{book.author}</p>
        <p className="font-semibold">
          {Number.isFinite(price) ? `يبدأ من ${formatPrice(price)}` : ""}
        </p>
      </div>
    </Link>
  );
}
