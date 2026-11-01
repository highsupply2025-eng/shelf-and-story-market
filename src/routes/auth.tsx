import { useLocale } from "@/lib/locale";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowRight, ArrowLeft, KeyRound, Loader2, BookOpen, PenLine } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "الدخول والتسجيل — unibook" },
      { name: "description", content: "سجّل دخولك أو أنشئ حساباً جديداً في unibook." },
      { property: "og:title", content: "الدخول والتسجيل — unibook" },
      { property: "og:description", content: "سجّل دخولك أو أنشئ حساباً جديداً في unibook." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t, language } = useLocale();
  const [mode, setMode] = useState<"in" | "up" | "reset">("up");
  const [accountType, setAccountType] = useState<"reader" | "author">("reader");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const { session, refresh } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) navigate({ to: "/account" });
  }, [session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      });
      if (error) {
        toast.error(t("البريد أو كلمة المرور غير صحيحة", "Invalid email or password"));
      } else {
        toast.success(t("تم تسجيل الدخول بنجاح!", "Logged in successfully!"));
      }
    } else if (mode === "up") {
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            display_name: form.name.trim(),
            account_type: accountType,
          },
        },
      });

      if (error) {
        toast.error(error.message);
      } else {
        // If author account selected and user created, provision publisher record
        if (accountType === "author" && data.user?.id) {
          await supabase.from("publishers").insert({
            id: data.user.id,
            store_name: form.name.trim() || "مؤلف unibook",
            bio: "",
          });
          await refresh();
        }

        toast.success(
          accountType === "author"
            ? t("تم إنشاء حساب المؤلف بنجاح! تحقق من بريدك الإلكتروني.", "Author account created! Check your email to verify.")
            : t("تم إنشاء الحساب بنجاح! تحقق من بريدك لتأكيده.", "Account created! Check your email to verify.")
        );
      }
    } else if (mode === "reset") {
      if (!form.email.trim()) {
        toast.error(t("يرجى إدخال البريد الإلكتروني", "Please enter your email"));
        setBusy(false);
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim(), {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) {
        toast.error(error.message || t("تعذر إرسال الرابط", "Failed to send reset link"));
      } else {
        toast.success(
          t(
            "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني بنجاح!",
            "Password reset link sent to your email successfully!"
          )
        );
        setMode("in");
      }
    }
    setBusy(false);
  }

  async function google() {
    setBusy(true);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) {
      toast.error(t("تعذر الدخول عبر Google", "Could not sign in with Google"));
      setBusy(false);
    }
  }

  const BackIcon = language === "ar" ? ArrowRight : ArrowLeft;

  return (
    <div className="flex min-h-[85vh] items-center justify-center bg-gradient-to-b from-background via-card/30 to-background px-4 py-12">
      <div className="w-full max-w-[440px] animate-rise rounded-3xl border border-border/80 bg-card p-6 sm:p-9 shadow-xl">
        {/* Brand Logo Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <Link to="/" className="group mb-4 flex items-center justify-center transition-transform active:scale-95">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/80 bg-card shadow-sm transition-all group-hover:border-primary/40 group-hover:shadow-md">
              <img src="/logo-icon.png" alt="unibook" className="h-10 w-auto object-contain" />
            </div>
          </Link>

          {mode === "reset" ? (
            <>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <KeyRound className="h-5 w-5" />
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {t("استعادة كلمة المرور", "Reset Password")}
              </h1>
              <p className="mt-1.5 text-xs md:text-sm text-muted-foreground max-w-xs">
                {t(
                  "أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور",
                  "Enter your email and we will send you a password reset link"
                )}
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {mode === "in" ? t("تسجيل الدخول", "Sign In") : t("إنشاء حساب جديد", "Create an Account")}
              </h1>
              <p className="mt-1.5 text-xs md:text-sm text-muted-foreground">
                {mode === "in"
                  ? t("أهلاً بك مجدداً في unibook", "Welcome back to unibook")
                  : t("انضم إلى منصة unibook للقراءة والنشر", "Join unibook for reading and publishing")}
              </p>

              {/* Segmented Mode Selector */}
              <div className="mt-6 flex w-full rounded-2xl bg-muted/70 p-1 border border-border/60">
                <button
                  type="button"
                  onClick={() => setMode("in")}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all cursor-pointer ${
                    mode === "in"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("تسجيل الدخول", "Sign In")}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("up")}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all cursor-pointer ${
                    mode === "up"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("حساب جديد", "New Account")}
                </button>
              </div>
            </>
          )}
        </div>

        {mode !== "reset" && (
          <>
            {/* Google OAuth Button */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="relative w-full h-12 rounded-xl border-border/80 font-bold shadow-xs hover:bg-muted/50 transition-all flex items-center justify-center gap-3 cursor-pointer"
              onClick={google}
              disabled={busy}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
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
              <span>{t("المتابعة باستخدام Google", "Continue with Google")}</span>
            </Button>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border/80" />
              <span className="font-semibold">{t("أو بالبريد الإلكتروني", "Or with email")}</span>
              <div className="h-px flex-1 bg-border/80" />
            </div>
          </>
        )}

        {/* Auth Form */}
        <form onSubmit={submit} className="space-y-4">
          {mode === "up" && (
            <>
              {/* Account Role Selector */}
              <div className="space-y-2">
                <Label className="text-xs md:text-sm font-semibold text-foreground/90">
                  {t("اختر نوع الحساب", "Account type")}
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAccountType("reader")}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all cursor-pointer text-center ${
                      accountType === "reader"
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs scale-[1.02]"
                        : "border-border/70 bg-card hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <BookOpen className="h-5 w-5 mb-1" />
                    <span className="text-sm font-bold">{t("حساب قارئ", "Reader")}</span>
                    <span className="text-[11px] opacity-75">{t("شراء وقراءة الكتب", "Buy & read books")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType("author")}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all cursor-pointer text-center ${
                      accountType === "author"
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs scale-[1.02]"
                        : "border-border/70 bg-card hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <PenLine className="h-5 w-5 mb-1" />
                    <span className="text-sm font-bold">{t("حساب مؤلف", "Author")}</span>
                    <span className="text-[11px] opacity-75">{t("نشر ومتابعة المبيعات", "Publish & track sales")}</span>
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs md:text-sm font-semibold text-foreground/90">
                  {t("الاسم الكامل", "Full name")}
                </Label>
                <Input
                  id="name"
                  type="text"
                  required
                  placeholder={t("اكتب اسمك الكامل", "Enter your full name")}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-12 rounded-xl px-4 text-base border-border/80 focus-visible:ring-primary/20 bg-background/50 focus:bg-background transition-all"
                />
              </div>
            </>
          )}

          {/* Email Address */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs md:text-sm font-semibold text-foreground/90">
              {t("البريد الإلكتروني", "Email address")}
            </Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="name@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="h-12 rounded-xl px-4 text-base border-border/80 focus-visible:ring-primary/20 bg-background/50 focus:bg-background transition-all text-start"
            />
          </div>

          {/* Password */}
          {mode !== "reset" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs md:text-sm font-semibold text-foreground/90">
                  {t("كلمة المرور", "Password")}
                </Label>
                {mode === "in" && (
                  <button
                    type="button"
                    onClick={() => setMode("reset")}
                    className="text-xs font-semibold text-primary hover:underline hover:text-primary/80 transition-colors cursor-pointer"
                  >
                    {t("نسيت كلمة المرور؟", "Forgot password?")}
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="h-12 rounded-xl px-4 pe-12 text-base border-border/80 focus-visible:ring-primary/20 bg-background/50 focus:bg-background transition-all text-start"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-3.5 end-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-1 rounded-md hover:bg-muted/60"
                  tabIndex={-1}
                  aria-label={showPassword ? t("إخفاء كلمة المرور", "Hide password") : t("إظهار كلمة المرور", "Show password")}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12 rounded-xl font-bold text-base shadow-sm hover:shadow transition-transform active:scale-[0.99] cursor-pointer mt-2"
            disabled={busy}
          >
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                {t("جاري المعالجة...", "Processing...")}
              </span>
            ) : mode === "in" ? (
              t("تسجيل الدخول", "Sign In")
            ) : mode === "up" ? (
              accountType === "author" ? t("إنشاء حساب مؤلف", "Create Author Account") : t("إنشاء حساب قارئ", "Create Reader Account")
            ) : (
              t("إرسال رابط الاستعادة", "Send Reset Link")
            )}
          </Button>
        </form>

        {/* Footer Navigation */}
        <div className="mt-6 text-center">
          {mode === "reset" ? (
            <button
              type="button"
              onClick={() => setMode("in")}
              className="inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold text-primary hover:underline hover:text-primary/80 transition-colors cursor-pointer"
            >
              <BackIcon className="h-4 w-4" />
              <span>{t("العودة لتسجيل الدخول", "Back to sign in")}</span>
            </button>
          ) : (
            <p className="text-xs md:text-sm text-muted-foreground">
              {mode === "in" ? t("ليس لديك حساب بعد؟", "Don't have an account yet?") : t("لديك حساب بالفعل؟", "Already have an account?")}{" "}
              <button
                type="button"
                onClick={() => setMode(mode === "in" ? "up" : "in")}
                className="font-bold text-primary hover:underline hover:text-primary/80 transition-colors cursor-pointer ms-1"
              >
                {mode === "in" ? t("أنشئ حساباً جديداً", "Create new account") : t("سجّل الدخول", "Sign in")}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
