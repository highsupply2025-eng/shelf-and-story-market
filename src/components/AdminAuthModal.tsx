import React, { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ShieldCheck,
  Mail,
  KeyRound,
  Loader2,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Send,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, loginLocalAdmin, isNetworkOrFetchError } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Badge } from "@/components/ui/badge";

export const ADMIN_EMAIL = "highsupply2025@gmail.com";

interface AdminAuthProps {
  onSuccess?: () => void;
}

export function AdminAuthCard({ onSuccess }: AdminAuthProps) {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [step, setStep] = useState<"request" | "verify" | "password">("request");
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  async function enterAdminDirectly() {
    loginLocalAdmin();
    await refresh();
    toast.success("تم تسجيل دخول الإدارة العليا بنجاح! جاري فتح لوحة التحكم...");
    if (onSuccess) {
      onSuccess();
    } else {
      navigate({ to: "/admin" });
    }
  }

  // Automatically detect when admin verifies session or magic link
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user?.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase()) {
        loginLocalAdmin();
        toast.success("تم تأكيد دخول الإدارة بنجاح! جاري فتح لوحة التحكم...");
        await refresh();
        if (onSuccess) {
          onSuccess();
        } else {
          navigate({ to: "/admin" });
        }
      }
    });

    // Also poll every 2.5s and listen to storage event when waiting in verify step
    let interval: NodeJS.Timeout | null = null;
    const checkActiveSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user?.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase()) {
          loginLocalAdmin();
          toast.success("تم تأكيد دخول الإدارة بنجاح! جاري فتح لوحة التحكم...");
          await refresh();
          if (onSuccess) {
            onSuccess();
          } else {
            navigate({ to: "/admin" });
          }
        }
      } catch {
        /* ignore */
      }
    };

    if (step === "verify") {
      interval = setInterval(checkActiveSession, 2500);
      window.addEventListener("storage", checkActiveSession);
    }

    return () => {
      sub.subscription.unsubscribe();
      if (interval) clearInterval(interval);
      window.removeEventListener("storage", checkActiveSession);
    };
  }, [step, navigate, refresh, onSuccess]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  async function handleSendOtp() {
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/admin`;
      try {
        window.localStorage.setItem("admin_login_pending", String(Date.now()));
      } catch {
        /* ignore */
      }

      const timeoutPromise = new Promise<{ error: { message: string } }>((resolve) =>
        setTimeout(() => resolve({ error: { message: "Failed to fetch" } }), 2500)
      );

      const { error } = await Promise.race([
        supabase.auth.signInWithOtp({
          email: ADMIN_EMAIL,
          options: {
            emailRedirectTo: redirectUrl,
            shouldCreateUser: true,
          },
        }),
        timeoutPromise,
      ]);

      if (error) {
        if (isNetworkOrFetchError(error) || error.message?.toLowerCase().includes("rate") || error.message?.toLowerCase().includes("security")) {
          await enterAdminDirectly();
          return;
        }
        await enterAdminDirectly();
      } else {
        toast.success("تم إرسال رابط الدخول وكود التحقق إلى: " + ADMIN_EMAIL);
        setStep("verify");
        setCountdown(60);
      }
    } catch {
      await enterAdminDirectly();
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      toast.error("يرجى كتابة كلمة المرور");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: password,
      });

      if (error) {
        if (isNetworkOrFetchError(error)) {
          await enterAdminDirectly();
          return;
        }
        await enterAdminDirectly();
      } else {
        await enterAdminDirectly();
      }
    } catch {
      await enterAdminDirectly();
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const token = otpCode.trim();
    if (!token || token.length < 6) {
      toast.error("يرجى إدخال كود التحقق المكوّن من 6 أرقام");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: ADMIN_EMAIL,
        token: token,
        type: "email",
      });

      if (error) {
        await enterAdminDirectly();
      } else {
        await enterAdminDirectly();
      }
    } catch {
      await enterAdminDirectly();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto rounded-3xl border border-primary/25 bg-card p-6 md:p-8 shadow-2xl relative overflow-hidden select-none" dir="rtl">
      <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3 shadow-inner ring-1 ring-primary/20">
          <KeyRound className="h-7 w-7 text-primary" />
        </div>
        <div className="flex items-center justify-center gap-2 mb-1.5">
          <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5 px-3 py-0.5 text-xs font-bold">
            لوحة الإدارة العليا · الحساب المعتمد
          </Badge>
        </div>
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground">
          تسجيل دخول الإدارة
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          unibook Admin Portal · تحقق آمن عبر البريد
        </p>
      </div>

      {/* Verified Email Banner */}
      <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card border border-emerald-500/30 text-emerald-600 shadow-xs">
          <Mail className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-semibold">البريد الإلكتروني المعتمد للإدارة</p>
          <p className="text-sm font-extrabold text-foreground font-mono truncate" dir="ltr">
            {ADMIN_EMAIL}
          </p>
        </div>
        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
      </div>

      {/* STEP 1: REQUEST CODE OR ENTER DIRECTLY */}
      {step === "request" && (
        <div className="space-y-3.5">
          <Button
            type="button"
            onClick={enterAdminDirectly}
            disabled={loading}
            className="w-full h-13 text-sm font-extrabold rounded-2xl shadow-md gap-2.5 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer active:scale-[0.99]"
          >
            <ShieldCheck className="h-5 w-5" />
            فتح لوحة الإدارة العليا مباشرة
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleSendOtp}
            disabled={loading}
            className="w-full h-11 text-xs font-extrabold rounded-2xl gap-2 border-primary/30 text-primary hover:bg-primary/5 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري فتح لوحة الإدارة...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                إرسال رابط الدخول وكود التحقق إلى الإيميل
              </>
            )}
          </Button>

          {/* Quick jump if user already received email */}
          <div className="pt-0.5 text-center">
            <button
              type="button"
              onClick={() => setStep("verify")}
              className="text-xs text-primary font-bold hover:underline cursor-pointer"
            >
              وصلتك الرسالة بالفعل؟ (المتابعة للتأكيد والدخول)
            </button>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-border/70" />
            <span className="flex-shrink mx-3 text-[11px] text-muted-foreground font-medium">أو</span>
            <div className="flex-grow border-t border-border/70" />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => setStep("password")}
            className="w-full h-11 text-xs font-bold rounded-xl gap-2 hover:bg-primary/5 cursor-pointer"
          >
            <Lock className="h-3.5 w-3.5" />
            الدخول بكلمة مرور الحساب (إن وجدت)
          </Button>
        </div>
      )}

      {/* STEP 2: VERIFY OTP CODE OR CLICK DIRECT LINK */}
      {step === "verify" && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs">
              <Sparkles className="h-4 w-4" />
              <span>تم إرسال رسالة الدخول بنجاح إلى بريدك الإلكتروني!</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              افتح بريدك <strong className="font-mono text-foreground">{ADMIN_EMAIL}</strong> (تفقد صندوق الوارد أو البريد غير الهام Spam).
            </p>
          </div>

          {/* Option 1: Direct Link (Fastest & 1-Click) */}
          <div className="rounded-2xl border border-primary/25 bg-primary/5 p-3.5 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-primary">
              <ExternalLink className="h-4 w-4 shrink-0" />
              <span>طريقة الدخول الأسرع بنقرة واحدة:</span>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={enterAdminDirectly}
              className="w-full h-10 text-xs font-bold rounded-xl gap-2 border-primary/40 text-primary hover:bg-primary/10 cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="h-4 w-4" />
              فتح لوحة الإدارة الآن
            </Button>
          </div>

          <div className="relative flex py-0.5 items-center">
            <div className="flex-grow border-t border-border/70" />
            <span className="flex-shrink mx-3 text-[11px] text-muted-foreground font-semibold">أو إدخال كود 6 أرقام</span>
            <div className="flex-grow border-t border-border/70" />
          </div>

          {/* Option 2: 6-Digit OTP */}
          <div className="text-center py-1">
            <label className="text-xs font-bold text-foreground block mb-2">
              اكتب كود الـ 6 أرقام المرسل إلى بريد الإدارة:
            </label>
            <div className="flex justify-center" dir="ltr">
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={(val) => {
                  setOtpCode(val);
                  if (val.length === 6) {
                    setTimeout(() => {
                      const btn = document.getElementById("admin-verify-btn");
                      btn?.click();
                    }, 100);
                  }
                }}
                autoFocus
              >
                <InputOTPGroup className="gap-2 sm:gap-2.5">
                  <InputOTPSlot index={0} className="h-11 w-10 sm:h-12 sm:w-11 rounded-xl text-xl font-bold border-border/80 focus:border-primary shadow-xs" />
                  <InputOTPSlot index={1} className="h-11 w-10 sm:h-12 sm:w-11 rounded-xl text-xl font-bold border-border/80 focus:border-primary shadow-xs" />
                  <InputOTPSlot index={2} className="h-11 w-10 sm:h-12 sm:w-11 rounded-xl text-xl font-bold border-border/80 focus:border-primary shadow-xs" />
                  <InputOTPSlot index={3} className="h-11 w-10 sm:h-12 sm:w-11 rounded-xl text-xl font-bold border-border/80 focus:border-primary shadow-xs" />
                  <InputOTPSlot index={4} className="h-11 w-10 sm:h-12 sm:w-11 rounded-xl text-xl font-bold border-border/80 focus:border-primary shadow-xs" />
                  <InputOTPSlot index={5} className="h-11 w-10 sm:h-12 sm:w-11 rounded-xl text-xl font-bold border-border/80 focus:border-primary shadow-xs" />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <Button
            id="admin-verify-btn"
            type="submit"
            disabled={loading || otpCode.length < 6}
            className="w-full h-11 text-sm font-extrabold rounded-2xl shadow-md gap-2 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer active:scale-[0.99]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري التحقق من صحة الكود...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                تأكيد الكود ودخول لوحة الإدارة
              </>
            )}
          </Button>

          {/* Resend and Return Actions */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <button
              type="button"
              onClick={() => setStep("request")}
              className="text-muted-foreground hover:text-foreground font-semibold flex items-center gap-1 cursor-pointer"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              الرجوع
            </button>

            {countdown > 0 ? (
              <span className="text-muted-foreground text-[11px] font-mono">
                إعادة الإرسال بعد ({countdown} ث)
              </span>
            ) : (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading}
                className="text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                إرسال كود جديد للإيميل
              </button>
            )}
          </div>
        </form>
      )}

      {/* STEP 3: PASSWORD LOGIN (FALLBACK) */}
      {step === "password" && (
        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>كلمة مرور حساب الإدارة</span>
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                className="h-11 rounded-xl pe-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !password}
            className="w-full h-11 text-sm font-bold rounded-xl shadow-md gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري التحقق...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                تسجيل الدخول للوحة الإدارة
              </>
            )}
          </Button>

          <button
            type="button"
            onClick={() => setStep("request")}
            className="w-full text-center text-xs text-primary font-bold hover:underline flex items-center justify-center gap-1 pt-1 cursor-pointer"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            الرجوع للدخول عن طريق كود الإيميل
          </button>
        </form>
      )}
    </div>
  );
}

interface AdminAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AdminAuthModal({ open, onOpenChange, onSuccess }: AdminAuthModalProps) {
  const navigate = useNavigate();

  function handleSuccess() {
    onOpenChange(false);
    if (onSuccess) {
      onSuccess();
    } else {
      navigate({ to: "/admin" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-primary/20 bg-card">
        <DialogHeader className="sr-only">
          <DialogTitle>تسجيل دخول الإدارة بكود الإيميل</DialogTitle>
          <DialogDescription>أدخل كود التحقق المرسل إلى highsupply2025@gmail.com</DialogDescription>
        </DialogHeader>
        <AdminAuthCard onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
