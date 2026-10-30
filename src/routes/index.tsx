import {useLocale} from "@/lib/locale";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Truck, PenLine, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BookCard, type Book } from "@/components/BookCard";

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
 const {t}=useLocale();
  const { data: books = [] } = useQuery({
    queryKey: ["books", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("status", "approved")
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data as Book[];
    },
  });

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="animate-rise">
            <span className="inline-block rounded-full border border-primary/30 bg-card px-4 py-1 text-xs text-primary">
              {t("دار عبيد للنشر والتوزيع والطباعة","Dar Obaid Publishing, Distribution & Printing")}
            </span>
            <h1 className="mt-6 text-5xl font-bold leading-[1.15] md:text-7xl">
              {t("unibook","unibook")}<br />
              <span className="text-primary">{t("عالم من الكتب","A world of books")}</span>
            </h1>
            <p className="mt-6 max-w-md text-lg text-muted-foreground">
              {t("كتب رقمية وورقية، ورحلة نشر تبدأ بمخطوطك وتصل إلى القرّاء.","Digital and printed books. A publishing journey from your manuscript to your readers.")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full px-8">
                <Link to="/books">
                  {t("تصفّح المتجر","Browse books")} <ArrowLeft className="ms-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-8">
                <Link to="/publisher">{t("مساحة المؤلف","Author studio")}</Link>
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

      {/* Featured */}
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

      {/* Publisher CTA */}
      <section className="mx-auto mt-20 max-w-7xl px-4">
        <div className="relative overflow-hidden rounded-3xl bg-ink p-10 text-ink-foreground md:p-16">
          <div className="absolute -start-20 -top-20 h-72 w-72 rounded-full bg-primary/40 blur-3xl" />
          <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
            <div>
              <PenLine className="h-10 w-10 text-gold" />
              <h2 className="mt-4 text-4xl font-bold">{t("لديك كتاب؟ انشره على unibook","Your book belongs on our shelves")}</h2>
              <p className="mt-3 max-w-xl opacity-75">
                {t("أرسل مخطوط Word، وتابع المراجعة والإنتاج والمبيعات في حساب المؤلف.","Submit a Word manuscript and follow review, production and sales in your author account.")}
              </p>
            </div>
            <Button asChild size="lg" className="rounded-full bg-gold px-8 text-ink hover:bg-gold/90">
              <Link to="/publisher">{t("ابدأ النشر الآن","Start your publishing journey")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
