import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, Copy } from "lucide-react";
import { generateBookBlurb } from "@/lib/blurb.functions";
import { useLocale } from "@/lib/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function BlurbGenerator() {
  const { t, language } = useLocale();
  const gen = useServerFn(generateBookBlurb);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ blurb: string; keywords: string[] } | null>(null);

  const errors: Record<string, string> = {
    author_required: t("هذه الميزة متاحة لحسابات المؤلفين", "Available to author accounts only"),
    rate: t("طلبات كثيرة الآن، حاول بعد قليل", "Too many requests, try again shortly"),
    credits: t("رصيد الذكاء الاصطناعي غير كافٍ حالياً", "AI credits are currently unavailable"),
    config: t("الخدمة غير مهيأة", "Service not configured"),
    failed: t("تعذر إنشاء النبذة، حاول مرة أخرى", "Could not generate the blurb, try again"),
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (description.trim().length < 20) {
      toast.error(t("اكتب وصفاً لا يقل عن 20 حرفاً", "Write at least 20 characters"));
      return;
    }
    setBusy(true);
    try {
      const r = await gen({ data: { title, description, language: language === "en" ? "en" : "ar" } });
      if ("error" in r) toast.error(errors[r.error ?? "failed"]);
      else setResult(r);
    } catch {
      toast.error(errors.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={submit} className="space-y-4">
        <h2 className="text-2xl font-semibold">{t("أنشئ نبذة تسويقية لكتابك", "Create a marketing blurb")}</h2>
        <p className="text-sm text-muted-foreground">{t("اكتب وصف كتابك وسنقترح نبذة جذابة وكلمات مفتاحية للبحث.", "Describe your book and get a compelling blurb plus search keywords.")}</p>
        <div><Label htmlFor="bl-title">{t("عنوان الكتاب", "Book title")}</Label><Input id="bl-title" className="mt-2" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div><Label htmlFor="bl-desc">{t("وصف الكتاب", "Book description")}</Label><Textarea id="bl-desc" className="mt-2 min-h-48" maxLength={4000} required value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <Button disabled={busy}><Sparkles className="me-2 h-4 w-4" />{busy ? t("جارٍ الإنشاء...", "Generating...") : t("إنشاء النبذة", "Generate")}</Button>
      </form>
      <div className="rounded-lg border bg-card p-6">
        {!result ? (
          <p className="py-16 text-center text-muted-foreground">{busy ? t("نكتب نبذتك الآن...", "Writing your blurb...") : t("ستظهر النتيجة هنا", "Your result appears here")}</p>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{t("النبذة التسويقية", "Marketing blurb")}</h3>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(result.blurb); toast.success(t("تم النسخ", "Copied")); }}><Copy className="me-1 h-4 w-4" />{t("نسخ", "Copy")}</Button></div>
            <p className="whitespace-pre-wrap leading-relaxed">{result.blurb}</p>
            <div><h3 className="font-semibold">{t("الكلمات المفتاحية", "Keywords")}</h3>
              <div className="mt-3 flex flex-wrap gap-2">{result.keywords.map((k) => <span key={k} className="rounded-full border bg-secondary px-3 py-1 text-sm text-secondary-foreground">{k}</span>)}</div></div>
          </div>
        )}
      </div>
    </div>
  );
}
