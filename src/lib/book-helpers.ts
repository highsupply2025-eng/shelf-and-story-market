import { SPRINGER_COVER_DATA_URL } from "./springer-cover";
import { getAdminDiscounts } from "./admin-store";
import type { Book } from "@/components/BookCard";

export interface BookDiscountInfo {
  hasDiscount: boolean;
  percent: number;
  badgeText: string;
  apply: (price: number | null | undefined) => number | null;
}

export function getResolvedBookCover(book: { id?: string; title?: string; cover_url?: string | null }): string | null {
  if (book.cover_url && book.cover_url.trim()) {
    return book.cover_url.trim();
  }
  // If the book is the newly added book (managment / Complex Abdominal Wall Surgery)
  if (
    book.id === "ee4b3d6d-774d-46c8-81ef-902e31934ac0" ||
    (book.title && book.title.toLowerCase().includes("manag"))
  ) {
    return SPRINGER_COVER_DATA_URL;
  }
  return null;
}

export function getBookDiscount(book: { id?: string; title?: string; description?: string | null }): BookDiscountInfo {
  const discounts = typeof window !== "undefined" ? getAdminDiscounts() : {};
  const stored = book.id ? discounts[book.id] : undefined;

  let percent = stored ? stored.discountPercent : 0;
  let badgeText = stored?.badgeText ?? "";

  // Check description metadata [DISCOUNT:20:خصم 20%] or default for newly added book
  if (!percent && book.description) {
    const match = book.description.match(/\[DISCOUNT:(\d+):?([^\]]*)\]/i);
    if (match) {
      percent = parseInt(match[1] ?? "0", 10) || 0;
      badgeText = match[2]?.trim() || `خصم ${percent}%`;
    }
  }

  // Active discount for managment / user's demo book
  if (!percent && (book.id === "ee4b3d6d-774d-46c8-81ef-902e31934ac0" || (book.title && book.title.toLowerCase().includes("manag")))) {
    percent = 20;
    badgeText = "خصم 20%";
  }

  const hasDiscount = percent > 0;
  if (hasDiscount && !badgeText) {
    badgeText = `خصم ${percent}%`;
  }

  return {
    hasDiscount,
    percent,
    badgeText,
    apply: (price: number | null | undefined) => {
      if (price == null || !hasDiscount) return price ?? null;
      return Math.round(price * (1 - percent / 100) * 100) / 100;
    },
  };
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const LOCAL_BOOKS_KEY = "unibook_local_books_v1";

export function getLocalBooks(): (Record<string, unknown> & { id: string })[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_BOOKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalBook(book: Record<string, unknown> & { id: string }): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalBooks().filter((b) => b.id !== book.id);
    existing.unshift(book);
    localStorage.setItem(LOCAL_BOOKS_KEY, JSON.stringify(existing));
  } catch (err) {
    console.warn("Failed to save local book:", err);
  }
}

export function mergeLocalBooks<T extends { id: string }>(remote: T[]): T[] {
  const locals = getLocalBooks();
  if (!locals.length) return remote;
  const remoteIds = new Set(remote.map((b) => b.id));
  const missing = locals.filter((b) => !remoteIds.has(b.id)) as T[];
  return [...missing, ...remote];
}
