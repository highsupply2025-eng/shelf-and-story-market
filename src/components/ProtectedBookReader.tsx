import { useState, useEffect, useRef } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Moon,
  Sun,
  BookOpen,
  X,
  AlertTriangle,
  Lock,
  EyeOff,
  Sparkles,
  ShoppingCart,
  ListOrdered,
  FileCheck2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";

interface ProtectedBookReaderProps {
  book: {
    id: string;
    title: string;
    author: string;
    file_path?: string | null;
    pages?: number | null;
    cover_url?: string | null;
    price_digital?: number | null;
    price_physical?: number | null;
    category?: string | null;
    description?: string | null;
  };
  open: boolean;
  onClose: () => void;
  isFreeSample?: boolean;
  maxFreePages?: number;
  onBuy?: () => void;
}

export function ProtectedBookReader({
  book,
  open,
  onClose,
  isFreeSample = false,
  maxFreePages = 10,
  onBuy,
}: ProtectedBookReaderProps) {
  const { session } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const fullTotalPages = book.pages && book.pages > 0 ? book.pages : 124;
  // If free sample, max available pages is 10 (with page 11 being the paywall lock)
  const allowedSamplePages = isFreeSample ? Math.min(maxFreePages, fullTotalPages) : fullTotalPages;
  const totalPages = isFreeSample ? allowedSamplePages : fullTotalPages;
  const isLocked = isFreeSample && currentPage > allowedSamplePages;

  const [zoomLevel, setZoomLevel] = useState(100);
  const [theme, setTheme] = useState<"light" | "sepia" | "dark">("sepia");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);
  const [screenshotAttempted, setScreenshotAttempted] = useState(false);
  const isForeignDefault = /^[a-zA-Z]/.test((book.title || "").trim());
  const [readingDirection, setReadingDirection] = useState<"rtl" | "ltr">(isForeignDefault ? "ltr" : "rtl");
  const readerContainerRef = useRef<HTMLDivElement>(null);

  const readerEmail = session?.user?.email || (isFreeSample ? "قارئ عينة unibook المجانية" : "قارئ unibook المعتمد");
  const readerId = session?.user?.id ? session.user.id.slice(0, 8) : "SAMPLE-PREVIEW";
  const watermarkText = `unibook DRM Protected · ${readerEmail} · ${readerId} · عينة مجانية للاطلاع فقط`;

  // 1. Strict Anti-Screenshot & Screen Capture Protection
  useEffect(() => {
    if (!open) return;

    // Detect PrintScreen or screenshot shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen
      if (e.key === "PrintScreen" || e.keyCode === 44) {
        e.preventDefault();
        triggerScreenshotShield();
        return;
      }

      // Windows + Shift + S or Meta + Shift + 3/4 (Mac)
      if (
        (e.shiftKey && (e.metaKey || e.ctrlKey) && (e.key === "s" || e.key === "S")) ||
        (e.metaKey && e.shiftKey && (e.key === "3" || e.key === "4"))
      ) {
        e.preventDefault();
        triggerScreenshotShield();
        return;
      }

      // Ctrl + P (Print)
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        toast.error("عذراً، طباعة هذا الكتاب محظورة بموجب حقوق النشر الرقمية unibook DRM.");
        return;
      }

      // Ctrl + S (Save)
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        toast.error("تحميل أو حفظ هذا الكتاب محظور بنظام الحماية الرقمية.");
        return;
      }

      // Ctrl + U (Source) or Ctrl + Shift + I (Inspect)
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "u" || e.key === "U" || (e.shiftKey && (e.key === "i" || e.key === "I")))
      ) {
        e.preventDefault();
        return;
      }
    };

    // When the browser window loses focus (e.g., user triggers Snipping Tool or external screenshot software)
    const handleBlur = () => {
      setIsWindowBlurred(true);
    };

    const handleFocus = () => {
      setIsWindowBlurred(false);
    };

    // BeforePrint listener
    const handleBeforePrint = () => {
      triggerScreenshotShield();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("beforeprint", handleBeforePrint);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("beforeprint", handleBeforePrint);
    };
  }, [open]);

  function triggerScreenshotShield() {
    setScreenshotAttempted(true);
    toast.error("تم كشف وحظر محاولة تصوير الشاشة! هذا الكتاب محمي قانونياً.", {
      duration: 5000,
    });
    setTimeout(() => {
      setScreenshotAttempted(false);
    }, 3500);
  }

  // Handle Fullscreen Toggle
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      readerContainerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }

  if (!open) return null;

  const themeStyles = {
    light: "bg-[#fcfbf9] text-[#1a1a1a]",
    sepia: "bg-[#f5efe0] text-[#332a22]",
    dark: "bg-[#161719] text-[#e6e6e6]",
  }[theme];

  return (
    <div
      ref={readerContainerRef}
      className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl select-none print:hidden"
      dir={readingDirection}
      onContextMenu={(e) => {
        e.preventDefault();
        toast.warning("القائمة المنسدلة والنسخ محظورة لحماية حقوق النشر.");
      }}
      onCopy={(e) => {
        e.preventDefault();
        toast.warning("نسخ نصوص الكتاب محظور.");
      }}
    >
      {/* 1. DRM Security Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/80 bg-card/90 px-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
            <Lock className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-xs sm:text-sm text-foreground max-w-[160px] sm:max-w-md truncate">
                {book.title}
              </span>
              {isFreeSample ? (
                <Badge variant="outline" className="border-amber-500/40 text-amber-600 bg-amber-500/10 text-[10px] font-bold gap-1 py-0 px-2">
                  <Sparkles className="h-3 w-3" />
                  عينة مجانية (10 صفحات)
                </Badge>
              ) : (
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-500/10 text-[10px] font-bold gap-1 py-0 px-2">
                  <ShieldCheck className="h-3 w-3" />
                  DRM محمي
                </Badge>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground truncate">{book.author}</span>
          </div>
        </div>

        {/* Reader Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Free Sample Purchase CTA */}
          {isFreeSample && onBuy && (
            <Button
              size="sm"
              onClick={onBuy}
              className="h-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs gap-1.5 shadow-xs px-3 cursor-pointer"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">شراء النسخة الكاملة</span>
              <span className="sm:hidden">شراء</span>
            </Button>
          )}

          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-1 border-e border-border/60 pe-2 me-1">
            <button
              onClick={() => setZoomLevel((z) => Math.max(75, z - 10))}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="تصغير"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-[11px] font-mono text-muted-foreground w-10 text-center">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="تكبير"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          {/* LTR / RTL Direction Switcher for Foreign/Arabic Books */}
          <button
            type="button"
            onClick={() => setReadingDirection((d) => (d === "rtl" ? "ltr" : "rtl"))}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border/70 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="تبديل اتجاه القراءة (عربي RTL / أجنبي LTR)"
          >
            <span>{readingDirection === "rtl" ? "عربي (RTL)" : "English (LTR)"}</span>
          </button>

          {/* Theme Switcher */}
          <div className="flex items-center rounded-lg border border-border/70 p-0.5 bg-muted/40">
            <button
              onClick={() => setTheme("sepia")}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                theme === "sepia" ? "bg-[#e8dfcf] text-[#4a3b2c] shadow-xs" : "text-muted-foreground"
              }`}
            >
              ورقي
            </button>
            <button
              onClick={() => setTheme("light")}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                theme === "light" ? "bg-white text-black shadow-xs" : "text-muted-foreground"
              }`}
            >
              نهاري
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                theme === "dark" ? "bg-black text-white shadow-xs" : "text-muted-foreground"
              }`}
            >
              ليلي
            </button>
          </div>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title={isFullscreen ? "إنهاء ملء الشاشة" : "ملء الشاشة"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {/* Close Reader */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors cursor-pointer ms-1"
            title="إغلاق القارئ"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* 2. Main Protected Reading Body */}
      <div className="relative flex-1 overflow-hidden flex items-center justify-center p-3 sm:p-6">
        
        {/* PRIVACY BLUR SHIELD (Triggered when user leaves window to screenshot) */}
        {isWindowBlurred && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-background/85 backdrop-blur-2xl p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-600 mb-4 animate-bounce">
              <EyeOff className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-foreground">تم حجب المحتوى مؤقتاً</h3>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-md leading-relaxed">
              لحماية حقوق الملكية الفكرية، يتم حجب صفحات الكتاب تلقائياً عند فقدان تركيز الشاشة أو محاولة التقاط الشاشة عبر برامج خارجية. انقر هنا للعودة للقراءة.
            </p>
            <Button onClick={() => setIsWindowBlurred(false)} className="mt-4 rounded-full px-6 font-bold text-xs">
              العودة للقراءة الآن
            </Button>
          </div>
        )}

        {/* SCREENSHOT BLOCKED OVERLAY */}
        {screenshotAttempted && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 text-white p-6 text-center animate-in fade-in">
            <ShieldAlert className="h-16 w-16 text-rose-500 mb-3 animate-pulse" />
            <h2 className="text-2xl font-extrabold text-rose-400">حماية unibook DRM صارمة</h2>
            <p className="mt-2 text-sm text-white/80 max-w-sm">
              تم حظر تصوير الشاشة وسكرين شوت بالكامل. محتوى هذا الكتاب مسجل باسم:
            </p>
            <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 font-mono text-xs text-rose-300">
              {readerEmail}
            </div>
          </div>
        )}

        {/* The Digital Protected Book Page (Virtual Rendered Canvas) */}
        <div
          className={`relative w-full max-w-2xl h-[calc(100vh-140px)] rounded-2xl shadow-2xl border border-black/10 overflow-hidden flex flex-col justify-between transition-transform duration-200 ${themeStyles}`}
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: "center center",
          }}
        >
          {/* MULTI-LAYER REPEATING DYNAMIC WATERMARK */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden select-none opacity-[0.08] flex flex-col justify-around rotate-[-25deg] scale-125 z-20">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="whitespace-nowrap text-center text-[10px] font-mono font-bold tracking-wider">
                {watermarkText} · {watermarkText}
              </div>
            ))}
          </div>

          {/* Book Page Header */}
          <div className={`flex items-center justify-between border-b border-black/5 px-6 py-3 text-[11px] opacity-60 ${readingDirection === "ltr" ? "flex-row-reverse" : ""}`}>
            <span>
              {isLocked
                ? "نهاية العينة المجانية"
                : currentPage === 1
                ? "غلاف الكتاب وبيانات الإصدار"
                : currentPage === 2
                ? "مقدمة الكتاب والناشر"
                : currentPage === 3 || currentPage === 4
                ? "فهرس الموضوعات والمحتويات"
                : `الفصل الأول: تمهيد ونماذج قراءة`}
            </span>
            <span className="truncate max-w-[200px] font-bold">{book.title}</span>
            <span>{isFreeSample ? "عينة مجانية (10 صفحات)" : "النسخة المعتمدة"}</span>
          </div>

          {/* Book Page Content (Rendered securely) */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-12 py-6 text-sm sm:text-base leading-relaxed space-y-4 font-serif">
            {isLocked ? (
              /* Paywall / Sample Finished Lock Screen */
              <div className="text-center py-6 sm:py-10 space-y-5 animate-in fade-in">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-600 border border-amber-500/30 shadow-inner">
                  <Lock className="h-8 w-8" />
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>وصلت إلى نهاية العينة المجانية المتاحة (10 صفحات)</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-foreground">
                  أعجبك الكتاب؟ تابع القراءة الآن
                </h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  لقد اطلعت على الفهرس والمقدمة ونماذج من الفصل الأول لكتاب <strong className="text-foreground">«{book.title}»</strong>. لقراءة بقية الكتاب كاملاً من صفحة 11 حتى النهاية، يمكنك اقتناء نسختك الأصلية فوراً.
                </p>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  {onBuy && (
                    <Button
                      onClick={onBuy}
                      size="lg"
                      className="h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-sm gap-2 px-8 shadow-md cursor-pointer active:scale-[0.99] w-full sm:w-auto"
                    >
                      <ShoppingCart className="h-4.5 w-4.5" />
                      <span>شراء الكتاب والوصول لكامل الفصول</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(3)}
                    className="h-12 rounded-2xl font-bold text-xs border-border/80 gap-2 cursor-pointer w-full sm:w-auto"
                  >
                    <ListOrdered className="h-4 w-4" />
                    <span>مراجعة الفهرس مجدداً (صفحة 3)</span>
                  </Button>
                </div>
              </div>
            ) : currentPage === 1 ? (
              /* PAGE 1: Book Cover & Main Title & Sample Note */
              <div className="text-center py-4 space-y-4">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-xs font-bold">
                  <Sparkles className="h-3 w-3" />
                  <span>عينة تمهيدية مجانية (10 صفحات)</span>
                </div>

                {book.cover_url && (
                  <div className="mx-auto w-28 sm:w-36 aspect-[2/3] rounded-xl overflow-hidden shadow-lg border border-border/80 my-2">
                    <img
                      src={book.cover_url}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <h1 className="text-2xl sm:text-3xl font-extrabold font-display leading-tight">{book.title}</h1>
                <p className="text-sm font-semibold opacity-85">تأليف: {book.author}</p>
                <div className="text-xs text-muted-foreground">
                  التصنيف: {book.category || "عام"} · إجمالي صفحات الكتاب: {fullTotalPages} صفحة
                </div>

                <div className="h-px w-24 bg-current/20 mx-auto my-3" />

                <p className="text-justify text-xs sm:text-sm leading-relaxed max-w-lg mx-auto opacity-90">
                  مرحباً بك في منصة unibook. نوفر لك هذه العينة المجانية المكونة من (10 صفحات) لتتعرف على الفهرس التفصيلي ومحتويات الكتاب ومقدمته وأسلوب الكاتب قبل اتخاذ قرار الشراء.
                </p>

                <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage(3)}
                    className="h-8 rounded-xl text-xs font-bold gap-1 border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
                  >
                    <ListOrdered className="h-3.5 w-3.5" />
                    الانتقال مباشرة للفهرس (صفحة 3)
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setCurrentPage(2)}
                    className="h-8 rounded-xl text-xs font-bold gap-1 cursor-pointer"
                  >
                    بدء تصفح العينة
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : currentPage === 2 ? (
              /* PAGE 2: Introduction & Overview */
              <div className="space-y-4">
                <div className="border-b border-black/10 pb-3">
                  <span className="text-[11px] font-bold text-primary block uppercase tracking-wider">
                    تمهيد وقراءة نقدية
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold font-display mt-1">
                    مقدمة الكتاب وأهدافه العامة
                  </h2>
                </div>

                <p className="text-justify leading-loose">
                  {book.description ||
                    `يأتي هذا الكتاب «${book.title}» للمؤلف «${book.author}» ليسد فراغاً معرفياً مهماً في مكتبتنا العربية المعاصرة، مقدماً رؤية تحليلية وتطبيقية تجمع بين رصانة البحث وسلاسة الطرح.`}
                </p>

                <div className="rounded-2xl border border-current/15 bg-current/5 p-4 my-4 space-y-2">
                  <h4 className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
                    <FileCheck2 className="h-4 w-4 text-primary" />
                    ماذا سيجد القارئ في هذا الإصدار؟
                  </h4>
                  <ul className="text-xs sm:text-sm space-y-1.5 list-disc list-inside leading-relaxed opacity-90">
                    <li>معالجة منهجية شاملة للقضايا والمفاهيم المحورية المتعلقة بموضوع الكتاب.</li>
                    <li>أدوات واستراتيجيات عملية قابلة للتطبيق الواقعي المباشر.</li>
                    <li>دراسات حالة واقعية وتجارب موثقة تعزز الفهم وتثري التجربة القرائية.</li>
                  </ul>
                </div>

                <p className="text-justify leading-loose">
                  نأمل أن يجد القارئ في هذه الصفحات مرشداً قيماً يفتح آفاقاً جديدة من المعرفة والتفكير الإبداعي.
                </p>
              </div>
            ) : currentPage === 3 ? (
              /* PAGE 3: Table of Contents Part 1 */
              <div className="space-y-4">
                <div className="border-b border-black/10 pb-3 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-primary block">دليل المحتوى</span>
                    <h2 className="text-xl font-bold font-display">فهرس الموضوعات (الجزء الأول)</h2>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">1 من 2</Badge>
                </div>

                <div className="space-y-3 text-xs sm:text-sm divide-y divide-black/5">
                  <div className="pt-2 flex items-center justify-between">
                    <span className="font-bold">المقدمة وتأصيل المنهجية</span>
                    <span className="font-mono text-muted-foreground">ص 5</span>
                  </div>

                  <div className="pt-3 space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-primary">
                      <span>الباب الأول: المنطلقات التأسيسية والمفاهيم الجوهرية</span>
                      <span className="font-mono">ص 15</span>
                    </div>
                    <div className="ps-4 space-y-1 text-muted-foreground text-[11px] sm:text-xs">
                      <div className="flex justify-between"><span>• الفصل الأول: مدخل المفاهيم والرؤى الفكرية</span><span className="font-mono">ص 18</span></div>
                      <div className="flex justify-between"><span>• الفصل الثاني: التطور التاريخي والتحولات المفصلية</span><span className="font-mono">ص 38</span></div>
                      <div className="flex justify-between"><span>• الفصل الثالث: الأركان والمعايير المنهجية</span><span className="font-mono">ص 62</span></div>
                    </div>
                  </div>

                  <div className="pt-3 space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-primary">
                      <span>الباب الثاني: الأطر التطبيقية والتحليل الميداني</span>
                      <span className="font-mono">ص 92</span>
                    </div>
                    <div className="ps-4 space-y-1 text-muted-foreground text-[11px] sm:text-xs">
                      <div className="flex justify-between"><span>• الفصل الرابع: آليات التشخيص وأدوات التحليل</span><span className="font-mono">ص 96</span></div>
                      <div className="flex justify-between"><span>• الفصل الخامس: دراسات الحالة والنماذج المعاصرة</span><span className="font-mono">ص 124</span></div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-center">
                  <span className="text-[11px] text-muted-foreground italic">
                    تابع قراءة بقية الفهرس في الصفحة التالية (صفحة 4) →
                  </span>
                </div>
              </div>
            ) : currentPage === 4 ? (
              /* PAGE 4: Table of Contents Part 2 */
              <div className="space-y-4">
                <div className="border-b border-black/10 pb-3 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-primary block">دليل المحتوى</span>
                    <h2 className="text-xl font-bold font-display">فهرس الموضوعات (الجزء الثاني)</h2>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">2 من 2</Badge>
                </div>

                <div className="space-y-3 text-xs sm:text-sm divide-y divide-black/5">
                  <div className="pt-2 space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-primary">
                      <span>الباب الثالث: الاستراتيجيات والحلول المتقدمة</span>
                      <span className="font-mono">ص 152</span>
                    </div>
                    <div className="ps-4 space-y-1 text-muted-foreground text-[11px] sm:text-xs">
                      <div className="flex justify-between"><span>• الفصل السادس: التحديات والعقبات وآليات التجاوز</span><span className="font-mono">ص 156</span></div>
                      <div className="flex justify-between"><span>• الفصل السابع: خريطة الطريق والتنفيذ الفعال</span><span className="font-mono">ص 188</span></div>
                      <div className="flex justify-between"><span>• الفصل الثامن: قياس الأثر والتقييم المستمر</span><span className="font-mono">ص 214</span></div>
                    </div>
                  </div>

                  <div className="pt-3 space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-primary">
                      <span>الخاتمة والملاحق والمراجع</span>
                      <span className="font-mono">ص 240</span>
                    </div>
                    <div className="ps-4 space-y-1 text-muted-foreground text-[11px] sm:text-xs">
                      <div className="flex justify-between"><span>• الخاتمة والنتائج التوليفية</span><span className="font-mono">ص 242</span></div>
                      <div className="flex justify-between"><span>• ملحق الوثائق والنماذج الاسترشادية</span><span className="font-mono">ص 258</span></div>
                      <div className="flex justify-between"><span>• قائمة المصادر والمراجع المعتمدة</span><span className="font-mono">ص 276</span></div>
                      <div className="flex justify-between"><span>• مسرد المصطلحات الفهرس الهجائي</span><span className="font-mono">ص 292</span></div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-center space-y-1 mt-4">
                  <span className="font-bold text-primary block">
                    الصفحات من 5 إلى 10 تقدم لك نماذج حية من فصول الكتاب
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    اقلب الصفحة للاطلاع على مدخل الفصل الأول وأسلوب الطرح.
                  </p>
                </div>
              </div>
            ) : currentPage === 5 ? (
              /* PAGE 5: Chapter 1 Entry */
              <div className="space-y-4">
                <div className="text-center py-4 border-b border-black/10">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider block">
                    الباب الأول · الفصل الأول
                  </span>
                  <h2 className="text-2xl font-bold font-display mt-1">المنطلقات التأسيسية والمفاهيم الكبرى</h2>
                  <p className="text-xs text-muted-foreground mt-1">تأطير منهجي لموضوع الكتاب</p>
                </div>

                <p className="text-justify leading-loose">
                  تبدأ الرحلة المعرفية لأي باحث أو مهتم من تحرير المصطلحات وفهم المنطلقات الأولية. فالخلط في المفاهيم غالباً ما يقود إلى نتائج مغلوطة في التطبيق والممارسة.
                </p>

                <div className="rounded-xl border border-current/10 bg-current/5 p-4 my-3 italic text-xs sm:text-sm leading-relaxed">
                  «إن سلامة المقدمات شرط جوهري لاستقامة النتائج، وكل بناء علمي رصين ينطلق من وضوح الأساس وتكامله.»
                </div>

                <p className="text-justify leading-loose">
                  في هذا الفصل، نستعرض بالتحليل المقارن المحاور الكبرى التي تشكل جوهر «${book.title}»، مع التركيز على الجوانب الأكثر تأثيراً في الميدان العملي.
                </p>
              </div>
            ) : currentPage <= 9 ? (
              /* PAGES 6-9: Sample Chapter Sections */
              <div className="space-y-4">
                <div className="border-b border-black/10 pb-2">
                  <span className="text-[11px] font-bold text-primary">عينة من الفصل الأول · المبحث ${currentPage - 4}</span>
                  <h3 className="text-lg font-bold font-display mt-0.5">
                    {currentPage === 6
                      ? "المبحث الأول: الأركان الهيكلية والدعائم التفسيرية"
                      : currentPage === 7
                      ? "المبحث الثاني: التطبيقات العملية وحالات الممارسة"
                      : currentPage === 8
                      ? "المبحث الثالث: الاستراتيجيات الفعالة وإدارة المتغيرات"
                      : "المبحث الرابع: مؤشرات النجاح ومعايير الحوكمة"}
                  </h3>
                </div>

                <p className="text-justify leading-loose">
                  إن المعرفة الحقيقية تتجاوز مجرد سرد الحقائق إلى بناء فهم عميق وتطبيق عملي يثري تجربة القارئ. وفي هذا السياق، تبرز أهمية الربط بين المنهج النظري والواقع التطبيقي، وهو ما يحرص المؤلف «${book.author}» على استعراضه بالتفصيل في هذه الصفحات.
                </p>

                <p className="text-justify leading-loose">
                  كل فكرة يتم طرحها في هذا الفصل ترتكز على دراسات وبحوث متقدمة تم جمعها وتدقيقها بعناية فائقة، لتضمن وصول المضمون العلمي بدقة وموضوعية تامة للقارئ والباحث على حد سواء.
                </p>

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 my-3 text-xs leading-relaxed">
                  <strong className="text-primary block mb-1">💡 إضاءة تحليلية من صلب الكتاب:</strong>
                  الوصول إلى النتائج الاستثنائية يتطلب الجمع بين وضوح الهدف والمرونة في وسائل التنفيذ ومتابعة المؤشرات بانتظام.
                </div>

                <p className="text-justify leading-loose">
                  ومع استمرار متابعة القراءة، ستلاحظ التدرج المدروس في المفاهيم، بحيث تمهد كل فكرة للتي تليها بسلاسة وعمق فكري يعين القارئ على استيعاب المادة العلمية.
                </p>
              </div>
            ) : (
              /* PAGE 10: Final Sample Page */
              <div className="space-y-4 text-center py-4">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                  <Sparkles className="h-3 w-3" />
                  الصفحة العاشرة والأخيرة من العينة المجانية
                </div>

                <h2 className="text-2xl font-bold font-display">خريطة الفصول القادمة في الكتاب الكامل</h2>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  اكتملت الآن العينة المجانية المخصصة لمعاينة الفهرس والمقدمة. ينتظرك في الفصول القادمة (صفحة 11 إلى ${fullTotalPages}):
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-start text-xs my-4 max-w-lg mx-auto">
                  <div className="p-3 rounded-xl border border-border/80 bg-card">
                    <span className="font-bold text-foreground block">الأبواب التطبيقية</span>
                    <span className="text-[11px] text-muted-foreground">استراتيجيات التنفيذ التفصيلية ودراسات الحالة.</span>
                  </div>
                  <div className="p-3 rounded-xl border border-border/80 bg-card">
                    <span className="font-bold text-foreground block">الحلول المتقدمة</span>
                    <span className="text-[11px] text-muted-foreground">آليات التغلب على العقبات وتحقيق التميز.</span>
                  </div>
                  <div className="p-3 rounded-xl border border-border/80 bg-card">
                    <span className="font-bold text-foreground block">الملاحق وقوائم العمل</span>
                    <span className="text-[11px] text-muted-foreground">أدوات تقييم ونماذج استرشادية جاهزة للاستخدام.</span>
                  </div>
                  <div className="p-3 rounded-xl border border-border/80 bg-card">
                    <span className="font-bold text-foreground block">تجربة قراءة DRM كاملة</span>
                    <span className="text-[11px] text-muted-foreground">قراءة سلسة مع حفظ مكان توقفك والوضع الليلي.</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  {onBuy && (
                    <Button
                      onClick={onBuy}
                      size="lg"
                      className="h-11 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs gap-2 px-6 shadow-md cursor-pointer"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      شراء النسخة الكاملة الآن
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(3)}
                    className="h-11 rounded-2xl font-bold text-xs border-border/80 cursor-pointer"
                  >
                    مراجعة الفهرس مجدداً (صفحة 3)
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Book Page Footer (Page number & Security badge) */}
          <div className="flex items-center justify-between border-t border-black/5 px-6 py-3 text-[11px] opacity-60">
            <span className="flex items-center gap-1 font-mono">
              <Lock className="h-3 w-3 text-emerald-600" />
              {isFreeSample ? "unibook Free Sample DRM" : "unibook DRM Encrypted"}
            </span>
            <span className="font-bold">
              {isLocked
                ? "نهاية العينة (10 صفحات)"
                : isFreeSample
                ? `صفحة ${currentPage} من ${allowedSamplePages} (عينة مجانية)`
                : `صفحة ${currentPage} من ${totalPages}`}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Bottom Navigation Bar */}
      <footer className="flex h-14 shrink-0 items-center justify-between border-t border-border/80 bg-card/90 px-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="rounded-xl text-xs font-bold gap-1 cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
            الصفحة السابقة
          </Button>
          <Button
            size="sm"
            variant={currentPage >= allowedSamplePages && isFreeSample ? "default" : "outline"}
            onClick={() => {
              if (isFreeSample && currentPage >= allowedSamplePages) {
                setCurrentPage(allowedSamplePages + 1);
              } else {
                setCurrentPage((p) => Math.min(totalPages, p + 1));
              }
            }}
            disabled={!isFreeSample && currentPage >= totalPages}
            className={`rounded-xl text-xs font-bold gap-1 cursor-pointer ${
              isFreeSample && currentPage >= allowedSamplePages ? "bg-amber-600 hover:bg-amber-700 text-white" : ""
            }`}
          >
            {isFreeSample && currentPage >= allowedSamplePages ? (
              <>
                <span>نهاية العينة / شراء</span>
                <Lock className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                الصفحة التالية
                <ChevronLeft className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* Quick Page Slider */}
        <div className="hidden sm:flex items-center gap-3 w-64">
          <span className="text-[11px] text-muted-foreground font-mono">1</span>
          <input
            type="range"
            min={1}
            max={isFreeSample ? allowedSamplePages : totalPages}
            value={Math.min(currentPage, allowedSamplePages)}
            onChange={(e) => setCurrentPage(Number(e.target.value))}
            className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
          />
          <span className="text-[11px] text-muted-foreground font-mono">
            {isFreeSample ? `${allowedSamplePages} (عينة)` : totalPages}
          </span>
        </div>

        <div className="text-xs font-extrabold text-foreground">
          {isLocked
            ? "100% من العينة المجانية"
            : `${Math.round((Math.min(currentPage, allowedSamplePages) / allowedSamplePages) * 100)}% من العينة`}
        </div>
      </footer>
    </div>
  );
}
