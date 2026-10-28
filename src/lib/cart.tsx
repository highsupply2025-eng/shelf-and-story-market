import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = {
  book_id: string;
  format: "digital" | "physical";
  title: string;
  cover_url: string | null;
  price: number;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, "quantity">) => void;
  remove: (book_id: string, format: string) => void;
  setQty: (book_id: string, format: string, q: number) => void;
  clear: () => void;
  count: number;
  total: number;
};

const Ctx = createContext<CartState | null>(null);
const KEY = "rafraf-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem(KEY) || "[]"));
    } catch {
      /* ignore */
    }
  }, []);
  const save = (next: CartItem[]) => {
    setItems(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };
  const value: CartState = {
    items,
    add: (it) => {
      const ex = items.find((i) => i.book_id === it.book_id && i.format === it.format);
      if (ex) {
        if (it.format === "digital") return;
        save(items.map((i) => (i === ex ? { ...i, quantity: i.quantity + 1 } : i)));
      } else save([...items, { ...it, quantity: 1 }]);
    },
    remove: (id, f) => save(items.filter((i) => !(i.book_id === id && i.format === f))),
    setQty: (id, f, q) =>
      save(
        items.map((i) =>
          i.book_id === id && i.format === f ? { ...i, quantity: Math.max(1, Math.min(20, q)) } : i,
        ),
      ),
    clear: () => save([]),
    count: items.reduce((s, i) => s + i.quantity, 0),
    total: items.reduce((s, i) => s + i.price * i.quantity, 0),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("CartProvider missing");
  return c;
}

export const formatPrice = (n: number | null | undefined) =>
  n == null ? "—" : `${Number(n).toFixed(2).replace(/\.00$/, "")} ر.س`;
