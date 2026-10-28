import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Minus, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart, formatPrice } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "سلة المشتريات — رفوف" },
      { name: "description", content: "راجع الكتب في سلتك وأكمل طلبك." },
      { property: "og:title", content: "سلة المشتريات — رفوف" },
      { property: "og:description", content: "راجع الكتب في سلتك وأكمل طلبك." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const cart = useCart();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [ship, setShip] = useState({ name: "", phone: "", address: "" });
  const [busy, setBusy] = useState(false);
  const hasPhysical = cart.items.some((i) => i.format === "physical");

  async function checkout() {
    if (!session) {
      navigate({ to: "/auth" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("place_order", {
      _items: cart.items.map((i) => ({ book_id: i.book_id, format: i.format, quantity: i.quantity })),
      _name: ship.name,
      _phone: ship.phone,
      _address: ship.address,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    cart.clear();
    toast.success("تم استلام طلبك بنجاح");
    navigate({ to: "/account" });
  }

  if (cart.items.length === 0)
    return (
      <div className="py-32 text-center">
        <h1 className="text-4xl font-bold">سلتك فارغة</h1>
        <Button asChild className="mt-6 rounded-full"><Link to="/books">تصفّح الكتب</Link></Button>
      </div>
    );

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1fr_380px]">
      <div>
        <h1 className="text-4xl font-bold">السلة</h1>
        <ul className="mt-8 divide-y divide-border">
          {cart.items.map((i) => (
            <li key={i.book_id + i.format} className="flex items-center gap-4 py-5">
              {i.cover_url && <img src={i.cover_url} alt="" className="h-24 w-16 rounded object-cover shadow-book" />}
              <div className="flex-1">
                <div className="font-display text-lg font-semibold">{i.title}</div>
                <div className="text-sm text-muted-foreground">{i.format === "digital" ? "نسخة رقمية" : "نسخة ورقية"}</div>
                <div className="font-semibold">{formatPrice(i.price)}</div>
              </div>
              {i.format === "physical" && (
                <div className="flex items-center gap-2">
                  <button className="rounded border p-1" onClick={() => cart.setQty(i.book_id, i.format, i.quantity - 1)}><Minus className="h-3 w-3" /></button>
                  <span className="w-6 text-center">{i.quantity}</span>
                  <button className="rounded border p-1" onClick={() => cart.setQty(i.book_id, i.format, i.quantity + 1)}><Plus className="h-3 w-3" /></button>
                </div>
              )}
              <button onClick={() => cart.remove(i.book_id, i.format)} aria-label="حذف" className="p-2 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <aside className="h-fit space-y-4 rounded-2xl border border-border bg-card p-6">
        {hasPhysical && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">بيانات الشحن</h2>
            <div><Label>الاسم</Label><Input value={ship.name} onChange={(e) => setShip({ ...ship, name: e.target.value })} /></div>
            <div><Label>الجوال</Label><Input value={ship.phone} onChange={(e) => setShip({ ...ship, phone: e.target.value })} /></div>
            <div><Label>العنوان</Label><Textarea value={ship.address} onChange={(e) => setShip({ ...ship, address: e.target.value })} /></div>
          </div>
        )}
        <div className="flex justify-between border-t pt-4 text-lg font-bold">
          <span>الإجمالي</span><span>{formatPrice(cart.total)}</span>
        </div>
        <p className="text-xs text-muted-foreground">الدفع الإلكتروني سيُضاف قريباً — يُسجَّل طلبك الآن ويُتابع من حسابك.</p>
        <Button className="w-full rounded-full" size="lg" disabled={busy} onClick={checkout}>
          {session ? "تأكيد الطلب" : "سجّل الدخول لإتمام الطلب"}
        </Button>
      </aside>
    </div>
  );
}
