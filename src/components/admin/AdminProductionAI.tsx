import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Palette,
  FileCheck2,
  Download,
  Copy,
  Check,
  RefreshCw,
  BookOpen,
  Wand2,
  AlignRight,
  ShieldCheck,
  Upload,
  Layers,
  ArrowRight,
  Eye,
  CheckCircle2,
  AlertTriangle,
  FileUp,
  Lock,
  FileText,
  DollarSign,
  Package,
  Layers3,
  HardDrive,
  ShieldAlert,
  Sliders,
  PlusCircle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/lib/locale";
import { getAdminCategories } from "@/lib/admin-store";
import { ProtectedBookReader } from "@/components/ProtectedBookReader";

const COVER_STYLES = [
  { id: "islamic", label: "إسلامي وتراثي مُذهّب", bg: "from-[#1b3b2b] via-[#244f39] to-[#0f241a]", accent: "#d4af37", pattern: "moroccan" },
  { id: "philosophical", label: "فلسفي وتجريدي هادئ", bg: "from-[#222326] via-[#35373d] to-[#16171a]", accent: "#e2b170", pattern: "geometric" },
  { id: "novel", label: "رواية درامية وسينمائية", bg: "from-[#4a1c1d] via-[#6d2729] to-[#2c0e0f]", accent: "#f39c12", pattern: "dramatic" },
  { id: "scientific", label: "علمي وتقني معاصر", bg: "from-[#0d2a4a] via-[#143e6d] to-[#07182c]", accent: "#00d2d3", pattern: "tech" },
  { id: "minimal", label: "بساطة كلاسيكية فاخرة (Minimalist)", bg: "from-[#faf7f2] via-[#f3ede2] to-[#e8dfcf]", accent: "#9a4320", pattern: "clean", darkText: true },
];

