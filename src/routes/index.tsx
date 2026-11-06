import { useLocale } from "@/lib/locale";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Truck, PenLine, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BookCard, type Book } from "@/components/BookCard";
import { MobileAppHome } from "@/components/MobileAppHome";
import { useAppMode } from "@/lib/useAppMode";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "unibook — متجر الكتب الرقمية والورقية" },
      { name: "description", content: "اكتشف آلاف الكتب الرقمية والورقية، أو انشر كتابك ووصل إلى قرّاء جدد على unibook." },
      { property: "og:title", content: "unibook — متجر الكتب الرقمية والورقية" },
      { property: "og:description", content: "اشترِ الكتب الرقمية والورقية أو انشر كتابك على unibook." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const heroBooks = [
  { src: "/covers/1.jpg", cls: "right-[8%] top-[6%] w-40 md:w-52", r: "-6deg", d: "0s" },
  { src: "/covers/3.jpg", cls: "right-[42%] top-[0%] w-36 md:w-44", r: "4deg", d: "1.2s" },
  { src: "/covers/5.jpg", cls: "right-[24%] top-[38%] w-40 md:w-52", r: "8deg", d: "0.6s" },
  { src: "/covers/4.jpg", cls: "right-[60%] top-[42%] w-32 md:w-40", r: "-4deg", d: "1.8s" },
];

const categories = ["روايات", "تطوير الذات", "علوم", "شعر", "تاريخ", "أعمال"];

function Index() {
  const { t } = useLocale();
  const { isAppExperience } = useAppMode();

  const { data: books = [], isLoading } = useQuery({
    queryKey: ["books", "home-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("status", "approved")
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(24);
      if (error) throw error;
      return data as Book[];
    },
  });

  // If in Mobile App Mode or Mobile Viewport: render world-class native book app layout
  if (isAppExperience) {
    return <MobileAppHome books={books} isLoading={isLoading} />;
  }

  // Desktop Web View
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="animate-rise">
            <div className="mb-4 inline-flex flex-wrap items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t("تطبيقات Android و iOS ستتوفر قريباً · متاح حالياً تحميل ملف APK المباشر للأندرويد", "Android & iOS Apps Coming Soon · APK Available Now")}</span>
            </div>
            <span className="inline-block rounded-full border border-primary/30 bg-card px-4 py-1 text-xs text-primary">
              {t("دار عبيد للنشر والتوزيع والطباعة","Dar Obaid Publishing, Distribution & Printing")}
            </span>
            <h1 className="mt-6 text-5xl font-bold leading-[1.15] md:text-7xl">
              {t("unibook","unibook")}<br />
              <span className="text-primary">{t("عالم من الكتب","A world of books")}</span>
            </h1>
            <p className="mt-6 max-w-md text-lg text-muted-foreground">
              {t("كتب رقمية وورقية، ورحلة نشر تبدأ بمؤلفاتك وتصل إلى القرّاء","Digital and printed books. A publishing journey from your works to your readers.")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full px-8">
                <Link to="/books">
                  {t("تصفّح المتجر","Browse books")} <ArrowLeft className="ms-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-8">
                <Link to="/author">{t("نشر كتاب","Publish a book")}</Link>
              </Button>
            </div>
          </div>
          <div className="relative h-[420px] md:h-[520px]">
            {heroBooks.map((b) => (
              <img
                key={b.src}
                src={b.src}
                alt=""
                className={`absolute ${b.cls} animate-float rounded-md shadow-book`}
                style={{ ["--r" as string]: b.r, animationDelay: b.d }}
              />
            ))}
          </div>
        </div>
        {/* marquee */}
        <div className="overflow-hidden border-y border-border/60 bg-card/60 py-4">
          <div className="flex w-max animate-marquee gap-12 whitespace-nowrap font-display text-xl text-muted-foreground">
            {[...categories, ...categories, ...categories, ...categories].map((c, i) => (
              <span key={i} className="flex items-center gap-12">
                {c} <span className="text-gold">✦</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Books Grid */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="text-sm text-primary">{t("مختارات unibook","unibook selections")}</p>
            <h2 className="text-4xl font-bold">{t("كتب تستحق القراءة","Worth turning the page")}</h2>
          </div>
          <Link to="/books" className="text-sm text-primary hover:underline">
            {t("عرض الكل ←","View all →")}
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4">
          {books.map((b, i) => (
            <BookCard key={b.id} book={b} index={i} />
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Download, t: t("كتب رقمية", "Digital books"), d: t("مكتبتك الرقمية في حساب القارئ.", "Your digital library in your reader account.") },
            { icon: Truck, t: t("كتب ورقية", "Printed books"), d: t("تابع طلبات الكتب الورقية من حسابك.", "Track printed-book orders in your account.") },
            { icon: ShieldCheck, t: t("مراجعة قبل النشر", "Reviewed before publishing"), d: t("كل كتاب يُراجع من فريقنا قبل عرضه في المتجر.", "Every book is reviewed by our team before publication.") },
          ].map((f, i) => (
            <div
              key={f.t}
              className="animate-rise rounded-2xl border border-border bg-card p-8 transition-transform hover:-translate-y-1"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <f.icon className="h-8 w-8 text-primary" />
              <h3 className="mt-4 text-xl font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mobile Apps Showcase: Android & iOS Coming Soon + Direct APK Download */}
      <section className="mx-auto mt-20 max-w-7xl px-4">
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card/90 to-primary/5 p-8 md:p-14 shadow-lg ring-1 ring-border/40">
          <div className="absolute top-0 end-0 -mt-16 -me-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 start-0 -mb-16 -ms-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-4">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t("تطبيقات الهواتف الذكية قريباً · متاح حالياً ملف APK مباشر", "Mobile Apps Coming Soon · Direct APK Available Now")}</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
              {t("تطبيقات unibook قادمة قريباً على Android و iOS", "unibook Apps Coming Soon to Android & iOS")}
            </h2>
            <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
              {t(
                "نعمل حالياً على إطلاق التطبيقات الرسمية لمنصة unibook على متجري Google Play و App Store لتمنحك أسهل تجربة لقراءة وشراء آلاف الكتب الرقمية والمطبوعة أينما كنت. والمتوفر حالياً لأجهزة الأندرويد هو تحميل ملف APK المباشر للاستمتاع الفوري بكامل المزايا.",
                "Official unibook apps are coming soon to Google Play and the App Store. Currently available: direct APK file download for Android devices."
              )}
            </p>
          </div>

          {/* Cards Grid: Android + iOS */}
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            
            {/* 1. Android Card */}
            <div className="relative flex flex-col justify-between rounded-2xl border border-emerald-500/30 bg-card/80 p-6 md:p-8 backdrop-blur-sm transition-all hover:border-emerald-500/60 hover:shadow-md">
              <div>
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <svg className="h-7 w-7 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5898 8.4026 13.8567 8.082 12 8.082s-3.5898.3206-5.1368.8677L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">
                        {t("تطبيق Android", "Android App")}
                      </h3>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {t("Google Play قريباً", "Coming soon to Google Play")}
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    APK متاح الآن
                  </span>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(
                    "يمكنك تنزيل ملف التثبيت المباشر APK الآن على هاتفك الأندرويد أو التابلت وتثبيته فوراً للوصول إلى كافة الكتب والمكتبة.",
                    "Download the direct APK file now on your Android phone or tablet for instant access to your books."
                  )}
                </p>

                <div className="mt-4 space-y-2 text-xs font-medium text-foreground/80">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>{t("قراءة أوفلاين دون الحاجة لاتصال بالإنترنت", "Offline reading anywhere")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>{t("مزامنة فورية مع حسابك ومكتبتك", "Instant sync with your library")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>{t("متوافق مع جميع أجهزة أندرويد الحديثة والتابلت", "Compatible with modern Android devices")}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-border/50">
                <Button
                  asChild
                  size="lg"
                  className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-sm flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99]"
                >
                  <a href="/unibook-app.apk" download="unibook-v1.0.apk">
                    <Download className="h-5 w-5" />
                    <span>{t("تحميل ملف APK المباشر (v1.0)", "Download Direct APK (v1.0)")}</span>
                  </a>
                </Button>
                <div className="mt-2 text-center text-[11px] text-muted-foreground">
                  {t("حجم الملف: ~15 MB · تثبيت مباشر وسريع وآمن", "File size: ~15 MB · Fast & secure installation")}
                </div>
              </div>
            </div>

            {/* 2. iOS (Apple) Card */}
            <div className="relative flex flex-col justify-between rounded-2xl border border-sky-500/30 bg-card/80 p-6 md:p-8 backdrop-blur-sm transition-all hover:border-sky-500/60 hover:shadow-md">
              <div>
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-600 dark:text-sky-300">
                      <svg className="h-7 w-7 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.64 1.35-.56.65-1.05 1.71-.92 2.73 1.01.08 2.01-.48 2.63-1.23z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">
                        {t("تطبيق iOS (Apple)", "iOS App (Apple)")}
                      </h3>
                      <span className="text-xs font-semibold text-sky-600 dark:text-sky-300">
                        {t("قيد الإطلاق قريباً", "Launching soon")}
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full bg-sky-500/10 px-3 py-1 text-[11px] font-extrabold text-sky-600 dark:text-sky-300 border border-sky-500/20">
                    App Store قريباً
                  </span>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(
                    "يجري حالياً وضع اللمسات الأخيرة واعتماد تطبيق unibook لأجهزة iPhone و iPad في متجر App Store الرسمي ليتاح قريباً لجميع مستخدمي أبل.",
                    "The unibook iOS app is currently in final review for the Apple App Store and will be available soon."
                  )}
                </p>

                <div className="mt-4 space-y-2 text-xs font-medium text-foreground/80">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                    <span>{t("تجربة مخصصة لشاشات iPhone و iPad", "Tailored for iPhone and iPad")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                    <span>{t("دعم كامل للإشعارات ووضع القراءة الليلي", "Dark reading mode and notifications")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                    <span>{t("متوافق مع أحدث إصدارات iOS و iPadOS", "Compatible with latest iOS releases")}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-border/50">
                <Button
                  disabled
                  size="lg"
                  variant="outline"
                  className="w-full rounded-2xl border-sky-400/40 bg-sky-500/5 text-sky-600 dark:text-sky-300 font-extrabold shadow-xs flex items-center justify-center gap-2.5 cursor-not-allowed opacity-90"
                >
                  <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.64 1.35-.56.65-1.05 1.71-.92 2.73 1.01.08 2.01-.48 2.63-1.23z" />
                  </svg>
                  <span>{t("قريباً على App Store", "Coming Soon to App Store")}</span>
                </Button>
                <div className="mt-2 text-center text-[11px] text-muted-foreground">
                  {t("قيد الفحص والمراجعة الرسمية لدى Apple", "Under review with Apple App Store")}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Publisher CTA */}
      <section className="mx-auto mt-20 max-w-7xl px-4">
        <div className="relative overflow-hidden rounded-3xl bg-ink p-10 text-ink-foreground md:p-16">
          <div className="absolute -start-20 -top-20 h-72 w-72 rounded-full bg-primary/40 blur-3xl" />
          <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
            <div>
              <PenLine className="h-10 w-10 text-gold" />
              <h2 className="mt-4 text-4xl font-bold">{t("لديك كتاب؟ انشره على unibook","Your book belongs on our shelves")}</h2>
              <p className="mt-3 max-w-xl opacity-75">
                {t("ارسل ملف Word، وتابع المراجعة والإنتاج والمبيعات في حساب المؤلف.","Submit a Word file and follow review, production and sales in your author account.")}
              </p>
            </div>
            <Button asChild size="lg" className="rounded-full bg-gold px-8 text-ink hover:bg-gold/90">
              <Link to="/author">{t("ابدأ النشر الآن","Start your publishing journey")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
