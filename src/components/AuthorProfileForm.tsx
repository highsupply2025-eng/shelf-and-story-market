import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Upload, FileText, Loader2, Save, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLocale } from "@/lib/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface AuthorProfileData {
  fullName: string;
  age: string;
  phone: string;
  address: string;
  qualification: string;
  universityCertName: string;
  universityCertPath: string;
  nationalIdName: string;
  nationalIdPath: string;
  previousWorks: string;
  bio: string;
  updatedAt?: string;
}

const EMPTY_PROFILE: AuthorProfileData = {
  fullName: "",
  age: "",
  phone: "",
  address: "",
  qualification: "",
  universityCertName: "",
  universityCertPath: "",
  nationalIdName: "",
  nationalIdPath: "",
  previousWorks: "",
  bio: "",
};

export function isAuthorProfileComplete(p: AuthorProfileData | null | undefined): boolean {
  if (!p) return false;
  return Boolean(
    p.fullName.trim() &&
      p.age.trim() &&
      p.phone.trim() &&
      p.address.trim() &&
      p.qualification.trim() &&
      p.universityCertName.trim() &&
      p.nationalIdName.trim() &&
      p.previousWorks.trim() &&
      p.bio.trim()
  );
}

export function loadAuthorProfile(uid: string | undefined, metadata?: Record<string, unknown>): AuthorProfileData {
  const metaProfile = (metadata?.["author_profile"] as Partial<AuthorProfileData> | undefined) ?? {};
  let localProfile: Partial<AuthorProfileData> = {};
  if (typeof window !== "undefined" && uid) {
    try {
      const raw = window.localStorage.getItem(`unibook_author_profile_${uid}`);
      if (raw) localProfile = JSON.parse(raw) as Partial<AuthorProfileData>;
    } catch {
      /* ignore */
    }
  }
  return {
    ...EMPTY_PROFILE,
    fullName: String(metadata?.["display_name"] || metadata?.["full_name"] || ""),
    ...metaProfile,
    ...localProfile,
  };
}