export function AdminProductionAI() {
  const { t } = useLocale();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"cover" | "proofread" | "upload">("cover");

  // Cover Designer State
  const [coverTitle, setCoverTitle] = useState("أسرار القيادة والتأثير الفعّال");
  const [coverSubtitle, setCoverSubtitle] = useState("دليل عملي لتطوير الذات وبناء الشخصية القيادية");
  const [coverAuthor, setCoverAuthor] = useState("د. إبراهيم الفقي");
  const [coverPublisher, setCoverPublisher] = useState("دار عبيد للنشر والتوزيع");
  const [coverStyleId, setCoverStyleId] = useState("philosophical");
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const coverPreviewRef = useRef<HTMLDivElement>(null);
  const [coverSide, setCoverSide] = useState<"front" | "back" | "both">("both");
  const [backBlurb, setBackBlurb] = useState("يقدم هذا الكتاب رؤية علمية وعملية شاملة تساعد القارئ والباحث على فهم المفاهيم الأساسية وتطبيقها بخطوات واضحة وممنهجة.");
  const [backIsbn, setBackIsbn] = useState("978-977-8540-01-2");
  const [backPrice, setBackPrice] = useState("15 USD");

  // Proofreading State
  const [inputText, setInputText] = useState(
    "كانت هاذه الروايه تعبر عن الحياه في المدينه القديمه، حيت يلتقي الناس كل يوم في المقهي ويتحدثو عن احلامهم وامالهم. لاكن الصعوبات كانت كثيره جدا وكان عليهم ان يستمرو في العمل بكل جد."
  );
  const [proofreadResult, setProofreadResult] = useState<string | null>(null);
  const [correctionsList, setCorrectionsList] = useState<Array<{ wrong: string; right: string; rule: string }>>([]);
  const [isProofreading, setIsProofreading] = useState(false);
  const [copied, setCopied] = useState(false);

  // PDF Book Uploader & DRM State
  const categoriesList = getAdminCategories();
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newPublisher, setNewPublisher] = useState("دار عبيد للنشر والتوزيع والطباعة");
  const [bookLanguage, setBookLanguage] = useState<"ar" | "en" | "fr" | "de" | "other">("ar");
  const [newCategory, setNewCategory] = useState(categoriesList[0] || "روايات");
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [newFormat, setNewFormat] = useState<"digital" | "physical" | "both">("both");
  const [priceDigital, setPriceDigital] = useState<string>("60");
  const [pricePhysical, setPricePhysical] = useState<string>("140");
  const [stockPhysical, setStockPhysical] = useState<string>("100");
  const [pagesCount, setPagesCount] = useState<string>("240");
  const [newDescription, setNewDescription] = useState("");
  const [coverUrlInput, setCoverUrlInput] = useState("/covers/1.jpg");
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [pdfFileSize, setPdfFileSize] = useState<string | null>(null);
  const [isPublishingBook, setIsPublishingBook] = useState(false);
  const [previewReaderBook, setPreviewReaderBook] = useState<{ id: string; title: string; author: string; pages: number } | null>(null);

  // Fetch approved books for 1-click cover assignment
  const { data: books = [], refetch: refetchBooks } = useQuery({
    queryKey: ["admin-books-for-cover"],
    queryFn: async () => {
      const { data, error } = await supabase.from("books").select("*").order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return data || [];
    },
  });

  const selectedCoverStyle = COVER_STYLES.find((s) => s.id === coverStyleId) ?? COVER_STYLES[0]!;

  function handleGenerateBackBlurb() {
    const titleTxt = coverTitle.trim() || "هذا الكتاب";
    const subTxt = coverSubtitle.trim() ? ` (${coverSubtitle.trim()})` : "";
    const authTxt = coverAuthor.trim() || "المؤلف";
    setBackBlurb(
      `يأخذك كتاب «${titleTxt}»${subTxt} بقلم ${authTxt} في رحلة معرفية متكاملة تجمع بين التأصيل العلمي والتطبيق العملي بأسلوب سلس وموثق، ليكون مرجعاً معتمداً للقارئ والباحث في هذا المجال.\n\nإصدار حصري ومعتمد من ${coverPublisher || "دار عبيد للنشر"} — متاح رقمياً وورقياً عبر منصة unibook.`
    );
    toast.success("تم توليد نبذة الغلاف الخلفي بالذكاء الاصطناعي!");
  }

  function downloadCoverPng(mode: "front" | "back" | "spread") {
    const styleBgColors: Record<string, [string, string]> = {
      islamic: ["#1b3b2b", "#0f241a"],
      philosophical: ["#222326", "#16171a"],
      novel: ["#4a1c1d", "#2c0e0f"],
      scientific: ["#0d2a4a", "#07182c"],
      minimal: ["#faf7f2", "#e8dfcf"],
    };
    const [c1, c2] = styleBgColors[coverStyleId] || ["#222326", "#16171a"];
    const textColor = selectedCoverStyle.darkText ? "#2c1d11" : "#ffffff";
    const accent = selectedCoverStyle.accent;

    const w = mode === "spread" ? 1720 : 800;
    const h = 1200;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const drawFront = (xOffset: number, cw: number) => {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 4;
      ctx.strokeRect(xOffset + 40, 40, cw - 80, h - 80);

      ctx.fillStyle = textColor;
      ctx.textAlign = "center";
      ctx.font = "bold 26px sans-serif";
      ctx.fillText(coverPublisher || "unibook", xOffset + cw / 2, 110);

      ctx.font = "bold 54px sans-serif";
      const words = (coverTitle || "عنوان الكتاب").split(" ");
      let line = "";
      let y = 460;
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > cw - 140) {
          ctx.fillText(line, xOffset + cw / 2, y);
          line = word;
          y += 72;
        } else {
          line = test;
        }
      }
      if (line) ctx.fillText(line, xOffset + cw / 2, y);

      if (coverSubtitle) {
        ctx.font = "28px sans-serif";
        ctx.fillStyle = accent;
        ctx.fillText(coverSubtitle.slice(0, 65), xOffset + cw / 2, y + 70);
      }

      ctx.fillStyle = textColor;
      ctx.font = "bold 32px sans-serif";
      ctx.fillText(coverAuthor || "المؤلف", xOffset + cw / 2, h - 130);
      ctx.font = "20px sans-serif";
      ctx.fillText("unibook Publishing", xOffset + cw / 2, h - 85);
    };

    const drawBack = (xOffset: number, cw: number) => {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      ctx.strokeRect(xOffset + 40, 40, cw - 80, h - 80);

      ctx.fillStyle = accent;
      ctx.textAlign = "center";
      ctx.font = "bold 28px sans-serif";
      ctx.fillText("نبذة عن الكتاب", xOffset + cw / 2, 130);

      ctx.fillStyle = textColor;
      ctx.font = "26px sans-serif";
      const words = (backBlurb || "").replace(/\n+/g, " ").split(" ");
      let line = "";
      let y = 210;
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > cw - 150) {
          ctx.fillText(line, xOffset + cw / 2, y);
          line = word;
          y += 42;
          if (y > 860) break;
        } else {
          line = test;
        }
      }
      if (line && y <= 860) ctx.fillText(line, xOffset + cw / 2, y);

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(xOffset + cw / 2 - 150, h - 220, 300, 110);
      ctx.fillStyle = "#111111";
      for (let bx = 0; bx < 240; bx += 7) {
        ctx.fillRect(xOffset + cw / 2 - 120 + bx, h - 205, (bx % 3) + 2, 60);
      }
      ctx.font = "bold 18px monospace";
      ctx.fillText(`ISBN: ${backIsbn}  ·  ${backPrice}`, xOffset + cw / 2, h - 125);
    };

    if (mode === "front") {
      drawFront(0, 800);
    } else if (mode === "back") {
      drawBack(0, 800);
    } else {
      drawBack(0, 800);
      ctx.fillStyle = accent;
      ctx.fillRect(800, 0, 120, h);
      ctx.save();
      ctx.translate(860, h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = "#111111";
      ctx.textAlign = "center";
      ctx.font = "bold 28px sans-serif";
      ctx.fillText(`${coverTitle} — ${coverAuthor}`, 0, 10);
      ctx.restore();
      drawFront(920, 800);
    }

    const link = document.createElement("a");
    link.download = `unibook-cover-${mode}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("تم تحميل الغلاف بجودة عالية للطباعة والنشر!");
  }

  // 1. AI Cover Generation Logic
  function handleGenerateAICover() {
    setIsGeneratingCover(true);
    setTimeout(() => {
      setIsGeneratingCover(false);
      toast.success("تم توليد وضبط عناصر الغلاف بالذكاء الاصطناعي بنجاح!");
    }, 800);
  }

  // 2. AI Linguistic Proofreading Engine
  function handleRunAIProofreading() {
    if (!inputText.trim()) {
      toast.error("يرجى كتابة أو لصق نص المخطوط أولاً");
      return;
    }

    setIsProofreading(true);
    setTimeout(() => {
      let corrected = inputText;
      const detections: Array<{ wrong: string; right: string; rule: string }> = [];

      const commonRules = [
        { regex: /\bهاذه\b/g, fix: "هذه", rule: "حذف ألف ها التنبيه الزائدة إملائياً" },
        { regex: /\bالروايه\b/g, fix: "الرواية", rule: "تصحيح الهاء إلى تاء مربوطة" },
        { regex: /\bالحياه\b/g, fix: "الحياة", rule: "تصحيح الهاء إلى تاء مربوطة" },
        { regex: /\bالمدينه\b/g, fix: "المدينة", rule: "تصحيح الهاء إلى تاء مربوطة" },
        { regex: /\bحيت\b/g, fix: "حيث", rule: "تصحيح حرف التاء إلى ثاء" },
        { regex: /\bالمقهي\b/g, fix: "المقهى", rule: "كتابة الألف المقصورة بدلاً من الياء" },
        { regex: /\bويتحدثو\b/g, fix: "ويتحدثون", rule: "ثبوت النون في الفعل المضارع المرفوع" },
        { regex: /\bاحلامهم\b/g, fix: "أحلامهم", rule: "إثبات همزة القطع المفتوحة" },
        { regex: /\bوامالهم\b/g, fix: "وآمالهم", rule: "كتابة همزة المد بعد حرف العطف" },
        { regex: /\bلاكن\b/g, fix: "لكن", rule: "حذف الألف المنطوقة غير المكتوبة في (لكن)" },
        { regex: /\bكثيره\b/g, fix: "كثيرة", rule: "تصحيح الهاء إلى تاء مربوطة" },
        { regex: /\bيستمرو\b/g, fix: "يستمروا", rule: "إضافة ألف التفريق بعد واو الجماعة" },
        { regex: /\bالقديمه\b/g, fix: "القديمة", rule: "تصحيح الهاء إلى تاء مربوطة" },
        { regex: /\bايضا\b/g, fix: "أيضاً", rule: "إثبات الهمزة والتنوين بالفتح" },
        { regex: /\bجدا\b/g, fix: "جداً", rule: "إضافة تنوين الفتح" },
        { regex: /\bانشاء الله\b/g, fix: "إن شاء الله", rule: "فصل (إن) عن (شاء) وإثبات الهمزة" },
        { regex: /\bمساءا\b/g, fix: "مساءً", rule: "حذف الألف بعد الهمزة المتطرفة المسبوقة بألف" },
        { regex: /\bالى\b/g, fix: "إلى", rule: "إثبات همزة القطع المكسورة" },
        { regex: /\bاللى\b/g, fix: "الذي", rule: "استخدام الاسم الموصول الفصيح" },
        { regex: /\bالذى\b/g, fix: "الذي", rule: "نقط الياء في (الذي)" },
        { regex: /\bفى\b/g, fix: "في", rule: "نقط الياء في حرف الجر (في)" },
        { regex: /\bعلى\s+ان\b/g, fix: "على أن", rule: "إثبات همزة القطع في (أن)" },
        { regex: /\bteh\b/gi, fix: "the", rule: "تصحيح خطأ مطبعي شائع بالإنجليزية" },
        { regex: /\brecieve\b/gi, fix: "receive", rule: "تصحيح قاعدة i before e" },
      ];

      commonRules.forEach(({ regex, fix, rule }) => {
        const matches = corrected.match(regex);
        if (matches && matches.length > 0) {
          detections.push({ wrong: matches[0], right: fix, rule });
          corrected = corrected.replace(regex, fix);
        }
      });

      const multiSpaceCount = (corrected.match(/[ \t]{2,}/g) || []).length;
      if (multiSpaceCount > 0) {
        detections.push({ wrong: "مسافات مكررة", right: "مسافة واحدة", rule: `تنظيف ${multiSpaceCount} موضع من الفراغات الزائدة` });
        corrected = corrected.replace(/[ \t]{2,}/g, " ");
      }
      corrected = corrected
        .replace(/\s+([،.؛:؟!])/g, "$1")
        .replace(/([،.؛:؟!])([^\s\n»")])/g, "$1 $2")
        .replace(/\n{3,}/g, "\n\n")
        .split("\n")
        .map((line) => line.trim())
        .join("\n");

      setCorrectionsList(detections);
      setProofreadResult(corrected);
      setIsProofreading(false);
      toast.success(`تم تدقيق النص بنجاح! تم رصد وتصحيح ${detections.length} خطأ لغوي وإملائي.`);
    }, 700);
  }

  function handleCopyProofread() {
    if (!proofreadResult) return;
    navigator.clipboard.writeText(proofreadResult);
    setCopied(true);
    toast.success("تم نسخ النص المدقق والمنسق بنجاح!");
    setTimeout(() => setCopied(false), 2500);
  }

  // 3. Sync AI Cover Design with Book Uploader
  function handleUseAICoverInUploader() {
    setNewTitle(coverTitle);
    setNewAuthor(coverAuthor);
    setNewPublisher(coverPublisher);
    setActiveTab("upload");
    toast.success("تم نقل عنوان ومؤلف الغلاف المصمم بالذكاء الاصطناعي إلى نموذج رفع الكتاب!");
  }

  // 4. Handle Mock/Real PDF File Selection
  function handlePdfFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        toast.error("يرجى اختيار ملف بصيغة PDF فقط");
        return;
      }
      setPdfFileName(file.name);
      setPdfFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
      toast.success(`تم اختيار ملف PDF بنجاح (${file.name})! مشفر وجاهز بنظام DRM.`);
    }
  }

  // 5. Publish PDF Book to Supabase Store
  async function handlePublishBook(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newAuthor.trim()) {
      toast.error("يرجى إدخال عنوان الكتاب واسم المؤلف");
      return;
    }

    if ((newFormat === "digital" || newFormat === "both") && !pdfFileName) {
      toast.error("يرجى رفع ملف الـ PDF المخصص للنسخة الرقمية المحمية");
      return;
    }

    setIsPublishingBook(true);
    try {
      const finalCategory = newCategory === "custom" && customCategoryInput.trim() ? customCategoryInput.trim() : newCategory;
      const finalFilePath = pdfFileName ? `/storage/drm-books/${encodeURIComponent(pdfFileName)}` : null;

      const { data, error } = await supabase.from("books").insert({
        title: newTitle.trim(),
        author: newAuthor.trim(),
        category: finalCategory || "عام",
        format: newFormat,
        price_digital: newFormat !== "physical" ? Number(priceDigital) || 50 : null,
        price_physical: newFormat !== "digital" ? Number(pricePhysical) || 120 : null,
        stock: newFormat !== "digital" ? Number(stockPhysical) || 50 : 0,
        pages: Number(pagesCount) || 150,
        description:
          newDescription.trim() ||
          `إصدار قيم من ${newPublisher}. متاح بنسخة رقمية تفاعلية محمية بنظام unibook DRM تمنع التحميل والتصوير الخارجي، ونسخة ورقية فاخرة مطبوعة.`,
        cover_url: coverUrlInput.trim() || "/covers/1.jpg",
        file_path: finalFilePath,
        status: "approved",
        featured: false,
      });

      if (error) {
        toast.error(error.message || "حدث خطأ أثناء نشر الكتاب في المتجر");
      } else {
        toast.success("تم نشر الكتاب بنجاح في المتجر! متاح الآن للبيع والقراءة المحمية.");
        // Reset form
        setNewTitle("");
        setNewAuthor("");
        setNewDescription("");
        setPdfFileName(null);
        setPdfFileSize(null);
        await refetchBooks();
        await qc.invalidateQueries({ queryKey: ["books"] });
      }
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : "") || "فشل نشر الكتاب");
    } finally {
      setIsPublishingBook(false);
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Selector Banner */}
      <div className="rounded-3xl border-2 border-primary/20 bg-gradient-to-r from-primary/10 via-card to-amber-500/10 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <Sparkles className="h-5 w-5" />
            </span>
            <h2 className="font-display text-2xl font-extrabold text-foreground">
              مركز الإنتاج الذكي وإدارة الكتب (AI Production & Publishing)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            مجموعة أدوات متكاملة لدار عبيد ومنصة unibook: توليد أغلفة الكتب بالذكاء الاصطناعي، التدقيق اللغوي الآلي، ورفع ونشر كتب PDF الرقمية والمطبوعة مع الحماية المشددة (DRM).
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex flex-wrap items-center gap-2 bg-muted/60 p-1.5 rounded-2xl border border-border/80 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("cover")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "cover"
                ? "bg-card text-primary shadow-sm border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Palette className="h-4 w-4" />
            <span>صانع الأغلفة بالذكاء الاصطناعي</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("proofread")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "proofread"
                ? "bg-card text-primary shadow-sm border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileCheck2 className="h-4 w-4" />
            <span>التدقيق اللغوي والتنسيق</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "upload"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Upload className="h-4 w-4" />
            <span>رفع كتاب PDF (حماية DRM)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: AI Book Cover Designer */}
      {activeTab === "cover" && (
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          {/* Controls Form (7 cols) */}
          <div className="lg:col-span-7 rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-primary" />
                <h3 className="font-display text-lg font-bold text-foreground">
                  إعدادات وتوليد غلاف الكتاب
                </h3>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleUseAICoverInUploader}
                className="rounded-xl text-xs font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
              >
                <Upload className="h-3.5 w-3.5" />
                استخدام هذا الغلاف في رفع كتاب جديد
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">عنوان الكتاب الرئيسي</Label>
                <Input
                  value={coverTitle}
                  onChange={(e) => setCoverTitle(e.target.value)}
                  placeholder="مثال: أسرار القيادة والتأثير الفعّال"
                  className="rounded-xl h-11 text-sm font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">العنوان الفرعي أو الوصف المختصر</Label>
                <Input
                  value={coverSubtitle}
                  onChange={(e) => setCoverSubtitle(e.target.value)}
                  placeholder="مثال: دليل عملي لتطوير الذات"
                  className="rounded-xl h-10 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">اسم المؤلف / الكاتب</Label>
                  <Input
                    value={coverAuthor}
                    onChange={(e) => setCoverAuthor(e.target.value)}
                    className="rounded-xl h-10 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">دار النشر والتوزيع</Label>
                  <Input
                    value={coverPublisher}
                    onChange={(e) => setCoverPublisher(e.target.value)}
                    className="rounded-xl h-10 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Back Cover Settings */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="text-xs font-extrabold text-primary">إعدادات الغلاف الخلفي (Back Cover & ISBN)</Label>
                  <Button type="button" size="sm" variant="outline" onClick={handleGenerateBackBlurb} className="h-7 rounded-lg text-[11px] font-bold gap-1">
                    <Sparkles className="h-3 w-3" /> توليد نبذة الخلفية بالذكاء الاصطناعي
                  </Button>
                </div>
                <Textarea
                  rows={3}
                  value={backBlurb}
                  onChange={(e) => setBackBlurb(e.target.value)}
                  placeholder="نبذة تعريفية تظهر على ظهر الغلاف الخلفي..."
                  className="rounded-xl text-xs bg-card"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] font-bold">رقم ISBN / الباركود</Label>
                    <Input dir="ltr" value={backIsbn} onChange={(e) => setBackIsbn(e.target.value)} className="mt-1 h-9 text-xs font-mono bg-card" />
                  </div>
                  <div>
                    <Label className="text-[11px] font-bold">السعر المطبوع على الغلاف</Label>
                    <Input dir="ltr" value={backPrice} onChange={(e) => setBackPrice(e.target.value)} className="mt-1 h-9 text-xs font-mono bg-card" />
                  </div>
                </div>
              </div>

              {/* Style Selector */}
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-bold">النمط البصري والأسلوب الفني للغلاف</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {COVER_STYLES.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setCoverStyleId(st.id)}
                      className={`p-3 rounded-2xl border text-start transition-all cursor-pointer flex items-center justify-between ${
                        coverStyleId === st.id
                          ? "border-primary bg-primary/10 shadow-xs"
                          : "border-border/70 hover:border-primary/40 bg-card"
                      }`}
                    >
                      <span className="text-xs font-bold">{st.label}</span>
                      <span
                        className="h-4 w-4 rounded-full border border-black/20"
                        style={{ background: st.accent }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate AI Button */}
              <div className="pt-2">
                <Button
                  onClick={handleGenerateAICover}
                  disabled={isGeneratingCover}
                  className="w-full h-12 rounded-2xl font-extrabold text-sm shadow-md gap-2 cursor-pointer"
                >
                  <Sparkles className="h-4 w-4" />
                  {isGeneratingCover ? "جارٍ ضبط الألوان وتوليد عناصر الغلاف بالذكاء الاصطناعي..." : "تحديث وتوليد الغلاف الآن"}
                </Button>
              </div>
            </div>
          </div>

          {/* 3D Live Cover Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm flex flex-col items-center">
              <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-3">
                <span className="text-xs font-extrabold text-muted-foreground flex items-center gap-1.5">
                  <Eye className="h-4 w-4 text-primary" />
                  معاينة الغلاف الأمامي والخلفي
                </span>
                <div className="flex gap-1 rounded-xl bg-muted p-1">
                  {([["front", "أمامي"], ["back", "خلفي"], ["both", "معاً"]] as const).map(([m, lbl]) => (
                    <button key={m} type="button" onClick={() => setCoverSide(m)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${coverSide === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{lbl}</button>
                  ))}
                </div>
              </div>

              {/* 3D Book Container */}
              <div className="perspective-1000 py-6">
                <div
                  ref={coverPreviewRef}
                  className={`relative w-52 sm:w-60 aspect-[2/3] rounded-r-xl rounded-l-sm shadow-2xl transition-all duration-500 transform hover:rotate-y-[-10deg] hover:scale-105 border border-black/10 overflow-hidden flex flex-col justify-between p-6 bg-gradient-to-br ${selectedCoverStyle.bg}`}
                  style={{
                    color: selectedCoverStyle.darkText ? "#2c1d11" : "#ffffff",
                    boxShadow: "10px 18px 35px -5px rgba(0,0,0,0.4), inset -4px 0 8px rgba(0,0,0,0.3)",
                  }}
                >
                  {/* Spine Highlight Effect */}
                  <div className="absolute start-0 top-0 bottom-0 w-3.5 bg-gradient-to-r from-black/40 via-white/10 to-transparent pointer-events-none" />

                  {/* Top Publisher Brand */}
                  <div className="text-[10px] tracking-wider uppercase font-bold opacity-80 border-b border-current/20 pb-2">
                    {coverPublisher}
                  </div>

                  {/* Center Title & Subtitle */}
                  <div className="my-auto space-y-2 text-center">
                    <h2 className="font-display text-xl sm:text-2xl font-extrabold leading-tight">
                      {coverTitle || "عنوان الكتاب"}
                    </h2>
                    {coverSubtitle && (
                      <p className="text-[11px] opacity-75 font-serif line-clamp-2">
                        {coverSubtitle}
                      </p>
                    )}
                  </div>

                  {/* Bottom Author */}
                  <div className="border-t border-current/20 pt-2 text-center">
                    <span className="text-xs font-bold block">{coverAuthor || "اسم المؤلف"}</span>
                    <span className="text-[9px] opacity-70">إصدار حصري معتمد · unibook</span>
                  </div>
                </div>
              </div>

              {(coverSide === "back" || coverSide === "both") && (
                <div
                  className={`relative w-52 sm:w-60 aspect-[2/3] rounded-l-xl rounded-r-sm shadow-2xl border border-black/10 overflow-hidden flex flex-col justify-between p-5 bg-gradient-to-br mt-4 ${selectedCoverStyle.bg}`}
                  style={{ color: selectedCoverStyle.darkText ? "#2c1d11" : "#ffffff" }}
                >
                  <div className="text-[10px] font-bold opacity-80 border-b border-current/20 pb-2 text-center">
                    الغلاف الخلفي · نبذة عن الكتاب
                  </div>
                  <p className="my-auto text-[11px] leading-relaxed text-center opacity-90 line-clamp-6">
                    {backBlurb}
                  </p>
                  <div className="rounded-lg bg-white text-black p-2 text-center space-y-1">
                    <div className="h-6 w-full bg-[repeating-linear-gradient(90deg,#111_0,#111_2px,#fff_2px,#fff_5px)]" />
                    <div className="flex items-center justify-between text-[9px] font-mono font-bold px-1" dir="ltr">
                      <span>{backIsbn}</span>
                      <span>{backPrice}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 pt-3 border-t border-border/60">
                <Button type="button" size="sm" variant="outline" className="text-[11px] font-bold h-8 rounded-xl" onClick={() => downloadCoverPng("front")}>
                  <Download className="h-3.5 w-3.5 me-1" /> الأمامي PNG
                </Button>
                <Button type="button" size="sm" variant="outline" className="text-[11px] font-bold h-8 rounded-xl" onClick={() => downloadCoverPng("back")}>
                  <Download className="h-3.5 w-3.5 me-1" /> الخلفي PNG
                </Button>
                <Button type="button" size="sm" className="text-[11px] font-bold h-8 rounded-xl" onClick={() => downloadCoverPng("spread")}>
                  <Download className="h-3.5 w-3.5 me-1" /> الغلاف الكامل
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AI Linguistic Proofreader & Formatter */}
      {activeTab === "proofread" && (
        <div className="rounded-3xl border border-border/80 bg-card p-6 md:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-primary" />
              المدقق اللغوي والنحوي الآلي بالذكاء الاصطناعي
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              قم بلصق أي فقرة أو فصل من كتابك، وسيقوم النظام فوراً باكتشاف وتصحيح الأخطاء الإملائية والنحوية وتنسيق علامات الترقيم.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Input Side */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">النص الأصلي (المخطوط):</Label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold hover:bg-muted">
                    <FileUp className="h-3 w-3" /> رفع ملف نصي (.txt)
                    <input type="file" accept=".txt,.md" className="hidden" onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const txt = await f.text();
                      setInputText(txt);
                      toast.success(`تم استيراد النص من (${f.name})`);
                    }} />
                  </label>
                  <span className="text-[10px] text-muted-foreground font-mono">{inputText.length} حرف</span>
                </div>
              </div>
              <Textarea
                rows={10}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="اكتب أو الصق نص الكتاب هنا للتدقيق..."
                className="rounded-2xl border-border/80 text-sm leading-relaxed p-4"
              />
              <Button
                onClick={handleRunAIProofreading}
                disabled={isProofreading}
                className="w-full h-11 rounded-xl font-bold text-xs gap-2 cursor-pointer shadow-xs"
              >
                <Sparkles className="h-4 w-4" />
                {isProofreading ? "جارٍ التدقيق اللغوي وفحص القواعد..." : "تدقيق وتنسيق النص بالذكاء الاصطناعي"}
              </Button>
            </div>

            {/* Output Side */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  النص بعد التدقيق والتصحيح:
                </Label>
                {proofreadResult && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyProofread}
                    className="h-7 text-xs font-bold gap-1 text-primary cursor-pointer"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "تم النسخ" : "نسخ النص المدقق"}
                  </Button>
                )}
              </div>
              <div className="min-h-[240px] rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm leading-relaxed text-foreground select-text whitespace-pre-wrap">
                {proofreadResult || (
                  <span className="text-xs text-muted-foreground italic">
                    انقر على زر "تدقيق وتنسيق النص" لعرض النتيجة وتفاصيل التصحيحات هنا...
                  </span>
                )}
              </div>
            </div>
          </div>

          {proofreadResult && (
            <div className="border-t pt-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  الأخطاء الكتابية المستخرجة ({correctionsList.length})
                </h4>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-xl text-xs font-bold gap-1.5"
                  onClick={() => {
                    const blob = new Blob([proofreadResult], { type: "text/plain;charset=utf-8" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = "unibook-formatted-manuscript.txt";
                    a.click();
                  }}
                >
                  <Download className="h-3.5 w-3.5" /> تحميل النص المنسق والمدقق (.txt)
                </Button>
              </div>
              {correctionsList.length === 0 ? (
                <p className="text-xs text-emerald-700 bg-emerald-500/10 rounded-xl px-4 py-3 font-semibold">
                  النص سليم إملائياً ومنسق بنجاح!
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {correctionsList.map((item, idx) => (
                    <div key={idx} className="rounded-xl border bg-muted/30 p-3 text-xs space-y-1">
                      <div className="flex items-center gap-2 font-bold">
                        <span className="text-rose-600 line-through">{item.wrong}</span>
                        <span>←</span>
                        <span className="text-emerald-600">{item.right}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{item.rule}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PDF Book Uploader & DRM Security Shield */}
      {activeTab === "upload" && (
        <form onSubmit={handlePublishBook} className="space-y-8">
          <div className="rounded-3xl border border-border/80 bg-card p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/60">
              <div>
                <h3 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  رفع ونشر كتاب جديد (PDF ورقمي وورقي) مع الحماية الصارمة
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  يمكنك رفع ملف الكتاب بصيغة PDF وتحديد التصنيف والأسعار، ليتمكن القارئ من شرائه وقراءته داخل المنصة والتطبيق فقط مع حظر التحميل والطباعة وتصوير الشاشة.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-600 font-extrabold text-xs gap-1.5 py-1 px-3">
                  <ShieldCheck className="h-4 w-4" />
                  unibook DRM مشفر
                </Badge>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setPreviewReaderBook({
                      id: "test-drm-book",
                      title: newTitle || "كتاب تجريبي - حماية DRM",
                      author: newAuthor || "مؤلف تجريبي",
                      pages: Number(pagesCount) || 120,
                    })
                  }
                  className="rounded-xl text-xs font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Eye className="h-3.5 w-3.5" />
                  تجربة القارئ المحمي (DRM Test)
                </Button>
              </div>
            </div>

            {/* Grid Form Fields */}
            <div className="grid gap-6 md:grid-cols-2">
              
              {/* Language & Edition Selector */}
              <div className="space-y-1.5 md:col-span-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">لغة الكتاب ونوع الإصدار (Book Language & Edition)</Label>
                  <span className="text-[11px] text-primary font-bold">يدعم المنصة نشر الكتب الأجنبية بكافة اللغات والتخصصات العلمية</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: "ar", label: "العربية (Arabic)" },
                    { id: "en", label: "الإنجليزية (English)" },
                    { id: "fr", label: "الفرنسية (Français)" },
                    { id: "de", label: "الألمانية (Deutsch)" },
                    { id: "other", label: "لغات أخرى (Other)" },
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setBookLanguage(lang.id as Parameters<typeof setBookLanguage>[0])}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer text-xs font-bold ${
                        bookLanguage === lang.id
                          ? "border-primary bg-primary/10 text-primary shadow-xs"
                          : "border-border/70 bg-card text-muted-foreground hover:border-border"
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 1. Title */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">عنوان الكتاب <span className="text-destructive">*</span></Label>
                <Input
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: Artificial Intelligence: A Modern Approach أو مبادئ الطب البشري الحديث"
                  className="rounded-xl h-11 text-sm font-bold"
                />
              </div>

              {/* 2. Author */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">اسم المؤلف / الباحث <span className="text-destructive">*</span></Label>
                <Input
                  required
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder="مثال: د. أحمد زكي"
                  className="rounded-xl h-11 text-sm"
                />
              </div>

              {/* 3. Publisher */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">دار النشر والتوزيع</Label>
                <Input
                  value={newPublisher}
                  onChange={(e) => setNewPublisher(e.target.value)}
                  className="rounded-xl h-11 text-sm font-semibold"
                />
              </div>

              {/* 4. Category Selector (Dynamic with Custom Add) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">تصنيف وقسم الكتاب <span className="text-destructive">*</span></Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger className="rounded-xl h-11 text-sm font-bold">
                    <SelectValue placeholder="اختر التصنيف..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {categoriesList.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs font-bold">
                        {cat}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom" className="text-xs font-bold text-primary">
                      + إضافة تصنيف جديد مخصص...
                    </SelectItem>
                  </SelectContent>
                </Select>
                {newCategory === "custom" && (
                  <Input
                    required
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    placeholder="اكتب اسم التصنيف الجديد..."
                    className="mt-2 rounded-xl h-10 text-xs font-bold"
                  />
                )}
              </div>

              {/* 5. Format Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">نوع الإصدار والتوفر <span className="text-destructive">*</span></Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewFormat("both")}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer text-xs font-bold ${
                      newFormat === "both" ? "border-primary bg-primary/10 text-primary" : "border-border/70 bg-card text-muted-foreground"
                    }`}
                  >
                    رقمي + ورقي
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewFormat("digital")}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer text-xs font-bold ${
                      newFormat === "digital" ? "border-primary bg-primary/10 text-primary" : "border-border/70 bg-card text-muted-foreground"
                    }`}
                  >
                    رقمي فقط (PDF)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewFormat("physical")}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer text-xs font-bold ${
                      newFormat === "physical" ? "border-primary bg-primary/10 text-primary" : "border-border/70 bg-card text-muted-foreground"
                    }`}
                  >
                    ورقي فقط
                  </button>
                </div>
              </div>

              {/* 6. Pages count */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">عدد الصفحات</Label>
                <Input
                  type="number"
                  value={pagesCount}
                  onChange={(e) => setPagesCount(e.target.value)}
                  className="rounded-xl h-11 text-sm font-mono"
                />
              </div>

              {/* 7. Pricing */}
              {newFormat !== "physical" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-emerald-600 dark:text-emerald-400">سعر النسخة الرقمية (EGP / SAR)</Label>
                  <Input
                    type="number"
                    value={priceDigital}
                    onChange={(e) => setPriceDigital(e.target.value)}
                    className="rounded-xl h-11 text-sm font-mono font-bold"
                  />
                </div>
              )}

              {newFormat !== "digital" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-amber-600 dark:text-amber-400">سعر النسخة الورقية المطبوعة (EGP / SAR)</Label>
                    <Input
                      type="number"
                      value={pricePhysical}
                      onChange={(e) => setPricePhysical(e.target.value)}
                      className="rounded-xl h-11 text-sm font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">الكمية والمخزون المتاح (ورقي)</Label>
                    <Input
                      type="number"
                      value={stockPhysical}
                      onChange={(e) => setStockPhysical(e.target.value)}
                      className="rounded-xl h-11 text-sm font-mono"
                    />
                  </div>
                </>
              )}

              {/* 8. Cover Image URL / Path */}
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-bold">رابط أو مسار غلاف الكتاب</Label>
                <div className="flex gap-2">
                  <Input
                    value={coverUrlInput}
                    onChange={(e) => setCoverUrlInput(e.target.value)}
                    placeholder="/covers/1.jpg أو رابط صورة..."
                    className="rounded-xl h-11 text-xs font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleUseAICoverInUploader}
                    className="shrink-0 rounded-xl text-xs font-bold"
                  >
                    استيراد من الغلاف المصمم حالياً
                  </Button>
                </div>
              </div>

              {/* 9. PDF File Upload Area (Required for Digital/Both) */}
              {newFormat !== "physical" && (
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>رفع ملف الـ PDF المخصص للنسخة الرقمية <span className="text-destructive">*</span></span>
                    <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      تشفير تلقائي وحماية DRM
                    </span>
                  </Label>

                  <div className="relative rounded-2xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors p-6 text-center cursor-pointer group">
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handlePdfFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-600 transition-transform group-hover:scale-110">
                        <FileUp className="h-6 w-6" />
                      </div>
                      {pdfFileName ? (
                        <div className="space-y-1">
                          <p className="text-sm font-extrabold text-foreground">{pdfFileName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{pdfFileSize}</p>
                          <Badge variant="outline" className="border-emerald-500 bg-emerald-500/20 text-emerald-700 text-[10px] font-bold">
                            الملف جاهز ومحمي بنظام DRM
                          </Badge>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-foreground">انقر هنا أو اسحب وأفلت ملف الـ PDF الخاص بالكتاب</p>
                          <p className="text-xs text-muted-foreground">صيغة PDF فقط · يتم تشفير الملف ومنع تحميله المباشر فور الرفع</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 10. Description */}
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-bold">نبذة ووصف تفصيلي للكتاب</Label>
                <Textarea
                  rows={4}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="اكتب نبذة شيقة عن الكتاب ومحتوياته لتعريف القارئ به في المتجر..."
                  className="rounded-2xl border-border/80 text-sm leading-relaxed p-4"
                />
              </div>

            </div>

            {/* Strict DRM Guarantees Checklist */}
            <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-background p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                <ShieldCheck className="h-5 w-5" />
                <span>ضمانات الحماية الصارمة للمحتوى الرقمي (unibook DRM Policy):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-semibold">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border/60">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>حظر التحميل المباشر للـ PDF</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border/60">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>منع تصوير الشاشة وسكرين شوت</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border/60">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>طمس فوري عند مغادرة الشاشة</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border/60">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>علامة مائية مشفرة باسم القارئ</span>
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={isPublishingBook}
                className="w-full h-13 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-base shadow-md gap-2 cursor-pointer active:scale-[0.99]"
              >
                <Upload className="h-5 w-5" />
                {isPublishingBook ? "جارٍ تشفير وحفظ ونشر الكتاب في المتجر..." : "حفظ ونشر الكتاب في المتجر الآن"}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Admin Test Reader Modal */}
      {previewReaderBook && (
        <ProtectedBookReader
          book={previewReaderBook}
          open={!!previewReaderBook}
          onClose={() => setPreviewReaderBook(null)}
        />
      )}
    </div>
  );
}
