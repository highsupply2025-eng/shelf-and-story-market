import React, { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ShieldCheck, Mail, KeyRound, Loader2, RefreshCw, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
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
  const [step, setStep] = useState<"request" | "verify">("request");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

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
      const { error } = await supabase.auth.signInWithOtp({
        email: ADMIN_EMAIL,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        toast.error(error.message || "تعذر إرسال رمز التحقق. يرجى المحاولة بعد قليل.");
      } else {
        toast.success("تم إرسال كود التحقق بنجاح إلى بريد الإدارة!");
        setStep("verify");
        setCountdown(60);
      }
    } catch (err: any) {
      toast.error(err?.message || "حدث خطأ أثناء إرسال الرمز");
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
            لأمان لوحة التحكم، يتم الدخول حصرياً عبر رمز تحقق مؤقت (OTP) يتم إرساله إلى البريد الإلكتروني الخاص بالإدارة أعلاه.
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
                جاري إرسال الكود...
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" />
                إرسال كود التحقق إلى البريد
              </>
            )}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              تم إرسال كود التحقق (6 أرقام) إلى بريدك الإلكتروني. تفقد صندوق الوارد أو الرسائل غير المرغوبة (Spam).
            </p>

            <div className="flex justify-center my-4" dir="ltr">
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
                  <InputOTPSlot index={0} className="h-12 w-11 rounded-lg text-lg font-bold border-border/80" />
                  <InputOTPSlot index={1} className="h-12 w-11 rounded-lg text-lg font-bold border-border/80" />
                  <InputOTPSlot index={2} className="h-12 w-11 rounded-lg text-lg font-bold border-border/80" />
                  <InputOTPSlot index={3} className="h-12 w-11 rounded-lg text-lg font-bold border-border/80" />
                  <InputOTPSlot index={4} className="h-12 w-11 rounded-lg text-lg font-bold border-border/80" />
                  <InputOTPSlot index={5} className="h-12 w-11 rounded-lg text-lg font-bold border-border/80" />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <Button
            id="admin-verify-btn"
            type="submit"
            disabled={loading || otpCode.length < 6}
            className="w-full h-12 text-sm font-bold rounded-xl shadow-md gap-2"
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

          <div className="flex items-center justify-between pt-2 text-xs">
            <button
              type="button"
              onClick={() => setStep("request")}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              إعادة الإرسال
            </button>

            {countdown > 0 ? (
              <span className="text-muted-foreground">
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
                إرسال كود جديد
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
