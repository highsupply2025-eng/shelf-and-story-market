import React, { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ShieldCheck, Mail, KeyRound, Loader2, RefreshCw, ArrowRight, CheckCircle2, Lock, Eye, EyeOff, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
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

  // Automatically detect when admin clicks the Magic Link in their email
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user?.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase()) {
        toast.success("تم تأكيد الدخول عبر البريد بنجاح! جاري فتح لوحة الإدارة...");
        await refresh();
        if (onSuccess) {
          onSuccess();
        } else {
          navigate({ to: "/admin" });
        }
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, refresh, onSuccess]);

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
      const { error } = await supabase.auth.signInWithOtp({
        email: ADMIN_EMAIL,
        options: {
          emailRedirectTo: redirectUrl,
          shouldCreateUser: true,
        },
      });

      if (error) {
        toast.error(error.message || "تعذر إرسال رسالة التحقق. يرجى المحاولة بعد قليل.");
      } else {
        toast.success("تم إرسال رسالة الدخول بنجاح إلى بريد الإدارة!");
        setStep("verify");
        setCountdown(60);
      }
    } catch (err: any) {
      toast.error(err?.message || "حدث خطأ أثناء إرسال الرسالة");
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
        toast.error("كلمة المرور غير صحيحة. يمكنك استخدام رابط البريد بدلاً منها.");
      } else {
        toast.success("تم تسجيل الدخول بنجاح! مرحباً بك.");
        await refresh();
        if (onSuccess) {
          onSuccess();
        } else {
          navigate({ to: "/admin" });
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "تعذر الدخول بكلمة المرور");
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
      const { data, error } = await supabase.auth.verifyOtp({
        email: ADMIN_EMAIL,
        token: token,
        type: "email",
      });

      if (error) {
        toast.error("كود التحقق غير صحيح أو انتهت صلاحيته. يرجى إعادة الإرسال.");
      } else {
        toast.success("تم تأكيد الكود بنجاح! مرحباً بك في لوحة الإدارة.");
        await refresh();
        if (onSuccess) {
          onSuccess();
        } else {
          navigate({ to: "/admin" });
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "تعذر التحقق من الكود");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto rounded-3xl border border-primary/20 bg-card p-6 md:p-8 shadow-2xl relative overflow-hidden" dir="rtl">
      <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3 shadow-inner">
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>
        <div className="flex items-center justify-center gap-2 mb-1">
          <Badge variant="outline" className="border-primary/30 text-primary px-2.5 py-0.5 text-xs font-semibold">
            لوحة الإدارة العليا
          </Badge>
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground">
          تسجيل دخول الإدارة
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          unibook Admin Portal
        </p>
      </div>

      {/* Email Display */}
      <div className="mb-6 rounded-2xl border border-border/80 bg-background/50 p-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card border border-border/70 text-muted-foreground">
          <Mail className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium">البريد المعتمد للإدارة</p>
          <p className="text-sm font-bold text-foreground truncate" dir="ltr">{ADMIN_EMAIL}</p>
        </div>
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
      </div>

      {step === "request" ? (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            لأمان لوحة التحكم، يمكنك استقبال رابط الدخول السريع مباشرة على بريد الإدارة، أو الدخول بكلمة المرور.
          </p>

          <Button
            type="button"
            onClick={handleSendOtp}
            disabled={loading}
            className="w-full h-12 text-sm font-bold rounded-xl shadow-md gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري الإرسال للبريد...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                إرسال رابط الدخول / الكود للبريد
              </>
            )}
          </Button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-border/70" />
            <span className="flex-shrink mx-3 text-[11px] text-muted-foreground font-medium">أو</span>
            <div className="flex-grow border-t border-border/70" />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => setStep("password")}
            className="w-full h-11 text-xs font-bold rounded-xl gap-2 hover:bg-primary/5"
          >
            <Lock className="h-3.5 w-3.5" />
            الدخول بكلمة مرور الحساب
          </Button>
        </div>
      ) : step === "password" ? (
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
            className="w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1 pt-1"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            الرجوع للدخول عبر البريد (رابط / كود)
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          {/* Smart Notice About Email Link */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 text-center space-y-1.5">
            <div className="flex items-center justify-center gap-1.5 text-primary font-bold text-xs">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>تم إرسال رسالة الدخول إلى بريدك!</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              • يمكنك <strong className="text-foreground">الضغط مباشرة على زر (Log In / الدخول)</strong> داخل الرسالة التي وصلتك وسيتم فتح لوحة الإدارة تلقائياً!
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              • أو إذا ظهر لك كود أرقام داخل الرسالة، يمكنك كتابته بالأسفل:
            </p>
          </div>

          <div className="text-center">
            <div className="flex justify-center my-3" dir="ltr">
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
              >
                <InputOTPGroup className="gap-2">
                  <InputOTPSlot index={0} className="h-11 w-10 rounded-lg text-lg font-bold border-border/80" />
                  <InputOTPSlot index={1} className="h-11 w-10 rounded-lg text-lg font-bold border-border/80" />
                  <InputOTPSlot index={2} className="h-11 w-10 rounded-lg text-lg font-bold border-border/80" />
                  <InputOTPSlot index={3} className="h-11 w-10 rounded-lg text-lg font-bold border-border/80" />
                  <InputOTPSlot index={4} className="h-11 w-10 rounded-lg text-lg font-bold border-border/80" />
                  <InputOTPSlot index={5} className="h-11 w-10 rounded-lg text-lg font-bold border-border/80" />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <Button
            id="admin-verify-btn"
            type="submit"
            disabled={loading || otpCode.length < 6}
            className="w-full h-11 text-sm font-bold rounded-xl shadow-md gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري التحقق من الكود...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                تأكيد الكود ودخول لوحة الإدارة
              </>
            )}
          </Button>

          <div className="flex items-center justify-between pt-1 text-xs">
            <button
              type="button"
              onClick={() => setStep("password")}
              className="text-primary font-bold hover:underline flex items-center gap-1"
            >
              <Lock className="h-3 w-3" />
              أو الدخول بكلمة المرور
            </button>

            {countdown > 0 ? (
              <span className="text-muted-foreground text-[11px]">
                إعادة الإرسال بعد ({countdown} ث)
              </span>
            ) : (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading}
                className="text-primary font-bold hover:underline flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                إرسال رسالة جديدة
              </button>
            )}
          </div>
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
          <DialogTitle>تسجيل دخول الإدارة</DialogTitle>
          <DialogDescription>أدخل كود التحقق المرسل للبريد</DialogDescription>
        </DialogHeader>
        <AdminAuthCard onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
