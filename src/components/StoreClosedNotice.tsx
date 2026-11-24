import { Link } from "@tanstack/react-router";
import { Store, PenLine, Home, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/locale";

export function StoreClosedNotice({ mode = "store" }: { mode?: "store" | "reader" }) {
  const { t, language } = useLocale();
  const isReader = mode === "reader";

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="rounded-3xl border bg-card p-8 md:p-12 shadow-sm space-y-5">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600">
          {isReader ? <Clock className="h-8 w-8" /> : <Store className="h-8 w-8" />}
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 px-3 py-1 text-xs font-bold border border-amber-500/30">
          {t("تحديث وتجهيز المتجر", "Store Preparation in Progress")}
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {isReader
            ? t("تسجيل ودخول حسابات القراء متوقف مؤقتاً", "Reader Accounts Temporarily Paused")
            : t("المتجر مغلق مؤقتاً لحين تجهيزه", "The Store is Temporarily Closed for Preparation")}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto">
          {isReader
            ? t(
                "تم إيقاف تسجيل ودخول حسابات القراء مؤقتاً لحين الانتهاء من تجهيز الكتب والمتجر. بوابات المؤلفين ودور النشر تعمل بشكل طبيعي، ولكل دور بريد إلكتروني مستقل.",
                "Reader sign-up and sign-in are temporarily paused while the store is being prepared. Author and Publisher portals remain active with separate email accounts."
              )
            : t(
                "نعمل حالياً على تجهيز الكتب وإعداد المتجر بشكل نهائي. تسجيل المؤلفين ودور النشر ورفع المخطوطات متاح ويعمل بشكل طبيعي.",
                "We are currently preparing the store catalog. Author and Publisher registration and manuscript submission remain open."
              )}
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Button asChild className="rounded-xl font-bold">
            <Link to="/">
              <Home className="me-2 h-4 w-4" />
              {t("العودة للرئيسية", "Back to Home")}
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl font-bold">
            <Link to="/author">
              <PenLine className="me-2 h-4 w-4" />
              {t("بوابة المؤلف", "Author Portal")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