export function AuthorProfileForm() {
  const { session, refresh } = useAuth();
  const { t } = useLocale();
  const uid = session?.user.id;

  const [form, setForm] = useState<AuthorProfileData>(() =>
    loadAuthorProfile(uid, session?.user.user_metadata as Record<string, unknown> | undefined)
  );
  const [certFile, setCertFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(loadAuthorProfile(uid, session?.user.user_metadata as Record<string, unknown> | undefined));
  }, [uid, session?.user.user_metadata]);

  const complete = isAuthorProfileComplete(form);

  async function uploadDoc(file: File, prefix: string): Promise<{ name: string; path: string }> {
    if (!uid) return { name: file.name, path: "" };
    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const path = `${uid}/${prefix}-${crypto.randomUUID()}.${ext}`;
    try {
      const { error } = await supabase.storage.from("author-documents").upload(path, file, { upsert: true });
      if (!error) return { name: file.name, path };
    } catch {
      /* fallback to filename reference */
    }
    return { name: file.name, path: `local:${file.name}` };
  }

  async function previewDoc(path: string) {
    if (!path || path.startsWith("local:")) {
      toast.info(t("تم حفظ اسم الملف محلياً؛ يرجى إعادة الرفع عند توفر التخزين السحابي.", "File name saved locally."));
      return;
    }
    const { data, error } = await supabase.storage.from("author-documents").createSignedUrl(path, 60);
    if (error || !data) {
      toast.error(t("تعذر فتح الملف", "Could not open file"));
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!uid) return;
    setSaving(true);
    try {
      let next = { ...form };
      if (certFile) {
        const res = await uploadDoc(certFile, "university-cert");
        next = { ...next, universityCertName: res.name, universityCertPath: res.path };
      }
      if (idFile) {
        const res = await uploadDoc(idFile, "national-id");
        next = { ...next, nationalIdName: res.name, nationalIdPath: res.path };
      }
      next.updatedAt = new Date().toISOString();

      if (typeof window !== "undefined") {
        window.localStorage.setItem(`unibook_author_profile_${uid}`, JSON.stringify(next));
        window.dispatchEvent(new Event("unibook_admin_update"));
      }

      const { error: authErr } = await supabase.auth.updateUser({
        data: {
          display_name: next.fullName.trim() || undefined,
          author_profile: next,
        },
      });
      if (authErr) throw authErr;

      try {
        await supabase
          .from("publishers")
          .update({ store_name: next.fullName.trim(), bio: next.bio.trim() })
          .eq("id", uid);
      } catch {
        /* publishers row may not exist yet */
      }

      setForm(next);
      setCertFile(null);
      setIdFile(null);
      await refresh();
      toast.success(t("تم حفظ بيانات المؤلف بنجاح", "Author profile saved successfully"));
    } catch {
      toast.error(t("تعذر حفظ البيانات، يرجى المحاولة مجدداً", "Failed to save profile, please retry"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Status Banner */}
      <div
        className={`rounded-2xl border p-4 flex items-start gap-3 ${
          complete
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
            : "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100"
        }`}
      >
        {complete ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        )}
        <div className="text-sm space-y-1">
          <p className="font-bold">
            {complete
              ? t("ملف بيانات المؤلف مكتمل ومعتمد", "Author profile is complete")
              : t("مطلوب إكمال بيانات المؤلف بعد تسجيل الدخول", "Please complete your author profile")}
          </p>
          <p className="text-xs opacity-85">
            {complete
              ? t(
                  "جميع البيانات والمستندات الأساسية محفوظة. يمكنك تحديثها في أي وقت.",
                  "All required details and documents are saved. You can update them anytime."
                )
              : t(
                  "يرجى تعبئة الاسم والعمر ورقم الجوال والعنوان والمؤهل العلمي وإرفاق الشهادة الجامعية وصورة الهوية وما سبق من التأليف ونبذة عنك.",
                  "Please fill in your full name, age, mobile, address, qualification, university certificate, ID photo, previous works, and bio."
                )}
          </p>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border bg-card p-6 md:p-8 shadow-xs space-y-6">
        <div>
          <h2 className="text-xl font-bold">{t("بيانات المؤلف والمستندات الرسمية", "Author Profile & Official Documents")}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {t("تُستخدم هذه البيانات لتوثيق حساب المؤلف وإصدار عقود النشر وإيصالات الدفع.", "Used to verify your author account, publishing contracts, and payment receipts.")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ap-name">{t("الاسم الكامل *", "Full name *")}</Label>
            <Input
              id="ap-name"
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder={t("الاسم الثلاثي أو الرباعي", "Full legal name")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ap-age">{t("العمر *", "Age *")}</Label>
            <Input
              id="ap-age"
              type="number"
              min={16}
              max={100}
              required
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
              placeholder="35"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ap-phone">{t("رقم الجوال *", "Mobile number *")}</Label>
            <Input
              id="ap-phone"
              type="tel"
              required
              dir="ltr"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+966 5X XXX XXXX"
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("المؤهل العلمي *", "Academic qualification *")}</Label>
            <Select value={form.qualification} onValueChange={(v) => setForm({ ...form, qualification: v })}>
              <SelectTrigger>
                <SelectValue placeholder={t("اختر المؤهل العلمي", "Select qualification")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="بكالوريوس">{t("بكالوريوس", "Bachelor's Degree")}</SelectItem>
                <SelectItem value="ماجستير">{t("ماجستير", "Master's Degree")}</SelectItem>
                <SelectItem value="دكتوراه">{t("دكتوراه", "PhD / Doctorate")}</SelectItem>
                <SelectItem value="أستاذ مشارك / دكتور">{t("أستاذ مشارك / أستاذ دكتور", "Associate / Full Professor")}</SelectItem>
                <SelectItem value="أخرى">{t("مؤهل آخر", "Other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ap-address">{t("العنوان الكامل *", "Full address *")}</Label>
          <Input
            id="ap-address"
            required
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder={t("الدولة، المدينة، الحي، الشارع", "Country, City, District, Street")}
          />
        </div>

        {/* Document Uploads */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border bg-muted/30 p-4 space-y-2.5">
            <Label htmlFor="ap-cert" className="font-bold flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-primary" />
              <span>{t("الشهادة الجامعية (PDF أو صورة) *", "University Certificate (PDF/Image) *")}</span>
            </Label>
            <Input
              id="ap-cert"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setCertFile(e.target.files?.[0] ?? null)}
              className="cursor-pointer bg-background"
            />
            {(certFile || form.universityCertName) && (
              <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400">
                <span className="truncate">{certFile ? certFile.name : form.universityCertName}</span>
                {!certFile && form.universityCertPath && (
                  <button
                    type="button"
                    onClick={() => void previewDoc(form.universityCertPath)}
                    className="inline-flex items-center gap-1 font-semibold underline shrink-0 ms-2 cursor-pointer"
                  >
                    <Download className="h-3 w-3" /> {t("عرض", "View")}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-muted/30 p-4 space-y-2.5">
            <Label htmlFor="ap-id" className="font-bold flex items-center gap-1.5">
              <Upload className="h-4 w-4 text-primary" />
              <span>{t("صورة من الهوية الوطنية / الإقامة *", "National ID / Passport Image *")}</span>
            </Label>
            <Input
              id="ap-id"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
              className="cursor-pointer bg-background"
            />
            {(idFile || form.nationalIdName) && (
              <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400">
                <span className="truncate">{idFile ? idFile.name : form.nationalIdName}</span>
                {!idFile && form.nationalIdPath && (
                  <button
                    type="button"
                    onClick={() => void previewDoc(form.nationalIdPath)}
                    className="inline-flex items-center gap-1 font-semibold underline shrink-0 ms-2 cursor-pointer"
                  >
                    <Download className="h-3 w-3" /> {t("عرض", "View")}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ap-prev">{t("ما سبق من التأليف والإصدارات *", "Previous Publications & Authored Works *")}</Label>
          <Textarea
            id="ap-prev"
            required
            rows={3}
            value={form.previousWorks}
            onChange={(e) => setForm({ ...form, previousWorks: e.target.value })}
            placeholder={t(
              "اذكر الكتب أو الأبحاث المنشورة سابقاً (أو اكتب: لا يوجد إصدارات سابقة)",
              "List previously published books or research papers (or write: None)"
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ap-bio">{t("نبذة عن المؤلف *", "Author Biography *")}</Label>
          <Textarea
            id="ap-bio"
            required
            rows={4}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder={t("اكتب نبذة تعريفية عنك وتخصصك العلمي والأدبي...", "Write a short biography about your background and specialization...")}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={saving} className="rounded-xl font-bold gap-2 px-8">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{saving ? t("جاري الحفظ...", "Saving...") : t("حفظ بيانات المؤلف", "Save Author Profile")}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
