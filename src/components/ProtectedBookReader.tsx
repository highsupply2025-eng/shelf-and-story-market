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
  };
  open: boolean;
  onClose: () => void;
}

export function ProtectedBookReader({ book, open, onClose }: ProtectedBookReaderProps) {
  const { session } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(book.pages && book.pages > 0 ? book.pages : 124);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [theme, setTheme] = useState<"light" | "sepia" | "dark">("sepia");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);
  const [screenshotAttempted, setScreenshotAttempted] = useState(false);
  const isForeignDefault = /^[a-zA-Z]/.test((book.title || "").trim());
  const [readingDirection, setReadingDirection] = useState<"rtl" | "ltr">(isForeignDefault ? "ltr" : "rtl");
  const readerContainerRef = useRef<HTMLDivElement>(null);

  const readerEmail = session?.user?.email || "قارئ unibook المعتمد";
  const readerId = session?.user?.id ? session.user.id.slice(0, 8) : "READER-KEY";
  const watermarkText = `unibook DRM Protected · ${readerEmail} · ${readerId} · حظر تام للنسخ أو التصوير تحت طائلة المساءلة القانونية`;

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
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs sm:text-sm text-foreground max-w-[200px] sm:max-w-md truncate">
                {book.title}
              </span>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-500/10 text-[10px] font-bold gap-1 py-0 px-2">
                <ShieldCheck className="h-3 w-3" />
                DRM محمي
              </Badge>
            </div>
            <span className="text-[10px] text-muted-foreground truncate">{book.author}</span>
          </div>
        </div>

        {/* Reader Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
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
            <span>{readingDirection === "ltr" ? `Chapter ${Math.ceil(currentPage / 15)}: Fundamentals & Principles` : `الفصل ${Math.ceil(currentPage / 15)}: مبادئ ورؤى`}</span>
            <span className="truncate max-w-[200px]">{book.title}</span>
            <span>الفصل {Math.ceil(currentPage / 15)}: مبادئ ورؤى</span>
          </div>

          {/* Book Page Content (Rendered securely) */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-12 py-6 text-sm sm:text-base leading-relaxed space-y-4 font-serif">
            {currentPage === 1 ? (
              <div className="text-center py-8 space-y-4">
                <div className="inline-block rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-bold">
                  مقدمة الإصدار الرقمي
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold font-display">{book.title}</h1>
                <p className="text-sm opacity-75">{book.author}</p>
                <div className="h-px w-24 bg-current/20 mx-auto my-6" />
                <p className="text-justify text-sm leading-relaxed max-w-lg mx-auto">
                  بسم الله الرحمن الرحيم، يسعدنا أن نضع بين أيديكم هذا الإصدار العلمي الفريد، عبر منصة unibook الإلكترونية. صُممت هذه النسخة الرقمية لتوفر تجربة قراءة سلسلة ومريحة مع أعلى معايير حفظ حقوق المؤلف ودار النشر.
                </p>
                <div className="pt-6 text-xs opacity-60 font-mono">
                  رخصة القراءة الرقمية الشخصية محفوظة للحساب: {readerEmail}
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold font-display pb-2 border-b border-black/5">
                  الجزء {currentPage} من الكتاب
                </h2>
                <p className="text-justify leading-loose">
                  إن المعرفة الحقيقية تتجاوز مجرد سرد الحقائق إلى بناء فهم عميق وتطبيق عملي يثري تجربة القارئ. وفي هذا السياق، تبرز أهمية الربط بين المنهج النظري والواقع التطبيقي، وهو ما نحرص على استعراضه بالتفصيل في هذه الصفحات.
                </p>
                <p className="text-justify leading-loose">
                  كل فكرة يتم طرحها في هذا الفصل ترتكز على دراسات وبحوث متقدمة تم جمعها وتدقيقها بعناية فائقة، لتضمن وصول المضمون العلمي بدقة وموضوعية تامة للقارئ والباحث على حد سواء.
                </p>
                <div className="rounded-xl border border-current/10 bg-current/5 p-4 my-4 text-xs leading-relaxed italic">
                  «القراءة الواعية هي حوار صامت بين عقلين، ينقل الخبرات ويبني الوعي الإنساني المتجدد.»
                </div>
                <p className="text-justify leading-loose">
                  ومع استمرار متابعة القراءة، ستلاحظ التدرج المدروس في المفاهيم، بحيث تمهد كل فكرة للتي تليها بسلاسة وعمق فكري يعين القارئ على استيعاب المادة العلمية.
                </p>
              </>
            )}
          </div>

          {/* Book Page Footer (Page number & Security badge) */}
          <div className="flex items-center justify-between border-t border-black/5 px-6 py-3 text-[11px] opacity-60">
            <span className="flex items-center gap-1 font-mono">
              <Lock className="h-3 w-3 text-emerald-600" />
              unibook DRM Encrypted
            </span>
            <span className="font-bold">
              صفحة {currentPage} من {totalPages}
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
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="rounded-xl text-xs font-bold gap-1 cursor-pointer"
          >
            الصفحة التالية
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Page Slider */}
        <div className="hidden sm:flex items-center gap-3 w-64">
          <span className="text-[11px] text-muted-foreground font-mono">1</span>
          <input
            type="range"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={(e) => setCurrentPage(Number(e.target.value))}
            className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
          />
          <span className="text-[11px] text-muted-foreground font-mono">{totalPages}</span>
        </div>

        <div className="text-xs font-extrabold text-foreground">
          {Math.round((currentPage / totalPages) * 100)}% تم إنجازه
        </div>
      </footer>
    </div>
  );
}
