import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSignature,
  IdCard,
  ShieldCheck,
  Upload,
  UserSquare2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLocale } from "@/lib/locale";
import { DashboardShell } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STRICT_CONTRACT_CLAUSES } from "@/lib/contract-clauses";
import { openPrintableContract } from "@/components/AuthorStudio";

export const Route = createFileRoute("/_authenticated/contract/$id")({
  head: () => ({
    meta: [
      { title: "عقد النشر الإلكتروني — unibook" },
      { name: "description", content: "مراجعة بنود عقد النشر والتوقيع الإلكتروني وإرفاق الهوية." },
    ],
  }),
  component: AuthorContractPage,
});

function ImageUploadBox({
  id,
  label,
  hint,
  file,
  onChange,
  icon: Icon,
}: {
  id: string;
  label: string;
  hint: string;
  file: File | null;
  onChange: (f: File | null) => void;
  icon: typeof IdCard;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
      <div className="flex items-start gap-2.5">
        <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <Label htmlFor={id} className="text-sm font-bold text-foreground cursor-pointer">
            {label} <span className="text-destructive">*</span>
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
        </div>
      </div>
      <Input
        id={id}
        type="file"
        accept="image/*,.png,.jpg,.jpeg,.webp"
        onChange={(e) => {
          const picked = e.target.files?.[0] ?? null;
          if (picked && !picked.type.startsWith("image/") && !/\.(png|jpe?g|webp|gif)$/i.test(picked.name)) {
            toast.error("يرجى اختيار ملف صورة صالح (PNG / JPG / WebP)");
            e.target.value = "";
            onChange(null);
            return;
          }
          onChange(picked);
        }}
      />
      {preview && file && (
        <div className="flex items-center gap-3 rounded-lg border bg-background p-2.5">
          <img src={preview} alt={file.name} className="h-16 w-16 rounded object-cover border shrink-0" />
          <div className="min-w-0 flex-1 text-xs">
            <p className="truncate font-semibold">{file.name}</p>
            <p className="text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => onChange(null)}>
            إزالة
          </Button>
        </div>
      )}
    </div>
  );
}

function AuthorContractPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { t, language } = useLocale();
  const uid = user?.id;
  const BackIcon = language === "ar" ? ArrowRight : ArrowLeft;

  const { data: project, isLoading } = useQuery({
    queryKey: ["contract-manuscript", id, uid],
    enabled: !!uid && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manuscripts")
        .select("*, publishers(store_name, author_code)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: existingContract, refetch: refetchContract } = useQuery({
    queryKey: ["contract-status", id, uid],
    enabled: !!uid && !!id,
    queryFn: async () => {
      if (!uid) return null;
      try {
        const { data } = await supabase.storage.from("author-documents").download(`${uid}/contract-${id}.json`);
        if (data) {
          return JSON.parse(await data.text()) as {
            signedBy?: string;
            signature?: string;
            idNumber?: string;
            signedAt?: string;
          };
        }
      } catch {
        // Fallback to localStorage below
      }
      try {
        const cached = typeof window !== "undefined" ? window.localStorage.getItem(`unibook_contract_signed_${id}`) : null;
        return cached ? (JSON.parse(cached) as { signedBy?: string; signature?: string; idNumber?: string; signedAt?: string }) : null;
      } catch {
        return null;
      }
    },
  });

  const [signer, setSigner] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (project && !signer) {
      setSigner(project.author_name || project.publishers?.store_name || "");
    }
  }, [project, signer]);

  async function submitContract(e: React.FormEvent) {
    e.preventDefault();
    if (!uid || !project) return;
    if (!photoFile) {
      toast.error(t("يرجى إرفاق صورة شخصية 4×6", "Please attach a 4x6 personal photo"));
      return;
    }
    if (!idFrontFile) {
      toast.error(t("يرجى إرفاق صورة البطاقة / الهوية (الوجه الأمامي)", "Please attach front ID image"));
      return;
    }
    if (!idBackFile) {
      toast.error(t("يرجى إرفاق صورة البطاقة / الهوية (الوجه الخلفي)", "Please attach back ID image"));
      return;
    }
    if (!idNumber.trim()) {
      toast.error(t("يرجى إدخال رقم البطاقة الشخصية أو جواز السفر", "Please enter National ID / Passport number"));
      return;
    }
    if (!agreed) {
      toast.error(t("يرجى الموافقة على إقرار الالتزام بالعقد أولاً", "Please confirm the binding contract declaration"));
      return;
    }
    if (!signature.trim()) {
      toast.error(t("يرجى كتابة التوقيع الإلكتروني في الخانة المخصصة", "Please write your electronic signature"));
      return;
    }

    setBusy(true);
    try {
      const uploadFile = async (prefix: string, f: File) => {
        const ext = (f.name.split(".").pop()?.toLowerCase() || "jpg").replace(/[^a-z0-9]/g, "") || "jpg";
        const path = `${uid}/${prefix}-${project.id}.${ext}`;
        const { error } = await supabase.storage.from("author-documents").upload(path, f, { upsert: true });
        if (error) throw error;
        return path;
      };

      const [photoPath, idFrontPath, idBackPath] = await Promise.all([
        uploadFile("contract-photo", photoFile),
        uploadFile("contract-id-front", idFrontFile),
        uploadFile("contract-id-back", idBackFile),
      ]);

      const payload = {
        manuscriptId: project.id,
        title: project.title,
        authorName: project.author_name || project.publishers?.store_name || signer.trim(),
        authorCode: project.publishers?.author_code || "",
        signedBy: signer.trim() || project.author_name,
        signature: signature.trim(),
        idNumber: idNumber.trim(),
        declarationAccepted: true,
        photoPath,
        idFrontPath,
        idBackPath,
        durationYears: 5,
        authorDigitalShare: "70%",
        publisherDigitalShare: "30%",
        authorPrintShare: "30%",
        publisherPrintShare: "70%",
        settlement: "نهاية كل شهر",
        signedAt: new Date().toISOString(),
        status: "signed",
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const { error } = await supabase.storage
        .from("author-documents")
        .upload(`${uid}/contract-${project.id}.json`, blob, { upsert: true, contentType: "application/json" });
      if (error) throw error;

      if (typeof window !== "undefined") {
        window.localStorage.setItem(`unibook_contract_signed_${project.id}`, JSON.stringify(payload));
      }

      toast.success(t("تم توقيع العقد وإرسال المستندات للإدارة لبدء الإنتاج والنشر النهائي", "Contract signed and sent to Admin for final production"));
      await refetchContract();
      qc.invalidateQueries();
    } catch (err) {
      console.error("Contract sign error:", err);
      toast.error(t("تعذر حفظ العقد والمستندات، يرجى المحاولة مجدداً", "Could not save contract and documents. Please retry."));
    } finally {
      setBusy(false);
    }
  }

  const authorDisplayName = project?.author_name || project?.publishers?.store_name || "";
  const authorCode = project?.publishers?.author_code || "UB-AUTHOR";

  return (
    <DashboardShell role="author">
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6" dir={language === "ar" ? "rtl" : "ltr"}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate({ to: "/author" })} className="rounded-xl">
            <BackIcon className="me-1.5 h-4 w-4" />
            {t("العودة إلى استوديو المؤلف", "Back to Author Studio")}
          </Button>
          {project && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() =>
                openPrintableContract({
                  title: project.title,
                  authorName: authorDisplayName,
                  authorCode,
                  ...(existingContract || {}),
                })
              }
            >
              <Download className="me-1.5 h-4 w-4" />
              {t("استخراج / طباعة العقد (PDF)", "Export Contract (PDF)")}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">
            {t("جارٍ تحميل بيانات العقد…", "Loading contract details…")}
          </div>
        ) : !project ? (
          <div className="rounded-2xl border bg-card p-10 text-center space-y-4">
            <p className="text-muted-foreground">{t("لم يتم العثور على الكتاب المطلوب.", "Manuscript not found.")}</p>
            <Button asChild>
              <Link to="/author">{t("العودة لاستوديو المؤلف", "Return to Author Studio")}</Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border bg-card p-6 md:p-8 space-y-6 shadow-sm">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-bold mb-2">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t("عقد نشر وتوزيع ملزم قانوناً", "Legally Binding Publishing Contract")}
                </div>
                <h1 className="text-2xl font-bold text-foreground">
                  {t("عقد النشر والتوزيع الإلكتروني — دار عبيد / unibook", "Electronic Publishing & Distribution Contract — Dar Obaid / unibook")}
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("الكتاب محل التعاقد:", "Contracted Book:")} <strong className="text-foreground">{project.title}</strong> ·{" "}
                  {t("المؤلف:", "Author:")} <strong className="text-foreground">{authorDisplayName}</strong> ·{" "}
                  <span dir="ltr" className="font-mono">{authorCode}</span>
                </p>
              </div>
              {existingContract && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-3.5 py-1.5 text-xs font-bold border border-emerald-500/30">
                  <CheckCircle2 className="h-4 w-4" />
                  {t("تم التوقيع والإرسال للإدارة", "Signed & Sent to Admin")}
                </span>
              )}
            </div>

            {/* Key terms */}
            <div className="grid gap-3 sm:grid-cols-4 text-sm">
              <div className="rounded-xl border bg-muted/40 p-4">
                <p className="text-xs text-muted-foreground">{t("حصة المؤلف (رقمي)", "Author Digital Share")}</p>
                <p className="mt-1 text-2xl font-bold text-primary">70%</p>
                <p className="text-[11px] text-muted-foreground">{t("30% لدار النشر", "30% Publisher")}</p>
              </div>
              <div className="rounded-xl border bg-muted/40 p-4">
                <p className="text-xs text-muted-foreground">{t("حصة المؤلف (ورقي)", "Author Print Share")}</p>
                <p className="mt-1 text-2xl font-bold text-primary">30%</p>
                <p className="text-[11px] text-muted-foreground">{t("70% لدار النشر", "70% Publisher")}</p>
              </div>
              <div className="rounded-xl border bg-muted/40 p-4">
                <p className="text-xs text-muted-foreground">{t("مدة العقد الإلزامية", "Binding Duration")}</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">{t("5 سنوات", "5 Years")}</p>
              </div>
              <div className="rounded-xl border bg-muted/40 p-4">
                <p className="text-xs text-muted-foreground">{t("موعد التحاسب", "Settlement Cycle")}</p>
                <p className="mt-1 text-lg font-bold text-foreground">{t("نهاية كل شهر", "End of Month")}</p>
              </div>
            </div>

            {/* Strict Clauses */}
            <div className="rounded-2xl border bg-muted/20 p-5 space-y-3">
              <h2 className="text-base font-bold text-primary">
                {t("بنود العقد الصارمة والملزمة بين الطرفين:", "Strict Binding Contract Clauses:")}
              </h2>
              <ol className="space-y-3 list-decimal ps-5 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                {STRICT_CONTRACT_CLAUSES.map((clause, idx) => (
                  <li key={idx}>
                    <strong className="text-foreground">{language === "ar" ? clause.titleAr : clause.titleEn}</strong>{" "}
                    {language === "ar" ? clause.bodyAr : clause.bodyEn}
                  </li>
                ))}
              </ol>
            </div>

            {existingContract ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>{t("تم توقيع هذا العقد وإرسال جميع المستندات للإدارة بنجاح", "This contract is signed and all documents were sent to Admin")}</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 text-xs text-muted-foreground">
                  <div>{t("الموقّع:", "Signed by:")} <strong className="text-foreground">{existingContract.signedBy}</strong></div>
                  <div>{t("التوقيع الإلكتروني:", "E-Signature:")} <strong className="text-foreground">{existingContract.signature || existingContract.signedBy}</strong></div>
                  <div>{t("رقم البطاقة / الجواز:", "ID / Passport:")} <strong className="text-foreground font-mono" dir="ltr">{existingContract.idNumber}</strong></div>
                  {existingContract.signedAt && (
                    <div>{t("تاريخ التوقيع:", "Signed at:")} <strong className="text-foreground">{new Date(existingContract.signedAt).toLocaleString(language)}</strong></div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("يمكن للإدارة الآن مراجعة مستنداتك والبدء في رفع الكتاب وإنتاجه ونشره بشكل نهائي.", "Admin can now review your documents and proceed with final book production and publishing.")}
                </p>
              </div>
            ) : (
              <form onSubmit={submitContract} className="space-y-6 border-t pt-6">
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Upload className="h-5 w-5 text-primary" />
                    {t("مستندات إثبات الهوية المطلوبة للتعاقد", "Required Identity Verification Documents")}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("يرجى إرفاق الصور المطلوبة بوضوح قبل توقيع العقد وإرساله للإدارة.", "Please attach clear images of the required documents before signing.")}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <ImageUploadBox
                    id="contract-photo-4x6"
                    label={t("صورة شخصية 4×6", "Personal Photo (4x6)")}
                    hint={t("صورة شخصية حديثة مقاس 4×6", "Recent 4x6 portrait photo")}
                    file={photoFile}
                    onChange={setPhotoFile}
                    icon={UserSquare2}
                  />
                  <ImageUploadBox
                    id="contract-id-front"
                    label={t("صورة البطاقة / الهوية (أمامي)", "National ID / Identity (Front)")}
                    hint={t("الوجه الأمامي للبطاقة أو الهوية", "Front side of National ID")}
                    file={idFrontFile}
                    onChange={setIdFrontFile}
                    icon={IdCard}
                  />
                  <ImageUploadBox
                    id="contract-id-back"
                    label={t("صورة البطاقة / الهوية (خلفي)", "National ID / Identity (Back)")}
                    hint={t("الوجه الخلفي للبطاقة أو الهوية", "Back side of National ID")}
                    file={idBackFile}
                    onChange={setIdBackFile}
                    icon={IdCard}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="contract-signer-name">{t("الاسم الكامل للمؤلف", "Author Full Name")}</Label>
                    <Input
                      id="contract-signer-name"
                      required
                      className="mt-1.5"
                      value={signer}
                      onChange={(e) => setSigner(e.target.value)}
                      placeholder={t("الاسم رباعي كما بالبطاقة", "Full legal name")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contract-id-number">{t("رقم البطاقة الشخصية / جواز السفر", "National ID / Passport No.")}</Label>
                    <Input
                      id="contract-id-number"
                      dir="ltr"
                      required
                      className="mt-1.5 font-mono"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      placeholder="2900XXXXXXXXXX"
                    />
                  </div>
                </div>

                {/* Declaration Checkbox */}
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-primary rounded shrink-0"
                    />
                    <span className="text-xs sm:text-sm leading-relaxed text-foreground font-medium">
                      {t(
                        "إقرار بالالتزام التعاقدي: أقر أنا الموقع أدناه بأنني قرأت جميع بنود هذا العقد الثمانية وفهمتها فهماً تاماً، وألتزم بها التزاماً كاملاً غير مشروط طوال مدة التعاقد (5 سنوات)، وأتحمل كامل المسؤولية القانونية عن أي إخلال، كما أقر بصحة الصورة الشخصية وصورة البطاقة (الأمامية والخلفية) المرفقة.",
                        "Binding Declaration: I confirm that I have read and understood all 8 contract clauses, agree to be strictly bound by them for the full 5-year term, accept full legal liability for any breach, and certify that all attached identity photos are authentic."
                      )}
                    </span>
                  </label>
                </div>

                {/* Written Signature */}
                <div>
                  <Label htmlFor="contract-written-signature" className="flex items-center gap-1.5 font-bold">
                    <FileSignature className="h-4 w-4 text-primary" />
                    {t("خانة كتابة التوقيع الإلكتروني", "Written Electronic Signature")}
                  </Label>
                  <Input
                    id="contract-written-signature"
                    required
                    className="mt-1.5 h-12 text-base font-semibold"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder={t("اكتب توقيعك الكامل هنا للموافقة النهائية…", "Write your full signature here to approve…")}
                  />
                </div>

                <Button type="submit" size="lg" disabled={busy} className="w-full sm:w-auto rounded-xl font-bold">
                  <CheckCircle2 className="me-2 h-4 w-4" />
                  {busy
                    ? t("جارٍ رفع المستندات واعتماد العقد…", "Uploading documents & signing…")
                    : t("الموافقة وتوقيع العقد وإرساله للإدارة لبدء الإنتاج", "Approve, Sign & Send to Admin for Production")}
                </Button>
              </form>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
