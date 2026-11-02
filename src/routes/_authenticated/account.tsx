import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLocale } from "@/lib/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookCard } from "@/components/BookCard";
import { toast } from "sonner";
import {
  Download,
  Library,
  Package,
  Sparkles,
  Check,
  BookOpen,
  FileText,
  Heart,
  Settings,
  PenLine,
  Mail,
  ShieldCheck,
  ArrowRight,
  Zap,
  Copy,
  Clock,
  AlertCircle,
  Wallet,
} from "lucide-react";
import {
  getUserPlanRequest,
  submitPlanRequest,
  getAdminWalletNumber,
  type AuthorPlanRequest,
} from "@/lib/author-plans";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "مساحة المؤلف وخطط النشر — unibook" },
      { name: "description", content: "خطط نشر الكتب للمؤلفين وإدارة المخطوطات في unibook." },
      { property: "og:title", content: "مساحة المؤلف وخطط النشر — unibook" },
      { property: "og:description", content: "خطط نشر الكتب للمؤلفين وإدارة المخطوطات في unibook." },
    ],
  }),
  component: AccountPage,
});

type OrderRow = {
  id: string;
  total: number;
  status: string;
  created_at: string;
  order_items: {
    id: string;
    format: string;
    quantity: number;
    unit_price: number;
    books: { id: string; title: string; cover_url: string | null; file_path: string | null } | null;
  }[];
};

export type PublishingPlan = {
  id: string;
  title: string;
  tagline: string;
  badge: string;
  badgeStyle: string;
  booksCount: number;
  booksLabel: string;
  price: number;
  priceDisplay: string;
  priceNote: string;
  featured?: boolean;
  features: string[];
  ctaText: string;
};

