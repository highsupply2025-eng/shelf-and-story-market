import {useLocale} from "@/lib/locale";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
 const {t}=useLocale();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) navigate({ to: "/account" });
  }, [session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
      if (error) toast.error("البريد أو كلمة المرور غير صحيحة");
    } else {
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { emailRedirectTo: window.location.origin, data: { display_name: form.name } },
      });
      if (error) toast.error(error.message);
      else toast.success("تم إنشاء الحساب! تحقق من بريدك لتأكيده.");
    }
    setBusy(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("تعذر الدخول عبر Google");
  }

  return (
    <div className="grid min-h-[80vh] place-items-center bg-hero px-4 py-12">
      <div className="w-full max-w-md animate-rise rounded-3xl border border-border bg-card p-8 shadow-book">
        <h1 className="text-center text-4xl font-bold">{mode === "in" ? t("أهلاً بعودتك","Welcome back") : t("انضم إلى unibook","Join unibook")}</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {t("حسابك للقراءة والنشر","Your account for reading and publishing")}
        </p>
        <Button variant="outline" className="mt-6 w-full" onClick={google}>{t("المتابعة عبر Google","Continue with Google")}</Button>
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> أو <div className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === "up" && (
            <div><Label>{t("الاسم","Name")}</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          )}
          <div><Label>{t("البريد الإلكتروني","Email")}</Label><Input type="email" dir="ltr" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>{t("كلمة المرور","Password")}</Label><Input type="password" dir="ltr" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <Button className="w-full rounded-full" size="lg" disabled={busy}>
            {mode === "in" ? t("دخول","Sign in") : t("إنشاء حساب","Create account")}
          </Button>
        </form>
        <button className="mt-5 w-full text-center text-sm text-primary" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? t("ليس لديك حساب؟ أنشئ حساباً","New here? Create an account") : t("لديك حساب؟ سجّل الدخول","Already registered? Sign in")}
        </button>
      </div>
    </div>
  );
}
