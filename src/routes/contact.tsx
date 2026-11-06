import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Mail,
  Phone,
  MessageSquare,
  MapPin,
  Send,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Clock,
  ShieldCheck,
  Globe2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLocale } from "@/lib/locale";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "تواصل معنا — unibook" },
      { name: "description", content: "تواصل مباشرة مع فريق دار عبيد للنشر والتوزيع ومنصة unibook عبر الواتساب والبريد الإلكتروني." },
      { property: "og:title", content: "تواصل معنا — unibook" },
      { property: "og:description", content: "تواصل مباشرة مع فريق دار عبيد للنشر والتوزيع ومنصة unibook عبر الواتساب والبريد الإلكتروني." },
    ],
  }),
  component: ContactPage,
});

const WHATSAPP_NUMBER = "00966563057356";
const WHATSAPP_LINK = "https://wa.me/966563057356?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20unibook%D8%8C%20%D8%A3%D8%B1%D8%BA%D8%A8%20%D9%81%D9%8A%20%D8%A7%D9%84%D8%AA%D9%88%D8%A7%D8%B5%D9%84%20%D9%85%D8%B9%D9%83%D9%85.";
const OFFICIAL_EMAIL = "darobaid@unigates.online";

function ContactPage() {
  const { t, language } = useLocale();
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(OFFICIAL_EMAIL);
    setCopied(true);
    toast.success(t("تم نسخ البريد الإلكتروني بنجاح!", "Email copied!"));
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error(t("يرجى ملء جميع الحقول الإلزامية", "Please fill required fields"));
      return;
    }
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast.success(t("تم استلام رسالتك بنجاح! سيتواصل معك فريقنا خلال ساعات قليلة.", "Message sent successfully!"));
      setForm({ name: "", email: "", phone: "", message: "" });
    }, 700);
  };

  const BackIcon = language === "ar" ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-background via-muted/20 to-background px-4 pt-6 pb-28 sm:pb-32 md:pt-10 md:pb-36 select-none" dir="rtl">
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 -start-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute bottom-1/4 -end-40 h-96 w-96 rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-3xl animate-rise">
        {/* Top return */}
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-border/50">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors group"
          >
            <BackIcon className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span>{t("العودة للرئيسية", "Back to Home")}</span>
          </Link>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
            <Globe2 className="h-3.5 w-3.5 text-primary" />
            <span>unibook Direct Support</span>
          </div>
        </div>

        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full mb-3">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{t("مركز خدمة العملاء والدعم الفني المباشر", "Direct Customer Support")}</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            {t("تواصل معنا مباشرة", "Contact Us Directly")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            {t(
              "فريق دار عبيد للنشر والتوزيع والطباعة ومنصة unibook يسعد بخدمتكم والإجابة عن جميع استفساراتكم على مدار الساعة.",
              "Dar Obaid Publishing & Printing is at your service 24/7."
            )}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-5">
          {/* Direct Channels Column (2 cols) */}
          <div className="md:col-span-2 space-y-4">
            {/* WhatsApp Priority Card */}
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-5 rounded-3xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-emerald-500/5 shadow-md hover:border-emerald-500 hover:shadow-xl transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-3 mb-2.5">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500 text-white shadow-md group-hover:scale-105 transition-transform">
                  <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.158.572 4.186 1.572 5.942l-1.672 6.104 6.273-1.645c1.706.929 3.655 1.457 5.727 1.457 6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12z" />
                  </svg>
                </span>
                <div>
                  <span className="inline-block text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full mb-0.5">
                    محادثة واتساب فورية
                  </span>
                  <h3 className="font-display text-base font-extrabold text-foreground">
                    تحدث معنا عبر واتساب
                  </h3>
                </div>
              </div>
              <p className="text-xs text-muted-foreground font-medium mb-3">
                للرد الفوري على استفسارات نشر الكتب، الطباعة، وطلبات المتجر.
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-emerald-500/20">
                <span className="text-xs font-extrabold text-foreground font-mono" dir="ltr">
                  {WHATSAPP_NUMBER}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-600 group-hover:translate-x-[-2px] transition-transform">
                  <span>فتح المحادثة</span>
                  <BackIcon className="h-3.5 w-3.5" />
                </span>
              </div>
            </a>

            {/* Email Official Card */}
            <div className="p-5 rounded-3xl border border-border/80 bg-card/95 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                  <Mail className="h-5 w-5" />
                </span>
                <div>
                  <span className="block text-[11px] font-bold text-muted-foreground">
                    البريد الإلكتروني المعتمد
                  </span>
                  <span className="text-xs font-bold text-foreground font-mono" dir="ltr">
                    {OFFICIAL_EMAIL}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 h-9 rounded-xl text-xs gap-1.5 cursor-pointer"
                  onClick={handleCopyEmail}
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? t("تم النسخ", "Copied") : t("نسخ البريد", "Copy Email")}</span>
                </Button>

                <Button asChild size="sm" className="flex-1 h-9 rounded-xl text-xs shadow-xs">
                  <a href={`mailto:${OFFICIAL_EMAIL}`} target="_blank" rel="noopener noreferrer">
                    <span>{t("إرسال إيميل", "Send Email")}</span>
                  </a>
                </Button>
              </div>
            </div>

            {/* Publisher Info Card */}
            <div className="p-4 rounded-3xl border border-border/70 bg-muted/30 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                <span>دار عبيد للنشر والتوزيع والطباعة</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                خدمات النشر الورقي والرقمي، مراجعة وتدقيق الكتب والأبحاث العلمية، والطباعة والتوزيع في العالم العربي.
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold pt-1 border-t border-border/50">
                <Clock className="h-3 w-3 text-emerald-600" />
                <span>دعم واستقبال استفسارات على مدار 24 ساعة</span>
              </div>
            </div>
          </div>

          {/* Inquiry Form Column (3 cols) */}
          <div className="md:col-span-3">
            <div className="rounded-3xl border border-border/80 bg-card/95 backdrop-blur-xl p-6 sm:p-7 shadow-xl">
              <h2 className="font-display text-xl font-extrabold text-foreground mb-1">
                {t("أرسل رسالة أو استفساراً", "Send an Inquiry")}
              </h2>
              <p className="text-xs text-muted-foreground mb-5">
                {t("سنقوم بالرد عليك عبر البريد الإلكتروني أو الواتساب فور استلام رسالتك.", "We'll get back to you shortly.")}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cName" className="text-xs font-bold text-foreground/90">
                    {t("الاسم الكامل *", "Full Name *")}
                  </Label>
                  <Input
                    id="cName"
                    required
                    placeholder={t("اكتب اسمك الكريم", "Your name")}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="h-11 rounded-xl text-xs border-border/80"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cEmail" className="text-xs font-bold text-foreground/90">
                      {t("البريد الإلكتروني *", "Email Address *")}
                    </Label>
                    <Input
                      id="cEmail"
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="h-11 rounded-xl text-xs border-border/80 text-start"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cPhone" className="text-xs font-bold text-foreground/90">
                      {t("رقم الهاتف أو الواتساب", "Phone or WhatsApp")}
                    </Label>
                    <Input
                      id="cPhone"
                      type="tel"
                      placeholder="05XXXXXXXX"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="h-11 rounded-xl text-xs border-border/80 text-start"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cMessage" className="text-xs font-bold text-foreground/90">
                    {t("نص الرسالة أو تفاصيل الاستفسار *", "Message Details *")}
                  </Label>
                  <Textarea
                    id="cMessage"
                    required
                    rows={4}
                    placeholder={t("اكتب استفسارك عن نشر كتاب، شراء كتب، أو متابعة طلب...", "Write your inquiry...")}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="rounded-xl text-xs border-border/80 resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={sending}
                  className="w-full h-11 rounded-xl font-extrabold text-xs shadow-md gap-2 cursor-pointer mt-2"
                >
                  <Send className="h-4 w-4" />
                  <span>{sending ? t("جاري إرسال الرسالة...", "Sending...") : t("إرسال الرسالة الآن", "Send Message")}</span>
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