export const PUBLISHING_PLANS: PublishingPlan[] = [
  {
    id: "plan-1",
    title: "الخطة المجانية",
    tagline: "انطلاقة المؤلف الأول",
    badge: "مجانية للبدء",
    badgeStyle: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    booksCount: 1,
    booksLabel: "كتاب واحد فقط",
    price: 0,
    priceDisplay: "مجاناً",
    priceNote: "بدون أي رسوم اشتراك",
    featured: false,
    features: [
      "نشر كتاب واحد (رقمي وورقي)",
      "رفع المخطوط بصيغة Word (.doc, .docx)",
      "مراجعة المخطوط وتأكيد استلامه",
      "نسبة أرباح المؤلف: 70% للرقمي و 30% للورقي",
      "كود تعريف رسمي للمؤلف في unibook",
      "صفحة خاصة لكتابك في متجر الكتب",
    ],
    ctaText: "ابدأ النشر مجاناً",
  },
  {
    id: "plan-3",
    title: "باقة الـ 3 كتب",
    tagline: "باقة الكاتب الصاعد",
    badge: "للكتّاب المستقلين",
    badgeStyle: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    booksCount: 3,
    booksLabel: "3 كتب للنشر",
    price: 999,
    priceDisplay: "999 ر.س",
    priceNote: "يعادل 333 ر.س لكل كتاب",
    featured: false,
    features: [
      "نشر حتى 3 كتب كاملة (رقمية وورقية)",
      "أولوية المراجعة الفنية والتدقيق الأولي",
      "تصميم أغلفة مميزة وتنسيق داخلي",
      "نسبة أرباح كاملة (70% رقمي / 30% ورقي)",
      "تقارير مبيعات وإحصائيات تفصيلية",
      "سحب دوري للأرباح لحساب المؤلف",
    ],
    ctaText: "اختيار باقة 3 كتب (999 ر.س)",
  },
  {
    id: "plan-5",
    title: "باقة الـ 5 كتب",
    tagline: "باقة الإبداع والتميز",
    badge: "الأكثر طلباً ⭐",
    badgeStyle: "bg-primary text-primary-foreground border-primary font-bold shadow-xs",
    booksCount: 5,
    booksLabel: "5 كتب للنشر",
    price: 1800,
    priceDisplay: "1,800 ر.س",
    priceNote: "يعادل 360 ر.س لكل كتاب",
    featured: true,
    features: [
      "نشر حتى 5 كتب (رقمية + نسخ ورقية)",
      "مراجعة لغوية وتدقيق متقدم للمخطوطات",
      "تصميم أغلفة احترافية مخصصة",
      "إبراز الكتب في القسم المميز بالمتجر",
      "دعم فني ومتابعة شخصية لمراحل الإنتاج",
      "نسبة أرباح 70% للرقمي و 30% للورقي",
    ],
    ctaText: "اختيار باقة 5 كتب (1,800 ر.س)",
  },
  {
    id: "plan-7",
    title: "باقة الـ 7 كتب",
    tagline: "باقة النخبة الأدبية",
    badge: "قيمة ممتازة",
    badgeStyle: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    booksCount: 7,
    booksLabel: "7 كتب للنشر",
    price: 2400,
    priceDisplay: "2,400 ر.س",
    priceNote: "يعادل 342 ر.س لكل كتاب",
    featured: false,
    features: [
      "نشر حتى 7 كتب كاملة على المنصة",
      "تدقيق لغوي وفهرسة وتنسيق فاخر",
      "شارة مؤلف موثق (Verified Author)",
      "ترويج عبر منصات unibook ودار عبيد",
      "أولوية الطباعة والشحن السريع لنسخ القراء",
      "كشف حساب تحليلي مفصل للأرباح",
    ],
    ctaText: "اختيار باقة 7 كتب (2,400 ر.س)",
  },
  {
    id: "plan-9",
    title: "باقة الـ 9 كتب",
    tagline: "باقة الاحتراف الشاملة",
    badge: "للمؤلفين المحترفين",
    badgeStyle: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    booksCount: 9,
    booksLabel: "9 كتب للنشر",
    price: 4500,
    priceDisplay: "4,500 ر.س",
    priceNote: "يعادل 500 ر.س لكل كتاب",
    featured: false,
    features: [
      "نشر حتى 9 كتب (سلاسل، مجلدات، مؤلفات)",
      "حزمة إنتاج كاملة (أغلفة، تنسيق، تدقيق، فهرسة)",
      "تصميم أغلفة فاخرة وتنسيق صفحات متقن",
      "مدير حساب مخصص لمتابعة كافة المشاريع",
      "تسويق مكثف وإبراز في صدارة نتائج البحث",
      "أولوية قصوى لعمليات الطباعة والتوزيع",
    ],
    ctaText: "اختيار باقة 9 كتب (4,500 ر.س)",
  },
  {
    id: "plan-12",
    title: "باقة الـ 12 كتاب",
    tagline: "الباقة السنوية الكبرى",
    badge: "عضوية سنوية ذهبية 👑",
    badgeStyle: "bg-gradient-to-r from-amber-500/20 via-primary/20 to-amber-500/20 text-foreground border-amber-500/40 font-bold",
    booksCount: 12,
    booksLabel: "12 كتاب للنشر (سنة كاملة)",
    price: 8500,
    priceDisplay: "8,500 ر.س",
    priceNote: "الخيار الأقوى للمؤسسات ودور النشر والمؤلفين الغزيرين",
    featured: false,
    features: [
      "نشر حتى 12 كتاباً خلال العام",
      "إنتاج طباعي ورقمي بمعايير دولية متكاملة",
      "جناح خاص واستعراض شامل لكافة أعمال المؤلف",
      "حملات تدشين وإطلاق رسمي لكل كتاب ينشر",
      "استشارات نشر وتسويق مخصصة على مدار العام",
      "أعلى فئة أولوية في المراجعة والدعم الفني والسحب",
    ],
    ctaText: "اختيار الباقة السنوية (8,500 ر.س)",
  },
];

