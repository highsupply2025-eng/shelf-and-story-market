import { useLocale } from "@/lib/locale";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import {
  useAuth,
  isNetworkOrFetchError,
  loginLocalUser,
  registerLocalUser,
  resolveStoredRoleForEmail,
} from "@/lib/auth";
import { serverSignInFn } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  Loader2,
  BookOpen,
  PenLine,
  Building2,
  Mail,
  Lock,
  ShieldCheck,
  Globe2,
  UserPlus,
  LogIn,
} from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "تسجيل الدخول — unibook" },
      { name: "description", content: "سجّل دخولك إلى منصة unibook للكتب العلمية والرقمية والمطبوعة." },
      { property: "og:title", content: "تسجيل الدخول — unibook" },
      { property: "og:description", content: "سجّل دخولك إلى منصة unibook للكتب العلمية والرقمية والمطبوعة." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { t, language } = useLocale();
  const [form, setForm] = useState({ email: "", password: "" });
  const [selectedRole, setSelectedRole] = useState<"reader" | "author" | "publisher" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const { session, refresh, isAdmin, accountType } = useAuth();
  const navigate = useNavigate();

  const detectedRole = selectedRole || resolveStoredRoleForEmail(form.email) || null;

  useEffect(() => {
    if (session) {
      const resolved =
        resolveStoredRoleForEmail(session.user.email, session.user.id) ||
        (session.user.user_metadata?.["account_type"] as "reader" | "author" | "publisher" | undefined) ||
        accountType;

      if (isAdmin || session.user.email?.toLowerCase().trim() === "highsupply2025@gmail.com") {
        navigate({ to: "/admin" });
      } else if (resolved === "publisher") {
        navigate({ to: "/publisher" });
      } else if (resolved === "author") {
        navigate({ to: "/author" });
      } else {
        navigate({ to: "/account" });
      }
    }
  }, [session, isAdmin, accountType, navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    if (resetMode) {
      if (!form.email.trim()) {
        toast.error(t("يرجى إدخال البريد الإلكتروني", "Please enter your email"));
        setBusy(false);
        return;
      }
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim(), {
          redirectTo: `${window.location.origin}/login`,
        });
        if (error && !isNetworkOrFetchError(error)) {
          toast.error(error.message || t("تعذر إرسال الرابط", "Failed to send reset link"));
        } else {
          toast.success(
            t(
              "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني بنجاح!",
              "Password reset link sent to your email successfully!"
            )
          );
          setResetMode(false);
        }
      } catch {
        toast.success(
          t(
            "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني بنجاح!",
            "Password reset link sent to your email successfully!"
          )
        );
        setResetMode(false);
      }
      setBusy(false);
      return;
    }

    const resolveEffectiveRole = (
      email?: string,
      remoteType?: unknown,
      userId?: string | null
    ): "reader" | "author" | "publisher" => {
      if (selectedRole) return selectedRole;
      const stored = resolveStoredRoleForEmail(email || form.email.trim(), userId);
      if (stored === "publisher" || stored === "author") return stored;
      if (remoteType === "publisher" || remoteType === "author") return remoteType;
      if (stored === "reader") return "reader";
      return "reader";
    };

    const redirectByUser = (email?: string, userType?: "reader" | "author" | "publisher") => {
      if (email?.toLowerCase().trim() === "highsupply2025@gmail.com") {
        navigate({ to: "/admin" });
      } else if (userType === "publisher") {
        navigate({ to: "/publisher" });
      } else if (userType === "author") {
        navigate({ to: "/author" });
      } else {
        navigate({ to: "/account" });
      }
    };

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      });

      if (error) {
        if (isNetworkOrFetchError(error)) {
          try {
            const srv = await serverSignInFn({
              data: { email: form.email.trim(), password: form.password },
            });
            if (srv.ok) {
              const role = resolveEffectiveRole(srv.email, srv.accountType, srv.userId);
              registerLocalUser({
                id: srv.userId ?? undefined,
                email: form.email.trim(),
                password: form.password,
                displayName: srv.displayName || form.email.split("@")[0] || "مستخدم",
                accountType: role,
                forceRoleChange: Boolean(selectedRole),
              });
              try {
                await supabase.auth.setSession(srv.session);
              } catch {
                /* ignore */
              }
              await refresh();
              toast.success(t("تم تسجيل الدخول بنجاح! مرحباً بك.", "Logged in successfully!"));
              redirectByUser(srv.email, role);
              setBusy(false);
              return;
            }
          } catch {
            /* fallback to local */
          }
        }
        const localRes = loginLocalUser({
          email: form.email.trim(),
          password: form.password,
          preferredRole: selectedRole,
        });
        if (!localRes.error && localRes.user) {
          const finalRole = resolveEffectiveRole(
            localRes.user.email,
            localRes.user.user_metadata?.["account_type"],
            localRes.user.id
          );
          await refresh();
          toast.success(t("تم تسجيل الدخول بنجاح! مرحباً بك.", "Logged in successfully!"));
          redirectByUser(localRes.user.email, finalRole);
        } else {
          toast.error(t("البريد أو كلمة المرور غير صحيحة", "Invalid email or password"));
        }
      } else {
        const rawType = data.user?.user_metadata?.["account_type"];
        const userType = resolveEffectiveRole(data.user?.email, rawType, data.user?.id);
        registerLocalUser({
          id: data.user?.id,
          email: form.email.trim(),
          password: form.password,
          displayName: String(
            data.user?.user_metadata?.["display_name"] || form.email.split("@")[0] || "مستخدم"
          ),
          accountType: userType,
          publisherName: String(data.user?.user_metadata?.["publisher_name"] || ""),
          forceRoleChange: Boolean(selectedRole),
        });
        toast.success(t("تم تسجيل الدخول بنجاح! مرحباً بك.", "Logged in successfully!"));
        await refresh();
        redirectByUser(data.user?.email, userType);
      }
    } catch {
      const localRes = loginLocalUser({
        email: form.email.trim(),
        password: form.password,
        preferredRole: selectedRole,
      });
      if (!localRes.error && localRes.user) {
        const finalRole = resolveEffectiveRole(
          localRes.user.email,
          localRes.user.user_metadata?.["account_type"],
          localRes.user.id
        );
        await refresh();
        toast.success(t("تم تسجيل الدخول بنجاح! مرحباً بك.", "Logged in successfully!"));
        redirectByUser(localRes.user.email, finalRole);
      } else {
        toast.error(t("البريد أو كلمة المرور غير صحيحة", "Invalid email or password"));
      }
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

  return (
    <div
      className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-b from-background via-muted/20 to-background px-4 pt-6 pb-28 sm:pb-32 md:pt-10 md:pb-36 select-none"
      dir="rtl"
    >
      {/* Decorative ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 -start-40 h-96 w-96 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-1/4 -end-40 h-96 w-96 rounded-full bg-amber-500/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-[480px] animate-rise rounded-3xl border border-border/80 bg-card/95 backdrop-blur-xl p-6 sm:p-9 shadow-2xl relative overflow-hidden ring-1 ring-border/40">
        {/* Top return back to home */}
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
          <Link
            to="/"
            className="group mb-3 flex items-center justify-center transition-transform active:scale-95"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/80 bg-card shadow-sm transition-all group-hover:border-primary/50 group-hover:shadow-md group-hover:scale-105">
              <img src="/logo-icon.png" alt="unibook" className="h-9 w-auto object-contain" />
            </div>
          </Link>

          {resetMode ? (
            <>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <KeyRound className="h-5 w-5" />
              </div>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                {t("استعادة كلمة المرور", "Reset Password")}
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground max-w-xs">
                {t(
                  "أدخل بريدك الإلكتروني وسنرسل لك رابطاً آمناً لإعادة تعيين كلمة المرور فوراً.",
                  "Enter your registered email to receive a password reset link."
                )}
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                {t("تسجيل الدخول", "Sign In")}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                {t("أهلاً بك مجدداً في منصة unibook العالمية للكتب", "Welcome back to unibook")}
              </p>
            </>
          )}
        </div>

        {!resetMode && (
          <>
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
              <span>{t("المتابعة الفورية باستخدام Google", "Continue with Google")}</span>
            </Button>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border/80" />
              <span className="font-bold text-[11px] px-1 text-muted-foreground/80">
                {t("أو عبر البريد الإلكتروني", "Or sign in with email")}
              </span>
              <div className="h-px flex-1 bg-border/80" />
            </div>

            {/* Interactive & Auto-Detecting Account Role Selector */}
            <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/5 via-card to-amber-500/5 p-3.5 space-y-2 mb-4 shadow-xs">
              <div className="text-xs font-extrabold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  {t("نوع الحساب عند الدخول", "Account Type")}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {selectedRole
                    ? t("تم التحديد يدوياً", "Selected")
                    : t("تعرّف تلقائي أو اختر نوع حسابك", "Auto-detected or click to select")}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-extrabold pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedRole("reader")}
                  className={`rounded-xl border p-2.5 transition-all cursor-pointer ${
                    detectedRole === "reader"
                      ? "border-emerald-600 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/30 shadow-xs"
                      : "border-emerald-500/30 bg-card text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                  }`}
                >
                  <BookOpen className="h-4 w-4 mx-auto mb-1 text-emerald-600" />
                  <span>{t("قارئ", "Reader")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole("author")}
                  className={`rounded-xl border p-2.5 transition-all cursor-pointer ${
                    detectedRole === "author"
                      ? "border-amber-600 bg-amber-500/15 text-amber-800 dark:text-amber-300 ring-2 ring-amber-500/30 shadow-xs"
                      : "border-amber-500/30 bg-card text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                  }`}
                >
                  <PenLine className="h-4 w-4 mx-auto mb-1 text-amber-600" />
                  <span>{t("مؤلف", "Author")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole("publisher")}
                  className={`rounded-xl border p-2.5 transition-all cursor-pointer ${
                    detectedRole === "publisher"
                      ? "border-blue-600 bg-blue-500/15 text-blue-800 dark:text-blue-300 ring-2 ring-blue-500/30 shadow-xs"
                      : "border-blue-500/30 bg-card text-blue-700 dark:text-blue-400 hover:bg-blue-500/10"
                  }`}
                >
                  <Building2 className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                  <span>{t("دار نشر", "Publisher")}</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="loginEmail" className="text-xs font-bold text-foreground/90">
              {t("البريد الإلكتروني", "Email address")}
            </Label>
            <div className="relative">
              <Mail className="absolute start-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="loginEmail"
                type="email"
                required
                placeholder="name@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="h-12 rounded-2xl ps-10 pe-4 text-sm border-border/80 focus-visible:ring-primary/20 bg-background/50 focus:bg-background transition-all text-start"
              />
            </div>
          </div>

          {/* Password (if not in reset mode) */}
          {!resetMode && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="loginPassword" className="text-xs font-bold text-foreground/90">
                  {t("كلمة المرور", "Password")}
                </Label>
                <button
                  type="button"
                  onClick={() => setResetMode(true)}
                  className="text-xs font-bold text-primary hover:underline hover:text-primary/80 transition-colors cursor-pointer"
                >
                  {t("نسيت كلمة المرور؟", "Forgot password?")}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute start-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="loginPassword"
                  type={showPassword ? "text" : "password"}
                  required
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
                  aria-label={
                    showPassword
                      ? t("إخفاء كلمة المرور", "Hide password")
                      : t("إظهار كلمة المرور", "Show password")
                  }
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12 rounded-2xl font-extrabold text-sm shadow-md hover:shadow-lg transition-transform active:scale-[0.99] cursor-pointer mt-4 gap-2"
            disabled={busy}
          >
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("جاري المعالجة الآمنة...", "Securing access...")}
              </span>
            ) : resetMode ? (
              <span>{t("إرسال رابط الاستعادة", "Send Reset Link")}</span>
            ) : (
              <>
                <LogIn className="h-4.5 w-4.5" />
                <span>{t("تسجيل الدخول للمنصة", "Sign In")}</span>
              </>
            )}
          </Button>
        </form>

        {/* Footer Navigation */}
        <div className="mt-6 text-center pt-3 border-t border-border/50">
          {resetMode ? (
            <button
              type="button"
              onClick={() => setResetMode(false)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline hover:text-primary/80 transition-colors cursor-pointer"
            >
              <BackIcon className="h-3.5 w-3.5" />
              <span>{t("العودة لتسجيل الدخول", "Back to sign in")}</span>
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-1 text-xs text-muted-foreground">
              <span>{t("ليس لديك حساب بعد في unibook؟", "Don't have an account yet?")}</span>
              <Link
                to="/register"
                className="font-extrabold text-primary hover:underline hover:text-primary/80 transition-colors inline-flex items-center gap-1"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>{t("إنشاء حساب جديد الآن", "Create an account")}</span>
              </Link>
            </div>
          )}
        </div>

        {/* Security & Trust Footer */}
        <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-muted-foreground/75 text-center">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>
            {t(
              "اتصال آمن ومشفّر بأعلى معايير الحماية 256-bit SSL",
              "Secure 256-bit SSL encrypted connection"
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
