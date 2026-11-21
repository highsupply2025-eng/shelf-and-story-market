import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
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
import { buildStrictContractClauses } from "@/lib/contract-clauses";
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

interface ContractIdentityInfo {
  fullName: string;
  idType: "national_id" | "passport";
  idNumber: string;
  address: string;
  phone: string;
  email: string;
  photoPath: string;
  idFrontPath?: string | undefined;
  idBackPath?: string | undefined;
  passportPath?: string | undefined;
  submittedAt: string;
}

interface ContractPriceInfo {
  singleCopyPrice: number;
  currency: string;
  totalTenCopies: number;
  setAt: string;
}

interface SignedContractData extends Partial<ContractIdentityInfo>, Partial<ContractPriceInfo> {
  signedBy?: string;
  signature?: string;
  signedAt?: string;
  status?: string;
}

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

async function getSignedStorageUrl(path?: string): Promise<string | undefined> {
  if (!path) return undefined;
  try {
    const { data } = await supabase.storage.from("author-documents").createSignedUrl(path, 3600);
    return data?.signedUrl;
  } catch {
    return undefined;
  }
}

function AuthorContractPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { session } = useAuth();
  const { t, language } = useLocale();
  const uid = session?.user.id;
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

  const { data: contractState, refetch: refetchContract } = useQuery({
    queryKey: ["contract-full-state", id, uid],
    enabled: !!uid && !!id,
    queryFn: async () => {
      if (!uid) return { info: null, price: null, signed: null, urls: {} as Record<string, string | undefined> };
      const readJson = async <T,>(path: string): Promise<T | null> => {
        try {
          const { data } = await supabase.storage.from("author-documents").download(path);
          if (data) return JSON.parse(await data.text()) as T;
        } catch {
          // ignore missing file
        }
        return null;
      };

      const [info, price, signed] = await Promise.all([
        readJson<ContractIdentityInfo>(`${uid}/contract-info-${id}.json`),
        readJson<ContractPriceInfo>(`${uid}/contract-price-${id}.json`),
        readJson<SignedContractData>(`${uid}/contract-${id}.json`),
      ]);

      const photoPath = signed?.photoPath || info?.photoPath;
      const idFrontPath = signed?.idFrontPath || info?.idFrontPath;
      const idBackPath = signed?.idBackPath || info?.idBackPath;
      const passportPath = signed?.passportPath || info?.passportPath;

      const [photoUrl, idFrontUrl, idBackUrl, passportUrl] = await Promise.all([
        getSignedStorageUrl(photoPath),
        getSignedStorageUrl(idFrontPath),
        getSignedStorageUrl(idBackPath),
        getSignedStorageUrl(passportPath),
      ]);

      return {
        info,
        price,
        signed,
        urls: { photoUrl, idFrontUrl, idBackUrl, passportUrl },
      };
    },
  });

  const infoData = contractState?.info ?? null;
  const priceData = contractState?.price ?? null;
  const signedData = contractState?.signed ?? null;
  const docUrls = contractState?.urls ?? {};

  // Step 1 form state
  const [fullName, setFullName] = useState("");
  const [idType, setIdType] = useState<"national_id" | "passport">("national_id");
  const [idNumber, setIdNumber] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(session?.user.email || "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [passportFile, setPassportFile] = useState<File | null>(null);

  // Step 3 signing state
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (project && !fullName) {
      setFullName(project.author_name || project.publishers?.store_name || "");
    }
  }, [project, fullName]);

  useEffect(() => {
    if (session?.user.email && !email) {
      setEmail(session.user.email);
    }
  }, [session?.user.email, email]);

  const reviewCompleted = Boolean(project && !["review", "revision"].includes(project.stage));

  async function submitIdentityAndContact(e: React.FormEvent) {
    e.preventDefault();
    if (!uid || !project) return;
    if (!photoFile) {
      toast.error(t("يرجى إرفاق صورة شخصية 4×6", "Please attach a 4x6 personal photo"));
      return;
    }
    if (idType === "national_id") {
      if (!idFrontFile || !idBackFile) {
        toast.error(t("يرجى إرفاق صورة البطاقة / الهوية من الوجهين (الأمامي والخلفي)", "Please attach both front and back ID images"));
        return;
      }
    } else if (!passportFile) {
      toast.error(t("يرجى إرفاق صورة جواز السفر", "Please attach passport photo"));
      return;
    }
    if (!fullName.trim() || !idNumber.trim() || !address.trim() || !phone.trim() || !email.trim()) {
      toast.error(t("يرجى استكمال كافة بيانات الاسم والهوية والعنوان ورقم التواصل والبريد", "Please complete all identity and contact fields"));
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

      const photoPath = await uploadFile("contract-photo", photoFile);
      let idFrontPath: string | undefined;
      let idBackPath: string | undefined;
      let passportPath: string | undefined;

      if (idType === "national_id") {
        [idFrontPath, idBackPath] = await Promise.all([
          uploadFile("contract-id-front", idFrontFile!),
          uploadFile("contract-id-back", idBackFile!),
        ]);
      } else {
        passportPath = await uploadFile("contract-passport", passportFile!);
      }

      const infoPayload: ContractIdentityInfo = {
        fullName: fullName.trim(),
        idType,
        idNumber: idNumber.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        photoPath,
        idFrontPath,
        idBackPath,
        passportPath,
        submittedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(infoPayload, null, 2)], { type: "application/json" });
      const { error } = await supabase.storage
        .from("author-documents")
        .upload(`${uid}/contract-info-${project.id}.json`, blob, { upsert: true, contentType: "application/json" });
      if (error) throw error;

      toast.success(
        t(
          "تم إرسال بيانات الهوية والتواصل للإدارة. سيتم تجهيز العقد وإرساله لك فور تحديد سعر النسخة.",
          "Identity & contact details sent to Admin. Your contract will be auto-prepared once Admin sets the copy price."
        )
      );
      await refetchContract();
      qc.invalidateQueries();
    } catch (err) {
      console.error("Contract info submit error:", err);
      toast.error(t("تعذر حفظ البيانات والمستندات، حاول مجدداً", "Could not save details. Please retry."));
    } finally {
      setBusy(false);
    }
  }

  async function signAutoPreparedContract(e: React.FormEvent) {
    e.preventDefault();
    if (!uid || !project || !infoData || !priceData) return;
    if (!agreed) {
      toast.error(t("يرجى الموافقة على إقرار الالتزام بهذا العقد أولاً", "Please confirm the binding contract declaration"));
      return;
    }
    if (!signature.trim()) {
      toast.error(t("يرجى كتابة توقيعك الإلكتروني في الخانة المخصصة", "Please write your electronic signature"));
      return;
    }

    setBusy(true);
    try {
      const payload: SignedContractData = {
        ...infoData,
        ...priceData,
        signedBy: infoData.fullName,
        signature: signature.trim(),
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

      toast.success(t("تم توقيع العقد وإرساله للإدارة لبدء الإنتاج والنشر النهائي", "Contract signed and sent to Admin for final production"));
      await refetchContract();
      qc.invalidateQueries();
    } catch (err) {
      console.error("Contract sign error:", err);
      toast.error(t("تعذر حفظ توقيع العقد، حاول مجدداً", "Could not save contract signature"));
    } finally {
      setBusy(false);
    }
  }

  const authorDisplayName = infoData?.fullName || project?.author_name || project?.publishers?.store_name || "";
  const authorCode = project?.publishers?.author_code || "UB-AUTHOR";
  const clauses = buildStrictContractClauses(priceData?.singleCopyPrice, priceData?.currency);

  const exportContractPdf = () => {
    if (!project) return;
    openPrintableContract({
      title: project.title,
      authorName: authorDisplayName,
      authorCode,
      signedBy: signedData?.signedBy || infoData?.fullName,
      signature: signedData?.signature,
      idNumber: signedData?.idNumber || infoData?.idNumber,
      idType: signedData?.idType || infoData?.idType,
      address: signedData?.address || infoData?.address,
      phone: signedData?.phone || infoData?.phone,
      email: signedData?.email || infoData?.email,
      singleCopyPrice: signedData?.singleCopyPrice ?? priceData?.singleCopyPrice,
      priceCurrency: signedData?.currency ?? priceData?.currency,
      signedAt: signedData?.signedAt,
      photoUrl: docUrls.photoUrl,
      idFrontUrl: docUrls.idFrontUrl,
      idBackUrl: docUrls.idBackUrl,
      passportUrl: docUrls.passportUrl,
    });
  };

  return (
    <DashboardShell role="author">
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6" dir={language === "ar" ? "rtl" : "ltr"}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate({ to: "/author" })} className="rounded-xl">
            <BackIcon className="me-1.5 h-4 w-4" />
            {t("العودة إلى استوديو المؤلف", "Back to Author Studio")}
          </Button>
          {project && (
            <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={exportContractPdf}>
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
              {signedData ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-3.5 py-1.5 text-xs font-bold border border-emerald-500/30">
                  <CheckCircle2 className="h-4 w-4" />
                  {t("تم التوقيع والإرسال للإدارة", "Signed & Sent to Admin")}
                </span>
              ) : !reviewCompleted ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 px-3.5 py-1.5 text-xs font-bold border border-amber-500/30">
                  <Clock className="h-4 w-4" />
                  {t("بانتظار انتهاء مراجعة الكتاب", "Awaiting Book Review")}
                </span>
              ) : null}
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
                <p className="text-xs text-muted-foreground">{t("طباعة 10 نسخ (على المؤلف)", "10 Printed Copies")}</p>
                <p className="mt-1 text-lg font-bold text-emerald-600">
                  {priceData ? `${priceData.totalTenCopies} ${priceData.currency}` : t("بعد التسعير", "After Pricing")}
                </p>
                <p className="text-[11px] text-muted-foreground">{t("5 دار الكتب · 3 الدار · 2 المؤلف", "5 Nat. Library · 3 Dar · 2 Author")}</p>
              </div>
              <div className="rounded-xl border bg-muted/40 p-4">
                <p className="text-xs text-muted-foreground">{t("مدة العقد / التحاسب", "Term / Settlement")}</p>
                <p className="mt-1 text-lg font-bold text-foreground">{t("5 سنوات", "5 Years")}</p>
                <p className="text-[11px] text-muted-foreground">{t("التحاسب نهاية كل شهر", "End of Month")}</p>
              </div>
            </div>

            {/* Strict Clauses */}
            <div className="rounded-2xl border bg-muted/20 p-5 space-y-3">
              <h2 className="text-base font-bold text-primary">
                {t("بنود العقد الصارمة والملزمة بين الطرفين:", "Strict Binding Contract Clauses:")}
              </h2>
              <ol className="space-y-3 list-decimal ps-5 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                {clauses.map((clause, idx) => (
                  <li key={idx}>
                    <strong className="text-foreground">{language === "ar" ? clause.titleAr : clause.titleEn}</strong>{" "}
                    {language === "ar" ? clause.bodyAr : clause.bodyEn}
                  </li>
                ))}
              </ol>
            </div>

            {/* Workflow Step Rendering */}
            {!reviewCompleted ? (
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 flex items-start gap-3">
                <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
                    {t("توقيع العقد متاح بعد الانتهاء من مراجعة الكتاب", "Contract signing opens after book review is completed")}
                  </p>
                  <p className="text-xs text-amber-800/90 dark:text-amber-200/90">
                    {t(
                      "كتابك حالياً في مرحلة المراجعة. بمجرد موافقة الإدارة على المراجعة ستُفتح لك هنا خطوة إرفاق الهوية والبيانات ثم تجهيز العقد وتوقيعه.",
                      "Your book is currently under review. Once Admin approves the review, you can submit your identity & contact details and sign the auto-prepared contract."
                    )}
                  </p>
                </div>
              </div>
            ) : !infoData ? (
              <form onSubmit={submitIdentityAndContact} className="space-y-6 border-t pt-6">
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Upload className="h-5 w-5 text-primary" />
                    {t("الخطوة 1: إرفاق الهوية والصورة الشخصية 4×6 وبيانات التواصل", "Step 1: Attach Identity, 4x6 Photo & Contact Details")}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t(
                      "بعد إرسال هذه البيانات، سيقوم الأدمن بتحديد سعر النسخة الواحدة ليتم تجهيز العقد أوتوماتيكياً متضمناً صورك وبياناتك وإرساله لك للتوقيع.",
                      "After submitting these details, Admin will set the single-copy price and the site will auto-prepare your contract with your embedded photos."
                    )}
                  </p>
                </div>

                {/* ID Type Selector */}
                <div className="space-y-2">
                  <Label className="font-bold">{t("نوع وثيقة إثبات الهوية", "Identity Document Type")}</Label>
                  <div className="flex flex-wrap gap-3">
                    <label className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm cursor-pointer ${idType === "national_id" ? "border-primary bg-primary/5 font-bold" : "bg-background"}`}>
                      <input
                        type="radio"
                        name="idType"
                        checked={idType === "national_id"}
                        onChange={() => setIdType("national_id")}
                        className="accent-primary"
                      />
                      {t("بطاقة شخصية / هوية وطنية (صورة الوجهين)", "National ID (Front & Back)")}
                    </label>
                    <label className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm cursor-pointer ${idType === "passport" ? "border-primary bg-primary/5 font-bold" : "bg-background"}`}>
                      <input
                        type="radio"
                        name="idType"
                        checked={idType === "passport"}
                        onChange={() => setIdType("passport")}
                        className="accent-primary"
                      />
                      {t("جواز سفر (صورة واحدة)", "Passport (Single Photo)")}
                    </label>
                  </div>
                </div>

                {/* Image Uploads */}
                <div className={`grid gap-4 ${idType === "national_id" ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
                  <ImageUploadBox
                    id="contract-photo-4x6"
                    label={t("صورة شخصية 4×6", "Personal Photo (4x6)")}
                    hint={t("صورة شخصية حديثة مقاس 4×6", "Recent 4x6 portrait photo")}
                    file={photoFile}
                    onChange={setPhotoFile}
                    icon={UserSquare2}
                  />
                  {idType === "national_id" ? (
                    <>
                      <ImageUploadBox
                        id="contract-id-front"
                        label={t("صورة البطاقة / الهوية (أمامي)", "National ID (Front)")}
                        hint={t("الوجه الأمامي للبطاقة", "Front side of National ID")}
                        file={idFrontFile}
                        onChange={setIdFrontFile}
                        icon={IdCard}
                      />
                      <ImageUploadBox
                        id="contract-id-back"
                        label={t("صورة البطاقة / الهوية (خلفي)", "National ID (Back)")}
                        hint={t("الوجه الخلفي للبطاقة", "Back side of National ID")}
                        file={idBackFile}
                        onChange={setIdBackFile}
                        icon={IdCard}
                      />
                    </>
                  ) : (
                    <ImageUploadBox
                      id="contract-passport-img"
                      label={t("صورة جواز السفر", "Passport Photo")}
                      hint={t("صورة واضحة لصفحة البيانات في جواز السفر", "Clear photo of passport data page")}
                      file={passportFile}
                      onChange={setPassportFile}
                      icon={IdCard}
                    />
                  )}
                </div>

                {/* Contact & Identity Inputs */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="contract-full-name">{t("الاسم الكامل للمؤلف", "Author Full Name")}</Label>
                    <Input id="contract-full-name" required className="mt-1.5" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="contract-id-num">
                      {idType === "national_id" ? t("رقم البطاقة الشخصية / الهوية", "National ID Number") : t("رقم جواز السفر", "Passport Number")}
                    </Label>
                    <Input id="contract-id-num" dir="ltr" required className="mt-1.5 font-mono" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="2900XXXXXXXXXX" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="contract-address">{t("عنوان المؤلف بالتفصيل", "Author Full Address")}</Label>
                    <Input id="contract-address" required className="mt-1.5" value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t("المحافظة - المدينة - الشارع", "City, Street, Building")} />
                  </div>
                  <div>
                    <Label htmlFor="contract-phone">{t("رقم التواصل (جوال / واتساب)", "Contact Phone / WhatsApp")}</Label>
                    <Input id="contract-phone" dir="ltr" required className="mt-1.5 font-mono" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2010XXXXXXXX" />
                  </div>
                  <div>
                    <Label htmlFor="contract-email">{t("البريد الإلكتروني للمؤلف", "Author Email")}</Label>
                    <Input id="contract-email" type="email" dir="ltr" required className="mt-1.5" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>

                <Button type="submit" size="lg" disabled={busy} className="w-full sm:w-auto rounded-xl font-bold">
                  <Upload className="me-2 h-4 w-4" />
                  {busy
                    ? t("جارٍ رفع المستندات والبيانات…", "Uploading documents & details…")
                    : t("إرسال بيانات الهوية والتواصل للإدارة لتجهيز العقد", "Submit Identity & Contact Details to Admin")}
                </Button>
              </form>
            ) : !priceData ? (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 space-y-3">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <Clock className="h-5 w-5" />
                  <span>{t("تم استلام بياناتك ومستنداتك — بانتظار وضع سعر النسخة من الإدارة", "Documents Received — Waiting for Admin Single-Copy Price")}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "بمجرد قيام الأدمن بإدخال سعر النسخة الواحدة، سيقوم الموقع بتجهيز العقد أوتوماتيكياً متضمناً صورتك الشخصية وصورة الهوية وإرساله لك هنا للتوقيع النهائي.",
                    "Once Admin enters the single-copy price, the site will auto-prepare your contract with your embedded photos for final signing."
                  )}
                </p>
                <div className="grid gap-2 sm:grid-cols-2 text-xs pt-2 border-t">
                  <div>{t("الاسم:", "Name:")} <strong>{infoData.fullName}</strong></div>
                  <div>{t("رقم الهوية/الجواز:", "ID/Passport:")} <strong className="font-mono" dir="ltr">{infoData.idNumber}</strong></div>
                  <div>{t("العنوان:", "Address:")} <strong>{infoData.address}</strong></div>
                  <div>{t("الهاتف:", "Phone:")} <strong dir="ltr">{infoData.phone}</strong></div>
                  <div>{t("البريد:", "Email:")} <strong dir="ltr">{infoData.email}</strong></div>
                </div>
              </div>
            ) : (
              /* Auto-Prepared Contract View (with embedded photos + contact details + price) */
              <div className="space-y-6 border-t pt-6">
                <div className="rounded-2xl border bg-muted/20 p-5 space-y-4">
                  <h2 className="text-base font-bold text-foreground">
                    {t("بيانات ومستندات المؤلف المدمجة في العقد", "Embedded Author Identity & Contact Details")}
                  </h2>
                  <div className="grid gap-2 sm:grid-cols-2 text-xs">
                    <div>{t("الاسم الكامل:", "Full Name:")} <strong>{infoData.fullName}</strong></div>
                    <div>{t("رقم الهوية / الجواز:", "ID / Passport:")} <strong className="font-mono" dir="ltr">{infoData.idNumber}</strong></div>
                    <div>{t("العنوان:", "Address:")} <strong>{infoData.address}</strong></div>
                    <div>{t("رقم التواصل:", "Phone:")} <strong dir="ltr">{infoData.phone}</strong></div>
                    <div>{t("البريد الإلكتروني:", "Email:")} <strong dir="ltr">{infoData.email}</strong></div>
                    <div>
                      {t("تكلفة طباعة 10 نسخ:", "10 Copies Cost:")}{" "}
                      <strong className="text-primary">
                        {priceData.singleCopyPrice} × 10 = {priceData.totalTenCopies} {priceData.currency}
                      </strong>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 pt-2">
                    {docUrls.photoUrl && (
                      <div className="text-center space-y-1">
                        <img src={docUrls.photoUrl} alt="4x6" className="h-28 w-24 rounded-lg object-cover border shadow-xs" />
                        <p className="text-[11px] text-muted-foreground">{t("صورة شخصية 4×6", "4x6 Photo")}</p>
                      </div>
                    )}
                    {docUrls.idFrontUrl && (
                      <div className="text-center space-y-1">
                        <img src={docUrls.idFrontUrl} alt="ID Front" className="h-28 w-44 rounded-lg object-cover border shadow-xs" />
                        <p className="text-[11px] text-muted-foreground">{t("البطاقة (أمامي)", "ID Front")}</p>
                      </div>
                    )}
                    {docUrls.idBackUrl && (
                      <div className="text-center space-y-1">
                        <img src={docUrls.idBackUrl} alt="ID Back" className="h-28 w-44 rounded-lg object-cover border shadow-xs" />
                        <p className="text-[11px] text-muted-foreground">{t("البطاقة (خلفي)", "ID Back")}</p>
                      </div>
                    )}
                    {docUrls.passportUrl && (
                      <div className="text-center space-y-1">
                        <img src={docUrls.passportUrl} alt="Passport" className="h-28 w-44 rounded-lg object-cover border shadow-xs" />
                        <p className="text-[11px] text-muted-foreground">{t("جواز السفر", "Passport")}</p>
                      </div>
                    )}
                  </div>
                </div>

                {signedData ? (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold">
                      <CheckCircle2 className="h-5 w-5" />
                      <span>{t("تم توقيع العقد وإرساله للإدارة بنجاح", "Contract Signed & Sent to Admin")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("التوقيع الإلكتروني:", "E-Signature:")} <strong className="text-foreground">{signedData.signature}</strong>
                      {signedData.signedAt ? ` · ${new Date(signedData.signedAt).toLocaleString(language)}` : ""}
                    </p>
                  </div>
                ) : (
                  <form onSubmit={signAutoPreparedContract} className="space-y-5">
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
                            "إقرار بالالتزام التعاقدي: أقر أنا الموقع أدناه بأنني قرأت جميع بنود هذا العقد التسعة وفهمتها فهماً تاماً، وألتزم بها التزاماً كاملاً غير مشروط طوال مدة التعاقد (5 سنوات)، بما في ذلك تحمّل طباعة 10 نسخ (5 لدار الكتب، 3 للدار، 2 للمؤلف) بالسعر المعتمد، وأقر بصحة مستنداتي المرفقة.",
                            "Binding Declaration: I confirm I have read and agree to all 9 contract clauses for the full 5-year term, including bearing the cost of 10 printed copies (5 National Library, 3 Publisher, 2 Author) at the approved price."
                          )}
                        </span>
                      </label>
                    </div>

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
                        ? t("جارٍ اعتماد التوقيع…", "Saving signature…")
                        : t("الموافقة وتوقيع العقد وإرساله للإدارة لبدء الإنتاج النهائي", "Approve, Sign & Send to Admin for Final Production")}
                    </Button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
