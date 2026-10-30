import {useLocale} from "@/lib/locale";
import {useEffect} from "react";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "سلة المشتريات — obibook" },
      { name: "description", content: "راجع الكتب في سلتك وأكمل طلبك." },
      { property: "og:title", content: "سلة المشتريات — obibook" },
      { property: "og:description", content: "راجع الكتب في سلتك وأكمل طلبك." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const cart = useCart();
 const l=useLocale();const formatPrice=l.price;
  const { session } = useAuth();
  const navigate = useNavigate();
  const [ship, setShip] = useState({ name: "", phone: "", address: "" });
  const [busy, setBusy] = useState(false);
  useEffect(()=>{if(!session)return;supabase.from("profiles").select("shipping_name,shipping_phone,shipping_address").eq("id",session.user.id).maybeSingle().then(({data})=>{if(data)setShip({name:data.shipping_name,phone:data.shipping_phone,address:data.shipping_address});});},[session?.user.id]);
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
    if (error) return void toast.error(error.message);
    cart.clear();
    toast.success("تم استلام طلبك بنجاح");
    navigate({ to: "/account" });
  }

  if (cart.items.length === 0)
    return (
      <div className="py-32 text-center">
        <h1 className="text-4xl font-bold">{l.t("سلتك فارغة","Your cart is empty")}</h1>
        <Button asChild className="mt-6 rounded-full"><Link to="/books">{l.t("تصفّح الكتب","Browse books")}</Link></Button>
      </div>
    );

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1fr_380px]">
      <div>
        <h1 className="text-4xl font-bold">{l.t("السلة","Your cart")}</h1>
        <ul className="mt-8 divide-y divide-border">
          {cart.items.map((i) => (
            <li key={i.book_id + i.format} className="flex items-center gap-4 py-5">
              {i.cover_url && <img src={i.cover_url} alt="" className="h-24 w-16 rounded object-cover shadow-book" />}
              <div className="flex-1">
                <div className="font-display text-lg font-semibold">{i.title}</div>
                <div className="text-sm text-muted-foreground">{i.format === "digital" ? l.t("نسخة رقمية","Digital edition") : l.t("نسخة ورقية","Print edition")}</div>
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
            <h2 className="text-xl font-semibold">{l.t("بيانات الشحن","Shipping details")}</h2>
            <div><Label>{l.t("الاسم","Name")}</Label><Input value={ship.name} onChange={(e) => setShip({ ...ship, name: e.target.value })} /></div>
            <div><Label>{l.t("الجوال","Phone")}</Label><Input value={ship.phone} onChange={(e) => setShip({ ...ship, phone: e.target.value })} /></div>
            <div><Label>{l.t("العنوان","Address")}</Label><Textarea value={ship.address} onChange={(e) => setShip({ ...ship, address: e.target.value })} /></div>
          </div>
        )}
        <div className="flex justify-between border-t pt-4 text-lg font-bold">
          <span>{l.t("الإجمالي","Estimated total")}</span><span>{formatPrice(cart.total)}</span>
        </div>
        <p className="text-xs text-muted-foreground">{l.t("الدفع غير مفعّل لبلدك حالياً. هذا طلب غير مدفوع بعملة SAR؛ التحويل المعروض تقديري. الشحن على العميل وتُحدد تكلفته قبل الدفع.","Payments are not connected for your country. This is an unpaid SAR order; converted prices are estimates. Shipping is charged to the customer and must be quoted before payment.")}</p>
        <Button className="w-full rounded-full" size="lg" disabled={busy} onClick={checkout}>
          {session ? l.t("تسجيل طلب غير مدفوع","Record unpaid order") : l.t("سجّل الدخول لإتمام الطلب","Sign in to order")}
        </Button>
      </aside>
    </div>
  );
}
