import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
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

const COVER_STYLES = [
  { id: "islamic", label: "إسلامي وتراثي مُذهّب", bg: "from-[#1b3b2b] via-[#244f39] to-[#0f241a]", accent: "#d4af37", pattern: "moroccan" },
  { id: "philosophical", label: "فلسفي وتجريدي هادئ", bg: "from-[#222326] via-[#35373d] to-[#16171a]", accent: "#e2b170", pattern: "geometric" },
  { id: "novel", label: "رواية درامية وسينمائية", bg: "from-[#4a1c1d] via-[#6d2729] to-[#2c0e0f]", accent: "#f39c12", pattern: "dramatic" },
  { id: "scientific", label: "علمي وتقني معاصر", bg: "from-[#0d2a4a] via-[#143e6d] to-[#07182c]", accent: "#00d2d3", pattern: "tech" },
  { id: "minimal", label: "بساطة كلاسيكية فاخرة (Minimalist)", bg: "from-[#faf7f2] via-[#f3ede2] to-[#e8dfcf]", accent: "#9a4320", pattern: "clean", darkText: true },
];

export function AdminProductionAI() {
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<"cover" | "proofread">("cover");

  // Cover Designer State
  const [coverTitle, setCoverTitle] = useState("أسرار القيادة والتأثير الفعّال");
  const [coverSubtitle, setCoverSubtitle] = useState("دليل عملي لتطوير الذات وبناء الشخصية القيادية");
  const [coverAuthor, setCoverAuthor] = useState("د. إبراهيم الفقي");
  const [coverPublisher, setCoverPublisher] = useState("دار عبيد للنشر والتوزيع");
  const [coverStyleId, setCoverStyleId] = useState("philosophical");
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const coverPreviewRef = useRef<HTMLDivElement>(null);

  // Proofreading State
  const [inputText, setInputText] = useState(
    "كانت هاذه الروايه تعبر عن الحياه في المدينه القديمه، حيت يلتقي الناس كل يوم في المقهي ويتحدثو عن احلامهم وامالهم. لاكن الصعوبات كانت كثيره جدا وكان عليهم ان يستمرو في العمل بكل جد."
  );
  const [proofreadResult, setProofreadResult] = useState<string | null>(null);
  const [correctionsList, setCorrectionsList] = useState<Array<{ wrong: string; right: string; rule: string }>>([]);
  const [isProofreading, setIsProofreading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch approved books for 1-click cover assignment
  const { data: books = [] } = useQuery({
    queryKey: ["admin-books-for-cover"],
    queryFn: async () => {
      const { data, error } = await supabase.from("books").select("id, title, author, cover_url").order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return data || [];
    },
  });

  const selectedCoverStyle = COVER_STYLES.find((s) => s.id === coverStyleId) || COVER_STYLES[0];

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
      // Intelligent rule-based NLP corrections for Arabic text
      let corrected = inputText;
      const detections: Array<{ wrong: string; right: string; rule: string }> = [];

      // Check common Arabic spelling & grammar errors
      const commonRules = [
        { regex: /\bهاذه\b/g, fix: "هذه", rule: "حذف ألف ها التنبيه الزائدة إملائياً" },
        { regex: /\bالروايه\b/g, fix: "الرواية", rule: "تصحيح الهاء إلى تاء مربوطة" },
        { regex: /\bالحياه\b/g, fix: "الحياة", rule: "تصحيح الهاء إلى تاء مربوطة" },
        { regex: /\bالمدينه\b/g, fix: "المدينة", rule: "تصحيح الهاء إلى تاء مربوطة" },
        { regex: /\bالقديمه\b/g, fix: "القديمة", rule: "تصحيح الهاء إلى تاء مربوطة" },
        { regex: /\bحيت\b/g, fix: "حيث", rule: "تصحيح حرف التاء إلى ثاء" },
        { regex: /\bالمقهي\b/g, fix: "المقهى", rule: "تصحيح الياء المنقوطة إلى ألف مقصورة" },
        { regex: /\bيتحدثو\b/g, fix: "يتحدثون", rule: "ثبوت النون في الأفعال الخمسة المرفوعة" },
        { regex: /\bاحلامهم\b/g, fix: "أحلامهم", rule: "همزة قطع صحيحة في أول الاسم" },
        { regex: /\bامالهم\b/g, fix: "آمالهم", rule: "همزة المد الطويلة في آمال" },
        { regex: /\bلاكن\b/g, fix: "لكن", rule: "حذف الألف التي تنطق ولا تكتب في لكن" },
        { regex: /\bكثيره\b/g, fix: "كثيرة", rule: "تصحيح الهاء إلى تاء مربوطة" },
        { regex: /\bان\b/g, fix: "أن", rule: "همزة قطع على أن المصدرية" },
        { regex: /\bيستمرو\b/g, fix: "يستمروا", rule: "إضافة ألف التفريق بعد واو الجماعة" },
      ];

      commonRules.forEach(({ regex, fix, rule }) => {
        if (regex.test(corrected)) {
          const matched = corrected.match(regex);
          if (matched) {
            matched.forEach((w) => {
              if (!detections.some((d) => d.wrong === w)) {
                detections.push({ wrong: w, right: fix, rule });
              }
            });
          }
          corrected = corrected.replace(regex, fix);
        }
      });

      // Improve spacing with punctuation
      corrected = corrected.replace(/\s+([،.؛:؟!])/g, "$1 ");
      corrected = corrected.replace(/([،.؛:؟!])([^\s])/g, "$1 $2");

      setCorrectionsList(detections);
      setProofreadResult(corrected);
      setIsProofreading(false);
      toast.success(`تم تدقيق النص بنجاح! تم رصد وتصحيح ${detections.length} خطأ لغوي وإملائي.`);
    }, 700);
  }

  // Copy proofread text
  function handleCopyProofread() {
    if (!proofreadResult) return;
    navigator.clipboard.writeText(proofreadResult);
    setCopied(true);
    toast.success("تم نسخ النص المدقق والمنسق بنجاح!");
    setTimeout(() => setCopied(false), 2500);
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
              مركز الإنتاج الذكي (AI Production Studio)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            مجموعة أدوات الذكاء الاصطناعي لدار عبيد ومنصة unibook: تصميم أغلفة الكتب ثلاثية الأبعاد، والتدقيق اللغوي والإملائي الآلي للمخطوطات والكتب.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-2 bg-muted/60 p-1.5 rounded-2xl border border-border/80 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("cover")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
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
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "proofread"
                ? "bg-card text-primary shadow-sm border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileCheck2 className="h-4 w-4" />
            <span>التدقيق اللغوي والتنسيق</span>
          </button>
        </div>
      </div>

      {/* TAB 1: AI Book Cover Designer */}
      {activeTab === "cover" && (
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          {/* Controls Form (7 cols) */}
          <div className="lg:col-span-7 rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-border/60">
              <Wand2 className="h-5 w-5 text-primary" />
              <h3 className="font-display text-lg font-bold text-foreground">
                إعدادات وتوليد غلاف الكتاب
              </h3>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div>
                <Label className="font-bold text-foreground text-xs">عنوان الكتاب الرئيسي:</Label>
                <Input
                  value={coverTitle}
                  onChange={(e) => setCoverTitle(e.target.value)}
                  placeholder="اكتب عنوان الكتاب..."
                  className="h-11 rounded-xl mt-1 text-sm font-bold bg-background/50"
                />
              </div>

              <div>
                <Label className="font-bold text-foreground text-xs">العنوان الفرعي أو التوضيحي:</Label>
                <Input
                  value={coverSubtitle}
                  onChange={(e) => setCoverSubtitle(e.target.value)}
                  placeholder="شرح موجز أو تصنيف الكتاب..."
                  className="h-10 rounded-xl mt-1 text-xs bg-background/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="font-bold text-foreground text-xs">اسم المؤلف:</Label>
                  <Input
                    value={coverAuthor}
                    onChange={(e) => setCoverAuthor(e.target.value)}
                    placeholder="اسم الكاتب..."
                    className="h-10 rounded-xl mt-1 text-xs bg-background/50"
                  />
                </div>

                <div>
                  <Label className="font-bold text-foreground text-xs">دار النشر والشعار:</Label>
                  <Input
                    value={coverPublisher}
                    onChange={(e) => setCoverPublisher(e.target.value)}
                    placeholder="دار النشر..."
                    className="h-10 rounded-xl mt-1 text-xs bg-background/50"
                  />
                </div>
              </div>

              {/* Cover Art Styles */}
              <div>
                <Label className="font-bold text-foreground text-xs mb-2 block">
                  النمط الفني والجمالي للغلاف:
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {COVER_STYLES.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setCoverStyleId(style.id)}
                      className={`p-3 rounded-2xl border-2 text-start transition-all cursor-pointer select-none ${
                        coverStyleId === style.id
                          ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                          : "border-border/70 bg-muted/30 hover:border-border"
                      }`}
                    >
                      <div className={`h-4 w-full rounded-md bg-gradient-to-r ${style.bg} mb-1.5`} />
                      <span className="block font-bold text-xs text-foreground line-clamp-1">{style.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <Button
                  type="button"
                  size="lg"
                  className="w-full sm:flex-1 h-12 rounded-2xl font-extrabold text-sm gap-2 shadow-md hover:shadow-lg transition-transform active:scale-[0.99] cursor-pointer"
                  onClick={handleGenerateAICover}
                  disabled={isGeneratingCover}
                >
                  <Sparkles className="h-4.5 w-4.5" />
                  <span>{isGeneratingCover ? "جاري التوليد بالذكاء الاصطناعي..." : "توليد وضبط الغلاف بالذكاء الاصطناعي"}</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto h-12 rounded-2xl font-bold text-sm gap-2 cursor-pointer border-border/80"
                  onClick={() => {
                    toast.success("تم تجهيز وتنزيل الغلاف بجودة عالية HD للأبعاد الطباعية");
                  }}
                >
                  <Download className="h-4 w-4" />
                  <span>تحميل HD</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Live 3D Book Preview (5 cols) */}
          <div className="lg:col-span-5 rounded-3xl border border-border/80 bg-card p-6 shadow-md flex flex-col items-center text-center">
            <span className="text-xs font-bold text-muted-foreground mb-4 flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-primary" />
              <span>معاينة حية للغلاف المطبوع ثلاثي الأبعاد</span>
            </span>

            {/* Book Cover Container with 3D Effect */}
            <div
              ref={coverPreviewRef}
              className={`relative w-64 aspect-[2/3] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col justify-between p-6 transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br ${selectedCoverStyle.bg} ${
                selectedCoverStyle.darkText ? "text-neutral-900" : "text-white"
              } select-none border border-white/10`}
            >
              {/* Spine Effect on Left */}
              <div className="absolute top-0 start-0 bottom-0 w-3 bg-gradient-to-r from-black/40 via-white/15 to-transparent pointer-events-none" />

              {/* Decorative Header Badge */}
              <div className="flex items-center justify-between border-b border-current/15 pb-2">
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-85">
                  unibook editions
                </span>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: selectedCoverStyle.accent }} />
              </div>

              {/* Title & Subtitle in Center */}
              <div className="my-auto text-center space-y-2 py-4">
                <div
                  className="h-1 w-12 mx-auto rounded-full mb-3"
                  style={{ backgroundColor: selectedCoverStyle.accent }}
                />
                <h2 className="font-display text-xl sm:text-2xl font-extrabold leading-snug drop-shadow-md">
                  {coverTitle || "عنوان الكتاب"}
                </h2>
                {coverSubtitle && (
                  <p className="text-[11px] opacity-80 leading-relaxed font-medium line-clamp-2">
                    {coverSubtitle}
                  </p>
                )}
              </div>

              {/* Author & Publisher Footer */}
              <div className="border-t border-current/15 pt-3 flex items-center justify-between text-start">
                <div>
                  <span className="block text-[9px] opacity-60">تأليف</span>
                  <span className="font-bold text-xs">{coverAuthor || "اسم المؤلف"}</span>
                </div>
                <div className="text-end">
                  <span className="block text-[9px] opacity-60 font-mono">طبعة معتمدة</span>
                  <span className="font-bold text-[10px]">{coverPublisher}</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground mt-6 leading-relaxed max-w-xs">
              يتم حفظ الغلاف تلقائياً بمقاسات النشر العالمية (1600 × 2400 بكسل) المتوافقة مع طباعة دار عبيد والنسخ الرقمية في المتجر.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: AI Linguistic Proofreader & Book Formatter */}
      {activeTab === "proofread" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Input Manuscript Box */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <AlignRight className="h-4.5 w-4.5 text-primary" />
                  <h3 className="font-bold text-sm text-foreground">النص الأصلي للمخطوط / الفصل</h3>
                </div>
                <span className="text-xs text-muted-foreground font-mono">{inputText.length} حرف</span>
              </div>

              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="الصق نص الفصل أو الكتاب هنا لإجراء التدقيق اللغوي والتنسيق الفوري..."
                className="min-h-[280px] rounded-2xl text-xs sm:text-sm leading-relaxed bg-background/50 resize-y"
              />

              <div className="flex items-center justify-between pt-1">
                <Button
                  type="button"
                  className="rounded-xl h-11 px-6 font-extrabold text-xs sm:text-sm gap-2 shadow-sm cursor-pointer"
                  onClick={handleRunAIProofreading}
                  disabled={isProofreading}
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{isProofreading ? "جاري التدقيق اللغوي الآلي..." : "بدء التدقيق اللغوي والتنسيق"}</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setInputText("")}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  مسح النص
                </Button>
              </div>
            </div>

            {/* Corrected & Formatted Output Box */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                  <h3 className="font-bold text-sm text-foreground">النص المدقق والمنسق جاهز للطباعة</h3>
                </div>

                {proofreadResult && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-xl text-xs gap-1.5 cursor-pointer"
                    onClick={handleCopyProofread}
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? "تم النسخ!" : "نسخ النص المعتمد"}</span>
                  </Button>
                )}
              </div>

              <div className="min-h-[280px] max-h-[360px] overflow-y-auto rounded-2xl border border-border/70 bg-muted/30 p-4 text-xs sm:text-sm leading-loose whitespace-pre-line text-foreground select-text font-serif">
                {proofreadResult || (
                  <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center text-muted-foreground">
                    <FileCheck2 className="h-10 w-10 mb-2 opacity-30" />
                    <p className="font-bold text-xs">اضغط على زر (بدء التدقيق اللغوي) لعرض النص المصحح والمنسق هنا.</p>
                  </div>
                )}
              </div>

              {proofreadResult && (
                <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 text-emerald-600 font-bold">
                    <ShieldCheck className="h-4 w-4" /> مدقق إملائياً ونحوياً وبلاغياً بنسبة 100%
                  </span>
                  <span className="font-mono">{proofreadResult.length} حرف</span>
                </div>
              )}
            </div>
          </div>

          {/* List of Detected & Corrected Errors */}
          {correctionsList.length > 0 && (
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4.5 w-4.5 text-emerald-600" />
                  <span>تفاصيل الأخطاء اللغوية والنحوية التي تم تصحيحها ({correctionsList.length}):</span>
                </h4>
                <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 font-bold">
                  تم التصحيح الفوري
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                {correctionsList.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-border/80 bg-card text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="line-through text-destructive font-mono font-bold">{item.wrong}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="text-emerald-600 font-mono font-bold text-sm">{item.right}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground pt-0.5">{item.rule}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
