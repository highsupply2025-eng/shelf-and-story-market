import { useLocale } from "@/lib/locale";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth, isNetworkOrFetchError, metadataAccountType } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Loader2,
  BookOpen,
  PenLine,
  Building2,
  Mail,
  Lock,
  User,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Check,
  Globe2,
  LogIn,
} from "lucide-react";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "إنشاء حساب جديد — unibook" },
      { name: "description", content: "أنشئ حسابك كقارئ أو مؤلف أو دار نشر في منصة unibook العالمية للكتب." },
      { property: "og:title", content: "إنشاء حساب جديد — unibook" },
      { property: "og:description", content: "أنشئ حسابك كقارئ أو مؤلف أو دار نشر في منصة unibook العالمية للكتب." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { t, language, country } = useLocale();
  const [accountType, setAccountType] = useState<"reader" | "author" | "publisher">("reader");
  const [form, setForm] = useState({ name: "", publisherName: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const { session, refresh, isAdmin, accountType: activeRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      const resolved = metadataAccountType(session) || activeRole;
      if (isAdmin) {
        navigate({ to: "/admin" });
      } else if (resolved === "publisher") {
        navigate({ to: "/publisher" });
      } else if (resolved === "author") {
        navigate({ to: "/author" });
      } else {
        navigate({ to: "/account" });
      }
    }
  }, [session, isAdmin, activeRole, navigate]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    const displayName =
      accountType === "publisher"
        ? form.publisherName.trim() || form.name.trim() || "دار نشر unibook"
        : form.name.trim();

    const successMessages = {
      reader: t("تم إنشاء حسابك كقارئ بنجاح! أهلاً بك في مكتبتك.", "Reader account created successfully! Welcome to your library."),
      author: t("تم استلام طلب حساب المؤلف! حسابك الآن تحت المراجعة بانتظار موافقة الإدارة.", "Author account submitted for admin review!"),
      publisher: t("تم استلام طلب حساب دار النشر! حسابك الآن تحت المراجعة بانتظار موافقة الإدارة.", "Publisher account submitted for admin review!"),
    };

    const unavailable = () =>
      toast.error(
        t(
          "الخدمة غير متاحة مؤقتاً ولم يُنشأ الحساب، يرجى المحاولة بعد قليل.",
          "Service temporarily unavailable — the account was not created. Please try again shortly."
        )
      );

    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            display_name: displayName,
            account_type: accountType,
            publisher_name: form.publisherName.trim(),
            country,
          },
        },
      });

      if (error) {
        const msg = error.message?.toLowerCase() || "";
        if (isNetworkOrFetchError(error)) {
          unavailable();
        } else if (msg.includes("already registered") || msg.includes("already been registered")) {
          toast.error(
            t("هذا البريد مسجّل مسبقاً، سجّل الدخول بدلاً من ذلك.", "This email is already registered — please sign in.")
          );
        } else if (msg.includes("password")) {
          toast.error(t("كلمة المرور يجب أن تتكون من 6 خانات على الأقل.", "Password must be at least 6 characters."));
        } else {
          toast.error(error.message || t("تعذر إنشاء الحساب، يرجى المحاولة مرة أخرى.", "Could not create account."));
        }
      } else if (!data.session) {
        toast.success(successMessages[accountType]);
        toast.info(
          t(
            "أرسلنا رسالة تأكيد إلى بريدك الإلكتروني، افتحها ثم سجّل الدخول.",
            "We sent a confirmation email — open it, then sign in."
          )
        );
        navigate({ to: "/login" });
      } else {
        if (data.user) {
          const initialApprovalStatus = accountType === "reader" ? "approved" : "pending";
          if (accountType === "author" || accountType === "publisher") {
            await supabase.from("publishers").upsert(
              {
                id: data.user.id,
                store_name: displayName,
                email: form.email.trim().toLowerCase(),
                account_type: accountType,
                approval_status: initialApprovalStatus,
                bio:
                  accountType === "publisher"
                    ? "دار نشر ومؤسسة توزيع معتمدة في unibook"
                    : "مؤلف وباحث علمي في unibook",
              },
              { onConflict: "id", ignoreDuplicates: true }
            );
          } else {
            await supabase.from("profiles").upsert(
              {
                id: data.user.id,
                display_name: displayName,
              },
              { onConflict: "id", ignoreDuplicates: true }
            );
          }
          await supabase.from("account_approvals").upsert(
            {
              user_id: data.user.id,
              email: form.email.trim().toLowerCase(),
              display_name: displayName,
              account_type: accountType,
              status: initialApprovalStatus,
              approved_at: initialApprovalStatus === "approved" ? new Date().toISOString() : null,
            },
            { onConflict: "user_id", ignoreDuplicates: true }
          );
        }
        toast.success(successMessages[accountType]);
        await refresh();
      }
    } catch {
      unavailable();
    }
    setBusy(false);
  }

  async function handleGoogle() {
    setBusy(true);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) {
      toast.error(t("تعذر الدخول عبر Google", "Could not sign in with Google"));
      setBusy(false);
    }
  }

  const BackIcon = language === "ar" ? ArrowRight : ArrowLeft;

  const roleConfigs = {
    reader: {
      title: t("قارئ", "Reader"),
      badge: t("حساب قارئ", "Reader Account"),
      desc: t("شراء وقراءة الكتب الرقمية والمطبوعة، ومتابعة الطلبات ومكتبتك الخاصة.", "Buy & read books."),
      icon: BookOpen,
      perks: [
        t("قراءة فورية لآلاف الكتب والمراجع العلمية", "Instant reading of scientific references"),
        t("مكتبة رقمية شخصية محفوظة على السحابة", "Personal cloud library accessible anywhere"),
        t("تتبع شحنات الكتب الورقية المطبوعة", "Live tracking for printed deliveries"),
      ],
      color: "text-emerald-600 dark:text-emerald-400",
    },
    author: {
      title: t("مؤلف", "Author"),
      badge: t("حساب مؤلف وباحث", "Author Account"),
      desc: t("نشر المؤلفات والأبحاث، مراجعة وتدقيق المخطوطات، وأرباح مجزية حتى 70%.", "Publish books & research."),
      icon: PenLine,
      perks: [
        t("لوحة تحكم كاملة واستوديو نشر متطور", "Advanced author publishing studio"),
        t("6 باقات نشر مرنة وخدمات تدقيق وإخراج", "6 flexible packages & professional editing"),
        t("متابعة حية للمبيعات والأرباح والتحويلات", "Real-time earnings & bank transfer reports"),
      ],
      color: "text-amber-600 dark:text-amber-400",
    },
    publisher: {
      title: t("دار نشر", "Publisher"),
      badge: t("حساب دار نشر ومؤسسة", "Publisher Account"),
      desc: t("لدور النشر والمؤسسات العلمية: إدارة كتالوج الكتب، المبيعات والطباعة.", "For publishers."),
      icon: Building2,
      perks: [
        t("إدارة كتالوج غير محدود من العناوين والإصدارات", "Manage unlimited catalog and titles"),
        t("خدمات طباعة عند الطلب وتوزيع محلي ودولي", "Print-on-demand & global distribution"),
        t("تقارير مبيعات شاملة وفواتير رقمية معتمدة", "Comprehensive analytics & verified invoices"),
      ],
      color: "text-blue-600 dark:text-blue-400",
    },
  };

  const ActiveRole = roleConfigs[accountType];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-b from-background via-muted/20 to-background px-4 pt-6 pb-28 sm:pb-32 md:pt-10 md:pb-36 select-none" dir="rtl">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 -start-40 h-96 w-96 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-1/4 -end-40 h-96 w-96 rounded-full bg-amber-500/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-[520px] animate-rise rounded-3xl border border-border/80 bg-card/95 backdrop-blur-xl p-6 sm:p-9 shadow-2xl relative overflow-hidden ring-1 ring-border/40">
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
            <span>unibook Global</span>
          </div>
        </div>

        {/* Brand Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <Link to="/" className="group mb-3 flex items-center justify-center transition-transform active:scale-95">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/80 bg-card shadow-sm transition-all group-hover:border-primary/50 group-hover:shadow-md group-hover:scale-105">
              <img src="/logo-icon.png" alt="unibook" className="h-9 w-auto object-contain" />
            </div>
          </Link>

          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            {t("إنشاء حساب جديد", "Create an Account")}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            {t("اختر نوع حسابك للانضمام إلى منصة unibook العالمية", "Choose your account type to join unibook")}
          </p>
        </div>

        {/* Google OAuth Button */}
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="relative w-full h-12 rounded-2xl border-border/80 font-bold text-xs sm:text-sm shadow-xs hover:bg-muted/50 hover:border-primary/40 transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99]"
          onClick={handleGoogle}
          disabled={busy}
        >
          <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              fill="#EA4335"
            />
          </svg>
          <span>{t("التسجيل السريع باستخدام Google", "Continue with Google")}</span>
        </Button>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border/80" />
          <span className="font-bold text-[11px] px-1 text-muted-foreground/80">
            {t("أو التسجيل بالبريد الإلكتروني", "Or register with email")}
          </span>
          <div className="h-px flex-1 bg-border/80" />
        </div>

        {/* Form */}
        <form onSubmit={handleRegister} className="space-y-4">
          {/* 3 Interactive Account Roles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground">
                {t("اختر نوع الحساب في المنصة:", "Select Account Type:")}
              </Label>
              <span className={`text-[11px] font-extrabold ${ActiveRole.color}`}>
                {ActiveRole.badge}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(["reader", "author", "publisher"] as const).map((roleKey) => {
                const r = roleConfigs[roleKey];
                const Icon = r.icon;
                const isSelected = accountType === roleKey;

                return (
                  <button
                    key={roleKey}
                    type="button"
                    onClick={() => setAccountType(roleKey)}
                    className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all cursor-pointer text-center select-none ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-md ring-2 ring-primary/20 scale-[1.03]"
                        : "border-border/70 bg-card hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-1.5 end-1.5 grid h-4 w-4 place-items-center rounded-full bg-primary text-primary-foreground shadow-xs animate-in zoom-in-75">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </span>
                    )}

                    <span className={`grid h-8 w-8 place-items-center rounded-xl mb-1.5 transition-colors ${isSelected ? "bg-primary text-primary-foreground shadow-xs" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="text-xs font-extrabold leading-tight">{r.title}</span>
                    <span className="text-[10px] opacity-75 mt-0.5 leading-tight line-clamp-1">
                      {roleKey === "reader" ? "شراء وقراءة" : roleKey === "author" ? "نشر وباقات" : "كتالوج الدار"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Role Perks */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 space-y-2 text-start transition-all">
              <div className="flex items-center gap-2 text-xs font-extrabold text-foreground">
                <Sparkles className="h-4 w-4 text-primary fill-primary" />
                <span>{t("مميزات الحساب المختار:", "Selected Account Features:")}</span>
              </div>
              <ul className="space-y-1.5">
                {ActiveRole.perks.map((perk, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-[11px] text-muted-foreground leading-tight">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Publisher Name if publisher */}
            {accountType === "publisher" && (
              <div className="space-y-1.5 animate-in fade-in zoom-in-95 duration-200">
                <Label htmlFor="regPublisherName" className="text-xs font-bold text-foreground/90 flex items-center justify-between">
                  <span>{t("اسم دار النشر أو المؤسسة العلمية", "Publishing House / Press Name")}</span>
                  <span className="text-[10px] text-primary font-medium">يظهر على إصدارات الدار</span>
                </Label>
                <div className="relative">
                  <Building2 className="absolute start-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="regPublisherName"
                    type="text"
                    required
                    placeholder={t("مثال: دار عبيد للنشر والتوزيع", "e.g., Al-Obaid Publishing")}
                    value={form.publisherName}
                    onChange={(e) => setForm({ ...form, publisherName: e.target.value })}
                    className="h-12 rounded-2xl ps-10 pe-4 text-sm border-border/80 focus-visible:ring-primary/20 bg-background/50 focus:bg-background transition-all"
                  />
                </div>
              </div>
            )}

            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="regName" className="text-xs font-bold text-foreground/90">
                {accountType === "publisher"
                  ? t("اسم المسؤول / جهة الاتصال في الدار", "Manager / Contact Name")
                  : accountType === "author"
                  ? t("اسم المؤلف الكامل (كما يظهر على الكتب)", "Author Full Name")
                  : t("الاسم الكامل", "Full Name")}
              </Label>
              <div className="relative">
                <User className="absolute start-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="regName"
                  type="text"
                  required
                  placeholder={
                    accountType === "publisher"
                      ? t("اكتب اسم ممثل الدار", "Representative Name")
                      : t("اكتب اسمك الكامل", "Enter your full name")
                  }
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-12 rounded-2xl ps-10 pe-4 text-sm border-border/80 focus-visible:ring-primary/20 bg-background/50 focus:bg-background transition-all"
                />
              </div>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="regEmail" className="text-xs font-bold text-foreground/90">
              {accountType === "publisher"
                ? t("البريد الإلكتروني الرسمي لدار النشر", "Official Publisher Email")
                : t("البريد الإلكتروني", "Email address")}
            </Label>
            <div className="relative">
              <Mail className="absolute start-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="regEmail"
                type="email"
                required
                placeholder="name@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="h-12 rounded-2xl ps-10 pe-4 text-sm border-border/80 focus-visible:ring-primary/20 bg-background/50 focus:bg-background transition-all text-start"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="regPassword" className="text-xs font-bold text-foreground/90">
              {t("كلمة المرور (6 خانات على الأقل)", "Password (min 6 characters)")}
            </Label>
            <div className="relative">
              <Lock className="absolute start-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="regPassword"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="h-12 rounded-2xl ps-10 pe-11 text-sm border-border/80 focus-visible:ring-primary/20 bg-background/50 focus:bg-background transition-all text-start"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-3 end-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-1 rounded-md hover:bg-muted/60"
                tabIndex={-1}
                aria-label={showPassword ? t("إخفاء كلمة المرور", "Hide password") : t("إظهار كلمة المرور", "Show password")}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full h-12 rounded-2xl font-extrabold text-sm shadow-md hover:shadow-lg transition-transform active:scale-[0.99] cursor-pointer mt-4 gap-2"
            disabled={busy}
          >
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("جاري إنشاء الحساب الآمن...", "Creating account...")}
              </span>
            ) : accountType === "publisher" ? (
              <>
                <Building2 className="h-4.5 w-4.5" />
                <span>{t("إنشاء حساب دار نشر جديدة", "Create Publisher Account")}</span>
              </>
            ) : accountType === "author" ? (
              <>
                <PenLine className="h-4.5 w-4.5" />
                <span>{t("إنشاء حساب مؤلف وباحث جديد", "Create Author Account")}</span>
              </>
            ) : (
              <>
                <BookOpen className="h-4.5 w-4.5" />
                <span>{t("إنشاء حساب قارئ جديد", "Create Reader Account")}</span>
              </>
            )}
          </Button>
        </form>

        {/* Footer Navigation to Login */}
        <div className="mt-6 text-center pt-3 border-t border-border/50">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-1 text-xs text-muted-foreground">
            <span>{t("لديك حساب بالفعل في unibook؟", "Already have an account?")}</span>
            <Link
              to="/login"
              className="font-extrabold text-primary hover:underline hover:text-primary/80 transition-colors inline-flex items-center gap-1"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>{t("تسجيل الدخول الآن", "Sign In")}</span>
            </Link>
          </div>
        </div>

        {/* Security & Trust Footer */}
        <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-muted-foreground/75 text-center">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>{t("اتصال آمن ومشفّر بأعلى معايير الحماية 256-bit SSL", "Secure 256-bit SSL encrypted connection")}</span>
        </div>
      </div>
    </div>
  );
}
