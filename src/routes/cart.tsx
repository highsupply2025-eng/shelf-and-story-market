import { useLocale } from "@/lib/locale";
import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Trash2,
  Minus,
  Plus,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Truck,
  Sparkles,
  ShieldCheck,
  BookOpen,
  CreditCard,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
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
      { title: "سلة المشتريات — unibook" },
      { name: "description", content: "راجع الكتب في سلتك وأكمل طلبك بسهولة وأمان على منصة unibook." },
      { property: "og:title", content: "سلة المشتريات — unibook" },
      { property: "og:description", content: "راجع الكتب في سلتك وأكمل طلبك بسهولة وأمان." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const cart = useCart();
  const { t, price: formatPrice, language } = useLocale();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [ship, setShip] = useState({ name: "", phone: "", address: "" });
  const [busy, setBusy] = useState(false);

  const BackIcon = language === "ar" ? ArrowRight : ArrowLeft;

  useEffect(() => {
    if (!session) return;
    supabase
      .from("profiles")
      .select("shipping_name,shipping_phone,shipping_address")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setShip({
            name: data.shipping_name || "",
            phone: data.shipping_phone || "",
            address: data.shipping_address || "",
          });
        }
      });
  }, [session?.user.id]);

  const hasPhysical = cart.items.some((i) => i.format === "physical");
  const totalAmount = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  async function checkout() {
    if (!session) {
      toast.info(t("يرجى تسجيل الدخول أولاً لإتمام الطلب", "Please sign in to complete your order"));
      navigate({ to: "/login" });
      return;
    }

    if (hasPhysical && (!ship.name.trim() || !ship.phone.trim() || !ship.address.trim())) {
      toast.error(t("يرجى تعبئة كافة بيانات الشحن (الاسم، الجوال، العنوان)", "Please fill all shipping details"));
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

    if (error) {
      toast.error(error.message);
      return;
    }

    cart.clear();
    toast.success(t("تم استلام طلبك بنجاح! شكراً لاختيارك unibook", "Order placed successfully!"));
    navigate({ to: "/account" });
  }

  // World-Class Empty Cart Experience (Responsive on Mobile, Tablet & Desktop)
  if (cart.items.length === 0) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12 md:py-20 select-none" dir="rtl">
        {/* Ambient background glows */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-1/3 -start-32 h-80 w-80 rounded-full bg-primary/10 blur-[100px]" />
          <div className="absolute bottom-1/3 -end-32 h-80 w-80 rounded-full bg-amber-500/10 blur-[100px]" />
        </div>

        <div className="w-full max-w-lg mx-auto text-center animate-rise">
          {/* Glowing Shopping Bag Card */}
          <div className="relative mx-auto mb-6 flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-3xl bg-gradient-to-tr from-primary/15 via-primary/5 to-amber-500/10 border border-primary/20 shadow-lg">
            <ShoppingBag className="h-11 w-11 sm:h-13 sm:w-13 text-primary stroke-[1.8]" />
            <span className="absolute -top-1 -end-1 flex h-7 w-7 items-center justify-center rounded-full bg-card border border-border text-xs font-bold text-muted-foreground shadow-xs">
              0
            </span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
            {t("سلة مشترياتك فارغة", "Your Cart is Empty")}
          </h1>

          <p className="mt-3 text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
            {t(
              "لم تقم بإضافة أي كتب إلى سلتك بعد. استكشف آلاف الكتب الورقية والرقمية في متجر unibook واقتنِ ما يثري معرفتك.",
              "You have not added any books yet. Explore thousands of digital and print titles in unibook."
            )}
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xs sm:max-w-md mx-auto">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto rounded-2xl px-8 h-12 font-extrabold text-sm shadow-md hover:shadow-lg transition-transform active:scale-[0.99] gap-2"
            >
              <Link to="/books">
                <BookOpen className="h-4.5 w-4.5" />
                <span>{t("تصفّح متجر الكتب", "Browse Bookshop")}</span>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto rounded-2xl px-6 h-12 font-bold text-sm border-border/80 hover:bg-muted/50"
            >
              <Link to="/">
                <span>{t("العودة للرئيسية", "Back Home")}</span>
              </Link>
            </Button>
          </div>

          {/* Trust Highlights */}
          <div className="mt-12 pt-8 border-t border-border/60 grid grid-cols-3 gap-3 text-center">
            <div className="flex flex-col items-center">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 mb-1.5">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="text-[11px] font-bold text-foreground">كتب رقمية فورية</span>
              <span className="text-[9.5px] text-muted-foreground">قراءة بضغطة زر</span>
            </div>

            <div className="flex flex-col items-center">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-500/10 text-blue-600 mb-1.5">
                <Truck className="h-4 w-4" />
              </span>
              <span className="text-[11px] font-bold text-foreground">توصيل ورقي معتمد</span>
              <span className="text-[9.5px] text-muted-foreground">تغليف فاخر وشحن سريع</span>
            </div>

            <div className="flex flex-col items-center">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-amber-500/10 text-amber-600 mb-1.5">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span className="text-[11px] font-bold text-foreground">دفع آمن 100%</span>
              <span className="text-[9.5px] text-muted-foreground">حماية مشفرة SSL</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Cart Items View (Responsive for Mobile, Tablet & Desktop)
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-12 select-none" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border/60 mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground">
            {t("سلة المشتريات", "Shopping Cart")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {t(`لديك ${cart.items.length} عنصر في سلتك`, `You have ${cart.items.length} item(s) in your cart`)}
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => cart.clear()}
          className="text-xs font-bold text-destructive hover:bg-destructive/10 rounded-xl"
        >
          <Trash2 className="me-1.5 h-3.5 w-3.5" />
          <span>{t("تفريغ السلة", "Clear all")}</span>
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Items List */}
        <div className="space-y-4">
          {cart.items.map((i) => (
            <div
              key={i.book_id + i.format}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                {i.cover_url ? (
                  <img
                    src={i.cover_url}
                    alt={i.title}
                    className="h-20 w-14 sm:h-24 sm:w-16 rounded-xl object-cover shadow-sm shrink-0 border border-border/50"
                  />
                ) : (
                  <div className="h-20 w-14 sm:h-24 sm:w-16 rounded-xl bg-muted border border-border/50 flex items-center justify-center shrink-0">
                    <BookOpen className="h-6 w-6 text-muted-foreground/60" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <span
                    className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-md mb-1 ${
                      i.format === "digital"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                    }`}
                  >
                    {i.format === "digital" ? t("نسخة رقمية فورية", "Digital Edition") : t("نسخة مطبوعة ورقية", "Print Edition")}
                  </span>

                  <h3 className="font-display text-sm sm:text-base font-extrabold text-foreground line-clamp-2">
                    {i.title}
                  </h3>

                  <div className="mt-1 font-bold text-primary text-sm sm:text-base">
                    {formatPrice(i.price)}
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pt-2 sm:pt-0 border-t sm:border-0 border-border/50">
                {i.format === "physical" ? (
                  <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 p-1">
                    <button
                      type="button"
                      aria-label="إنقاص الكمية"
                      onClick={() => cart.setQty(i.book_id, i.format, i.quantity - 1)}
                      className="grid h-7 w-7 place-items-center rounded-lg bg-card text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer shadow-xs"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-7 text-center font-bold text-xs sm:text-sm font-mono">{i.quantity}</span>
                    <button
                      type="button"
                      aria-label="زيادة الكمية"
                      onClick={() => cart.setQty(i.book_id, i.format, i.quantity + 1)}
                      className="grid h-7 w-7 place-items-center rounded-lg bg-card text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer shadow-xs"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-muted-foreground px-2 py-1 rounded-lg bg-muted/50">
                    {t("ترخيص دائم", "Lifetime access")}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => cart.remove(i.book_id, i.format)}
                  aria-label={t("حذف من السلة", "Remove")}
                  className="grid h-8 w-8 place-items-center rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Continue Shopping link */}
          <div className="pt-2">
            <Link
              to="/books"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-primary hover:underline"
            >
              <BackIcon className="h-4 w-4" />
              <span>{t("إضافة المزيد من الكتب للسلة", "Add more books to cart")}</span>
            </Link>
          </div>
        </div>

        {/* Sidebar Summary & Checkout */}
        <aside className="space-y-5">
          {/* Shipping Details for physical books */}
          {hasPhysical && (
            <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Truck className="h-4.5 w-4.5 text-primary" />
                <h2 className="font-display text-base sm:text-lg font-bold text-foreground">
                  {t("بيانات الشحن والتوصيل", "Shipping Information")}
                </h2>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-bold text-muted-foreground">{t("اسم المستلم الكامل", "Recipient Name")}</Label>
                  <Input
                    value={ship.name}
                    onChange={(e) => setShip({ ...ship, name: e.target.value })}
                    placeholder={t("اكتب اسمك الثلاثي", "Full Name")}
                    className="h-10 rounded-xl mt-1 text-xs sm:text-sm bg-background/50"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-muted-foreground">{t("رقم الجوال (مع كود الدولة)", "Phone Number")}</Label>
                  <Input
                    value={ship.phone}
                    onChange={(e) => setShip({ ...ship, phone: e.target.value })}
                    placeholder="05XXXXXXXX / +966..."
                    className="h-10 rounded-xl mt-1 text-xs sm:text-sm bg-background/50"
                    dir="ltr"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-muted-foreground">{t("العنوان بالتفصيل (المدينة، الحي، الشارع)", "Detailed Address")}</Label>
                  <Textarea
                    value={ship.address}
                    onChange={(e) => setShip({ ...ship, address: e.target.value })}
                    placeholder={t("اكتب المدينة والحي والشارع ورقم المبنى", "City, District, Street...")}
                    className="rounded-xl mt-1 text-xs sm:text-sm min-h-20 bg-background/50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Order Summary Card */}
          <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-md space-y-4">
            <h2 className="font-display text-base sm:text-lg font-bold text-foreground pb-2 border-b border-border/50">
              {t("ملخص الطلب", "Order Summary")}
            </h2>

            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{t("مجموع الكتب", "Subtotal")}</span>
                <span className="font-bold text-foreground font-mono">{formatPrice(totalAmount)}</span>
              </div>

              <div className="flex justify-between text-muted-foreground">
                <span>{t("رسوم الشحن والتجهيز", "Shipping & Handling")}</span>
                <span className="font-bold text-emerald-600">
                  {hasPhysical ? t("يُحسب عند التأكيد", "Calculated") : t("مجاني (رقمي)", "Free")}
                </span>
              </div>

              <div className="pt-3 border-t border-border/60 flex justify-between text-sm sm:text-base font-extrabold text-foreground">
                <span>{t("الإجمالي التقريبي", "Total")}</span>
                <span className="font-mono text-primary text-lg sm:text-xl">{formatPrice(totalAmount)}</span>
              </div>
            </div>

            <Button
              type="button"
              size="lg"
              className="w-full h-12 rounded-2xl font-extrabold text-sm shadow-md hover:shadow-lg transition-transform active:scale-[0.99] gap-2 cursor-pointer mt-4"
              onClick={checkout}
              disabled={busy}
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t("جاري معالجة الطلب...", "Processing...")}</span>
                </>
              ) : session ? (
                <>
                  <CheckCircle2 className="h-4.5 w-4.5" />
                  <span>{t("تأكيد وإتمام الطلب الآن", "Complete Order")}</span>
                </>
              ) : (
                <>
                  <CreditCard className="h-4.5 w-4.5" />
                  <span>{t("تسجيل الدخول لإتمام الشراء", "Sign in to Checkout")}</span>
                </>
              )}
            </Button>

            <div className="flex items-center justify-center gap-2 pt-2 text-[10px] text-muted-foreground text-center">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>{t("معاملاتك مشفرة ومحمية بأعلى معايير الأمان 256-bit", "Secure 256-bit SSL encrypted")}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