function AccountPage() {
  const { session } = useAuth();
  const l = useLocale();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    display_name: "",
    shipping_name: "",
    shipping_phone: "",
    shipping_address: "",
  });

  const [walletSender, setWalletSender] = useState("");
  const [reference, setReference] = useState("");
  const [authorNameInput, setAuthorNameInput] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [submittingPlan, setSubmittingPlan] = useState(false);

  const { data: planRequest, refetch: refetchPlanRequest } = useQuery({
    queryKey: ["my-plan-request", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      if (!session) return null;
      return getUserPlanRequest(session.user.id);
    },
  });

  const [selectedPlanModal, setSelectedPlanModal] = useState<PublishingPlan | null>(null);
  const [activePlanId, setActivePlanId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("unibook_selected_plan_id") || "plan-1";
    }
    return "plan-1";
  });

  function handleSelectPlan(plan: PublishingPlan) {
    setAuthorNameInput(profile.display_name || publisher?.store_name || session?.user.email?.split("@")[0] || "");
    setWalletSender("");
    setReference("");
    setTransferNotes("");
    setSelectedPlanModal(plan);
  }

  async function handleConfirmTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !selectedPlanModal) return;
    setSubmittingPlan(true);
    try {
      await submitPlanRequest({
        userId: session.user.id,
        userEmail: session.user.email || "",
        authorName: authorNameInput.trim() || session.user.email || "مؤلف",
        planId: selectedPlanModal.id,
        planTitle: selectedPlanModal.title,
        booksCount: selectedPlanModal.booksCount,
        price: selectedPlanModal.price,
        priceDisplay: selectedPlanModal.priceDisplay,
        walletSender: walletSender.trim() || (selectedPlanModal.price === 0 ? "خطة مجانية" : "تحويل محفظة"),
        reference: reference.trim() || `TX-${Math.floor(100000 + Math.random() * 900000)}`,
        notes: transferNotes,
      });
      await refetchPlanRequest();
      setSelectedPlanModal(null);
      toast.success(
        selectedPlanModal.price === 0
          ? l.t("تم إرسال طلب تفعيل الخطة المجانية! سيتم اعتماده وتفعيله من لوحة الإدارة.", "Free plan request submitted!")
          : l.t(
              "تم إرسال إشعار تحويل المحفظة بنجاح! سيتم التحقق وتفعيل حسابك كمؤلف من خلال لوحة الإدارة.",
              "Wallet transfer submitted! Admin will activate after verification.",
            ),
      );
    } catch {
      toast.error(l.t("تعذر إرسال الطلب، يرجى المحاولة لاحقاً", "Could not submit request"));
    } finally {
      setSubmittingPlan(false);
    }
  }

  useEffect(() => {
    if (!session) return;
    supabase
      .from("profiles")
      .select("display_name,shipping_name,shipping_phone,shipping_address")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setProfile({ ...data, display_name: data.display_name ?? "" });
      });
  }, [session?.user.id]);

  const { data: publisher } = useQuery({
    queryKey: ["my-publisher-profile", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("publishers")
        .select("*")
        .eq("id", session!.user.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: manuscripts = [] } = useQuery({
    queryKey: ["my-manuscripts", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("manuscripts")
        .select("*")
        .eq("author_id", session!.user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ["favorites", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("reader_favorites").select("book_id,books(*)");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["my-orders", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      if (!session) return [];
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id,total,status,created_at,order_items(id,format,quantity,unit_price,books(id,title,cover_url,file_path))",
        )
        .eq("buyer_id", session.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as OrderRow[];
    },
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    const { error } = await supabase.from("profiles").update(profile).eq("id", session.user.id);
    if (error) toast.error(l.t("تعذر الحفظ", "Could not save"));
    else toast.success(l.t("حُفظت بيانات الحساب", "Account details saved"));
  }

  const library = Array.from(
    new Map(
      orders
        .flatMap((o) => o.order_items)
        .flatMap((i) => (i.format === "digital" && i.books ? [[i.books.id, i.books] as const] : [])),
    ).values(),
  );

  async function download(path: string | null) {
    if (!path) return void toast.info("لم يرفع الناشر الملف بعد");
    const { data, error } = await supabase.storage.from("book-files").createSignedUrl(path, 60);
    if (error || !data) return void toast.error("تعذر تجهيز الملف");
    window.open(data.signedUrl, "_blank");
  }

  const adminWallet = getAdminWalletNumber();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">
      {/* Author Space Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card/90 to-primary/5 p-6 md:p-10 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary">
              <PenLine className="h-3.5 w-3.5" />
              <span>{l.t("مساحة المؤلف · unibook", "Author Studio · unibook")}</span>
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {l.t("خطط نشر الكتب للمؤلفين", "Author Book Publishing Plans")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm sm:text-base text-muted-foreground leading-relaxed">
              {l.t(
                "اختر الخطة المناسبة لنشر مؤلفاتك الورقية والرقمية، وانطلق في رحلة نشر وإنتاج متكاملة تصل بأعمالك إلى آلاف القرّاء.",
                "Choose the right publishing plan for your digital and print books and start your journey.",
              )}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="rounded-2xl border border-border bg-background/80 px-4 py-2.5 backdrop-blur-xs">
              <span className="text-xs text-muted-foreground">{l.t("حساب المؤلف:", "Author Account:")}</span>
              <p className="font-mono text-xs font-bold text-foreground" dir="ltr">
                {session?.user.email}
              </p>
              {publisher?.author_code && (
                <p className="text-[11px] font-mono font-semibold text-primary">
                  كود المؤلف: {publisher.author_code}
                </p>
              )}
            </div>

            <Button asChild className="rounded-xl font-bold shadow-xs">
              <Link to="/publisher">
                <FileText className="me-2 h-4 w-4" />
                {l.t("نشر كتاب (رفع Word)", "Upload Word")}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Author Plan Status Banner */}
      {planRequest ? (
        <div
          className={`mt-6 rounded-3xl border p-5 sm:p-6 transition-all ${
            planRequest.status === "active"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
              : planRequest.status === "pending"
              ? "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              {planRequest.status === "active" ? (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <Check className="h-5 w-5" />
                </div>
              ) : planRequest.status === "pending" ? (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 animate-pulse">
                  <Clock className="h-5 w-5" />
                </div>
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-destructive/20 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                </div>
              )}
              <div>
                <div className="font-extrabold text-base sm:text-lg">
                  {planRequest.status === "active" && `🎉 باقة (${planRequest.planTitle}) مفعّلة بنجاح`}
                  {planRequest.status === "pending" && `⏳ طلب تفعيل (${planRequest.planTitle}) قيد المراجعة في لوحة الإدارة`}
                  {planRequest.status === "rejected" && `❌ تعذر تفعيل (${planRequest.planTitle})`}
                </div>
                <p className="mt-1 text-xs sm:text-sm opacity-90 leading-relaxed">
                  {planRequest.status === "active" &&
                    `حسابك كمؤلف نشط بالكامل. يمكنك الآن رفع المخطوطات والبدء بالإنتاج حتى ${planRequest.booksCount} كتب.`}
                  {planRequest.status === "pending" &&
                    `تم إرسال إشعار تحويل المحفظة (المرجع: ${planRequest.reference}). يقوم الأدمن بمراجعة التحويل وتفعيل حسابك كمؤلف.`}
                  {planRequest.status === "rejected" &&
                    (planRequest.rejectionReason || "يرجى مراجعة إشعار التحويل وإعادة المحاولة.")}
                </p>
              </div>
            </div>

            {planRequest.status === "active" ? (
              <Button asChild className="rounded-xl font-bold shadow-xs">
                <Link to="/publisher">
                  <FileText className="me-2 h-4 w-4" />
                  {l.t("نشر كتاب جديد", "Publish New Book")}
                </Link>
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="rounded-xl bg-background/80 px-3 py-1.5 text-xs font-mono font-bold border border-border/60">
                  {planRequest.status === "pending" ? "بانتظار تفعيل الأدمن" : "غير مفعّل"}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-3xl border border-primary/20 bg-primary/5 p-5 text-foreground flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold">
                إنشاء الحساب مجاني بالكامل!
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                لاستخدام الحساب كمؤلف ونشر الكتب، اختر إحدى باقات النشر أدناه وقم بتحويل المبلغ عبر المحفظة لتفعيل حسابك من قِبل الإدارة.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="plans" className="mt-10">
        <TabsList className="h-auto flex-wrap gap-1.5 p-1.5 bg-muted/70 rounded-2xl border border-border/60">
          <TabsTrigger
            value="plans"
            className="rounded-xl px-4 py-2.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:font-extrabold data-[state=active]:shadow-xs text-sm font-semibold transition-all cursor-pointer"
          >
            <Sparkles className="me-2 h-4 w-4 text-primary" />
            {l.t("خطط النشر (6 خطط)", "Publishing Plans (6)")}
          </TabsTrigger>
          <TabsTrigger
            value="manuscripts"
            className="rounded-xl px-4 py-2.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:font-extrabold data-[state=active]:shadow-xs text-sm font-semibold transition-all cursor-pointer"
          >
            <FileText className="me-2 h-4 w-4" />
            {l.t("مخطوطاتي ومشروعاتي", "My Manuscripts")}
            {manuscripts.length > 0 && (
              <span className="ms-1.5 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
                {manuscripts.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="library"
            className="rounded-xl px-4 py-2.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:font-extrabold data-[state=active]:shadow-xs text-sm font-semibold transition-all cursor-pointer"
          >
            <Library className="me-2 h-4 w-4" />
            {l.t("مكتبتي الرقمية", "Digital Library")}
          </TabsTrigger>
          <TabsTrigger
            value="orders"
            className="rounded-xl px-4 py-2.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:font-extrabold data-[state=active]:shadow-xs text-sm font-semibold transition-all cursor-pointer"
          >
            <Package className="me-2 h-4 w-4" />
            {l.t("طلباتي", "My Orders")}
            {orders.length > 0 && (
              <span className="ms-1.5 rounded-full bg-muted-foreground/15 px-2 py-0.5 text-xs font-bold">
                {orders.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="favorites"
            className="rounded-xl px-4 py-2.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:font-extrabold data-[state=active]:shadow-xs text-sm font-semibold transition-all cursor-pointer"
          >
            <Heart className="me-2 h-4 w-4" />
            {l.t("المفضلة", "Favorites")}
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="rounded-xl px-4 py-2.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:font-extrabold data-[state=active]:shadow-xs text-sm font-semibold transition-all cursor-pointer"
          >
            <Settings className="me-2 h-4 w-4" />
            {l.t("بيانات الحساب", "Account Settings")}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: 6 Publishing Plans */}
        <TabsContent value="plans" className="mt-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {l.t("اختر خطة النشر الأنسب لأهدافك الأدبية", "Choose Your Publishing Plan")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {l.t(
                  "تبدأ من الخطة المجانية لنشر أول كتاب، وتصل إلى الباقة السنوية لـ 12 كتاباً مع خدمات إنتاج وطباعة متكاملة.",
                  "From free 1-book starter to comprehensive 12-book annual tier.",
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-muted/60 p-2 text-xs font-medium text-muted-foreground border border-border/60">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>{l.t("أرباح المؤلف: 70% للرقمي و 30% للورقي", "Author: 70% digital / 30% print")}</span>
            </div>
          </div>

          {/* 6 Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {PUBLISHING_PLANS.map((plan) => {
              const isSelected = activePlanId === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col justify-between rounded-3xl border transition-all duration-300 p-6 sm:p-7 ${
                    plan.featured
                      ? "border-primary bg-card ring-2 ring-primary/30 shadow-lg scale-[1.02]"
                      : "border-border/80 bg-card hover:border-primary/40 hover:shadow-md"
                  }`}
                >
                  {/* Top Badge */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${plan.badgeStyle}`}
                      >
                        {plan.badge}
                      </span>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <Check className="h-3.5 w-3.5" /> {l.t("خطتك الحالية", "Active")}
                        </span>
                      )}
                    </div>

                    {/* Title & Tagline */}
                    <h3 className="mt-4 text-2xl font-extrabold text-foreground">{plan.title}</h3>
                    <p className="text-xs text-muted-foreground">{plan.tagline}</p>

                    {/* Books Counter */}
                    <div className="mt-4 flex items-center gap-2 rounded-2xl bg-muted/50 p-3 border border-border/50">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <div>
                        <div className="text-sm font-bold text-foreground">{plan.booksLabel}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {plan.price === 0
                            ? "متاحة فوراً بدون رسوم"
                            : `نشر وتجهيز ${plan.booksCount} إصدارات`}
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mt-5 border-y border-border/60 py-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                          {plan.priceDisplay}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{plan.priceNote}</p>
                    </div>

                    {/* Features List */}
                    <ul className="mt-5 space-y-3 text-sm">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-foreground/90">
                          <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                            <Check className="h-3 w-3" />
                          </div>
                          <span className="text-xs leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Button */}
                  <div className="mt-8 pt-4">
                    <Button
                      onClick={() => handleSelectPlan(plan)}
                      variant={plan.featured ? "default" : "outline"}
                      className={`w-full rounded-xl py-6 font-bold shadow-xs cursor-pointer transition-all ${
                        plan.featured
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "border-border hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                      }`}
                    >
                      {plan.ctaText}
                      <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Tab 2: Manuscripts */}
        <TabsContent value="manuscripts" className="mt-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6">
            <div>
              <h2 className="text-xl font-bold">{l.t("إدارة المخطوطات والإنتاج", "Manuscripts & Production")}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {l.t("تابع حالة تدقيق وإنتاج كتبك أو ارفع مخطوط Word جديد لمراجعته.", "Track production or submit new Word file.")}
              </p>
            </div>
            <Button asChild className="rounded-xl font-bold">
              <Link to="/publisher">
                <PenLine className="me-2 h-4 w-4" />
                {l.t("فتح استوديو المؤلف الكامل", "Open Author Studio")}
              </Link>
            </Button>
          </div>

          {manuscripts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/80 p-12 text-center bg-card/40">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/60" />
              <h3 className="mt-4 text-lg font-bold">{l.t("لا توجد مخطوطات مرفوعة بعد", "No manuscripts yet")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {l.t("يمكنك البدء بالخطة المجانية لنشر أول كتاب برفع ملف Word الآن.", "Start with the Free plan by uploading a Word file now.")}
              </p>
              <Button asChild className="mt-5 rounded-xl font-bold">
                <Link to="/publisher">
                  <FileText className="me-2 h-4 w-4" />
                  {l.t("رفع ملف Word جديد", "Upload Word Manuscript")}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {manuscripts.map((m) => (
                <div key={m.id} className="rounded-2xl border border-border bg-card p-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold">{m.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(m.created_at).toLocaleDateString(l.language)} · الصيغة: {m.format === "both" ? "رقمي وورقي" : m.format}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      {m.stage}
                    </span>
                    <Button asChild variant="outline" size="sm" className="rounded-lg">
                      <Link to="/publisher">{l.t("عرض التفاصيل", "View details")}</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Digital Library */}
        <TabsContent value="library" className="mt-8">
          {library.length === 0 ? (
            <Empty text={l.t("لم تشترِ كتباً رقمية بعد.", "Your digital library is empty.")} />
          ) : (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              {library.map((b) => (
                <div key={b.id} className="animate-rise">
                  {b.cover_url && (
                    <img
                      src={b.cover_url}
                      alt={b.title}
                      className="aspect-[2/3] w-full rounded-md object-cover shadow-book"
                    />
                  )}
                  <div className="mt-3 font-display font-semibold">{b.title}</div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 w-full"
                    onClick={() => download(b.file_path)}
                  >
                    <Download className="me-1 h-4 w-4" /> {l.t("تحميل", "Download")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 4: Orders */}
        <TabsContent value="orders" className="mt-8 space-y-4">
          {orders.length === 0 && <Empty text={l.t("لا توجد طلبات بعد.", "No orders yet.")} />}
          {orders.map((o) => (
            <div key={o.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span>
                  {l.t("طلب", "Order")} #{o.id.slice(0, 8)} ·{" "}
                  {new Date(o.created_at).toLocaleDateString(l.language)}
                </span>
                <span
                  className={`rounded-full px-3 py-0.5 text-xs font-semibold ${
                    o.status === "cancelled"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-accent"
                  }`}
                >
                  {o.status === "cancelled" ? l.t("ملغي", "Cancelled") : o.status}
                </span>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {o.order_items.map((i) => (
                  <li key={i.id} className="flex justify-between">
                    <span>
                      {i.books?.title} —{" "}
                      {i.format === "digital"
                        ? l.t("رقمي", "Digital")
                        : `${l.t("ورقي", "Print")} × ${i.quantity}`}
                    </span>
                    <span>{l.price(i.unit_price * i.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap items-center justify-between border-t pt-3 gap-2">
                <div className="font-bold text-lg">{l.price(o.total)}</div>
                {o.status !== "cancelled" &&
                  o.status !== "delivered" &&
                  o.status !== "shipped" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive/30 text-destructive hover:bg-destructive/10 text-xs rounded-full h-8 px-3 cursor-pointer"
                      onClick={async () => {
                        if (
                          !window.confirm(
                            l.t(
                              "هل أنت متأكد من إلغاء هذا الطلب؟",
                              "Are you sure you want to cancel this order?",
                            ),
                          )
                        )
                          return;
                        const { error } = await supabase
                          .from("orders")
                          .update({ status: "cancelled" })
                          .eq("id", o.id);
                        if (error) {
                          toast.error(l.t("تعذر إلغاء الطلب", "Could not cancel order"));
                        } else {
                          toast.success(l.t("تم إلغاء الطلب بنجاح", "Order cancelled successfully"));
                          qc.invalidateQueries({ queryKey: ["my-orders"] });
                        }
                      }}
                    >
                      {l.t("إلغاء الطلب", "Cancel order")}
                    </Button>
                  )}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* Tab 5: Favorites */}
        <TabsContent value="favorites" className="mt-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {favorites.map((f) =>
              f.books ? (
                <div key={f.book_id}>
                  <BookCard book={f.books} />
                  <Button
                    className="mt-3 w-full"
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await supabase.from("reader_favorites").delete().eq("book_id", f.book_id);
                      qc.invalidateQueries({ queryKey: ["favorites"] });
                    }}
                  >
                    {l.t("إزالة من المفضلة", "Remove favorite")}
                  </Button>
                </div>
              ) : null,
            )}
          </div>
          {favorites.length === 0 && <Empty text={l.t("لا توجد كتب مفضلة بعد", "No favorites yet")} />}
        </TabsContent>

        {/* Tab 6: Settings */}
        <TabsContent value="settings" className="mt-8">
          <form onSubmit={save} className="max-w-2xl space-y-5 rounded-2xl border border-border bg-card p-6">
            {(
              [
                "display_name",
                "shipping_name",
                "shipping_phone",
                "shipping_address",
              ] as const
            ).map((key, n) => (
              <div key={key}>
                <Label htmlFor={key}>
                  {l.t(
                    [
                      "الاسم",
                      "اسم مستلم الشحنة",
                      "هاتف الشحن",
                      "عنوان الشحن",
                    ][n] ?? "",
                    [
                      "Display name",
                      "Shipping recipient",
                      "Shipping phone",
                      "Shipping address",
                    ][n] ?? "",
                  )}
                </Label>
                {key === "shipping_address" ? (
                  <Textarea
                    id={key}
                    value={profile[key]}
                    onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
                    className="mt-1.5"
                  />
                ) : (
                  <Input
                    id={key}
                    value={profile[key]}
                    onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
                    className="mt-1.5"
                  />
                )}
              </div>
            ))}
            <p className="text-sm text-muted-foreground">
              {l.t("البلد واللغة والعملة", "Country, language & currency")}: {l.country} · {l.language} · {l.currency}
            </p>
            <Button className="rounded-xl font-bold">{l.t("حفظ البيانات", "Save details")}</Button>
          </form>
        </TabsContent>
      </Tabs>

      {/* Plan Subscription Dialog via Wallet Transfer */}
      <Dialog open={!!selectedPlanModal} onOpenChange={(open) => !open && setSelectedPlanModal(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8" dir="rtl">
          {selectedPlanModal && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                    {selectedPlanModal.badge}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{selectedPlanModal.tagline}</span>
                </div>
                <DialogTitle className="mt-2 text-2xl font-extrabold">
                  {selectedPlanModal.title} — {selectedPlanModal.booksLabel}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  إنشاء الحساب مجاني بالكامل. يتم تفعيل صلاحيات المؤلف ونشر الكتب بعد إرسال رسوم الباقة عبر تحويل المحفظة واعتمادها من الإدارة.
                </DialogDescription>
              </DialogHeader>

              {/* Price & Summary Box */}
              <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-4 sm:p-5 space-y-2.5">
                <div className="flex items-baseline justify-between border-b border-border/60 pb-3">
                  <span className="text-sm font-medium text-muted-foreground">قيمة الباقة المطلوبة:</span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-foreground">
                    {selectedPlanModal.priceDisplay}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>عدد الكتب المشمولة للنشر:</span>
                  <span className="font-bold text-foreground">{selectedPlanModal.booksLabel}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>نسبة أرباح المؤلف:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">70% رقمي · 30% ورقي</span>
                </div>
              </div>

              {/* Admin Wallet Details (For Paid Plans) */}
              {selectedPlanModal.price > 0 && (
                <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm">
                    <Wallet className="h-4 w-4" />
                    <span>بيانات محفظة الإدارة للتحويل</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    قم بتحويل مبلغ <strong className="text-foreground">{selectedPlanModal.priceDisplay}</strong> إلى رقم المحفظة التالي:
                  </p>

                  <div className="mt-3 flex items-center justify-between rounded-xl bg-card border border-border p-3">
                    <div>
                      <span className="text-[11px] text-muted-foreground">رقم المحفظة (فودافون كاش / إنستاباي / STC Pay):</span>
                      <p className="font-mono text-lg font-extrabold tracking-wider text-foreground" dir="ltr">
                        {adminWallet}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-lg h-9 px-3 text-xs font-semibold cursor-pointer"
                      onClick={() => {
                        navigator.clipboard.writeText(adminWallet);
                        toast.success("تم نسخ رقم محفظة الإدارة بنجاح!");
                      }}
                    >
                      <Copy className="me-1.5 h-3.5 w-3.5" />
                      نسخ
                    </Button>
                  </div>
                </div>
              )}

              {/* Transfer Details Form */}
              <form onSubmit={handleConfirmTransfer} className="mt-5 space-y-4">
                <div>
                  <Label htmlFor="author-name-input" className="text-xs font-semibold">
                    اسم المؤلف / المتجر
                  </Label>
                  <Input
                    id="author-name-input"
                    required
                    value={authorNameInput}
                    onChange={(e) => setAuthorNameInput(e.target.value)}
                    placeholder="مثال: د. أحمد محمد"
                    className="mt-1.5 rounded-xl text-sm"
                  />
                </div>

                {selectedPlanModal.price > 0 ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="wallet-sender-input" className="text-xs font-semibold">
                          رقم المحفظة المحوّل منها *
                        </Label>
                        <Input
                          id="wallet-sender-input"
                          required
                          dir="ltr"
                          value={walletSender}
                          onChange={(e) => setWalletSender(e.target.value)}
                          placeholder="010xxxxxxxx أو اسم الحساب"
                          className="mt-1.5 rounded-xl text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="reference-input" className="text-xs font-semibold">
                          رقم العملية أو المرجع (Reference) *
                        </Label>
                        <Input
                          id="reference-input"
                          required
                          dir="ltr"
                          value={reference}
                          onChange={(e) => setReference(e.target.value)}
                          placeholder="TX-123456 أو رقم الإشعار"
                          className="mt-1.5 rounded-xl text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="notes-input" className="text-xs font-semibold">
                        ملاحظات إضافية للتحويل (اختياري)
                      </Label>
                      <Textarea
                        id="notes-input"
                        value={transferNotes}
                        onChange={(e) => setTransferNotes(e.target.value)}
                        placeholder="أي تفاصيل إضافية لتسريع التأكيد..."
                        rows={2}
                        className="mt-1.5 rounded-xl text-sm"
                      />
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-950 dark:text-emerald-200">
                    الخطة الأولى مجانية لنشر كتاب واحد. سيتم إرسال طلب التفعيل إلى لوحة الإدارة لاعتماده فوراً.
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-2.5 pt-2">
                  <Button
                    type="submit"
                    disabled={submittingPlan}
                    className="w-full rounded-xl py-6 font-bold shadow-xs cursor-pointer text-base bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Zap className="me-2 h-5 w-5" />
                    {submittingPlan
                      ? "جارٍ إرسال الطلب للإدارة..."
                      : selectedPlanModal.price === 0
                      ? "إرسال طلب تفعيل الخطة المجانية للإدارة"
                      : "تأكيد وإرسال إشعار تحويل المحفظة للإدارة"}
                  </Button>

                  <Button
                    asChild
                    type="button"
                    variant="ghost"
                    className="w-full rounded-xl py-4 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    <a
                      href={`https://mail.google.com/mail/?view=cm&fs=1&to=darobaid@unigates.online&su=${encodeURIComponent(
                        `استفسار بخصوص تحويل باقة ${selectedPlanModal.title} - unibook`,
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Mail className="me-1.5 h-3.5 w-3.5 text-primary" />
                      مراسلة الدعم بخصوص التحويل (darobaid@unigates.online)
                    </a>
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  const { t } = useLocale();
  return (
    <div className="rounded-3xl border border-dashed border-border/80 p-12 text-center text-muted-foreground bg-card/30">
      <p>{text}</p>
      <Link to="/books" className="mt-3 inline-block font-semibold text-primary hover:underline">
        {t("تصفّح المتجر", "Browse books")}
      </Link>
    </div>
  );
}

