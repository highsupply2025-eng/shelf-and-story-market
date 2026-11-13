import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLocale, countries } from "@/lib/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookCard, type Book } from "@/components/BookCard";
import { mergeLocalBooks } from "@/lib/book-helpers";
import { toast } from "sonner";
import {
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
  User,
  Phone,
  MapPin,
  Truck,
  Globe,
  Coins,
  ShoppingBag,
  Trash2,
  CheckCircle2,
  Save,
} from "lucide-react";
import {
  getUserPlanRequest,
  submitPlanRequest,
  getAdminWalletNumber,
} from "@/lib/author-plans";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ProtectedBookReader } from "@/components/ProtectedBookReader";
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
    badge: "للكتّاب والمؤلفين",
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

const READER_TABS = ["library", "settings", "favorites", "orders", "currency"] as const;
const LOCAL_FAV_KEY = "unibook_local_favorites";

function getLocalFavoriteIds(userId?: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`${LOCAL_FAV_KEY}_${userId || "guest"}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalFavoriteIds(userId: string | undefined, ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${LOCAL_FAV_KEY}_${userId || "guest"}`, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

export function AccountView({ mode }: { mode: "reader" | "author" }) {
  const { session, refresh } = useAuth();
  const l = useLocale();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const defaultDisplayName =
    (session?.user.user_metadata?.["display_name"] as string | undefined) ||
    (session?.user.user_metadata?.["full_name"] as string | undefined) ||
    session?.user.email?.split("@")[0] ||
    "";

  const [profile, setProfile] = useState({
    display_name: defaultDisplayName,
    shipping_name: defaultDisplayName,
    shipping_phone: "",
    shipping_address: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [walletSender, setWalletSender] = useState("");
  const [reference, setReference] = useState("");
  const [authorNameInput, setAuthorNameInput] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [submittingPlan, setSubmittingPlan] = useState(false);
  const [readingBook, setReadingBook] = useState<{
    id: string;
    title: string;
    author: string;
    file_path?: string | null;
    pages?: number | null;
    cover_url?: string | null;
  } | null>(null);

  const [localFavIds, setLocalFavIdsState] = useState<string[]>(() =>
    getLocalFavoriteIds(session?.user.id)
  );

  useEffect(() => {
    setLocalFavIdsState(getLocalFavoriteIds(session?.user.id));
  }, [session?.user.id]);

  const accountMode = mode;

  const { data: planRequest, refetch: refetchPlanRequest } = useQuery({
    queryKey: ["my-plan-request", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      if (!session) return null;
      return getUserPlanRequest(session.user.id);
    },
  });

  const [selectedPlanModal, setSelectedPlanModal] = useState<PublishingPlan | null>(null);
  const [activePlanId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("unibook_selected_plan_id") || "plan-1";
    }
    return "plan-1";
  });

  function handleSelectPlan(plan: PublishingPlan) {
    setAuthorNameInput(
      profile.display_name || publisher?.store_name || session?.user.email?.split("@")[0] || ""
    );
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
        walletSender:
          walletSender.trim() || (selectedPlanModal.price === 0 ? "خطة مجانية" : "تحويل محفظة"),
        reference: reference.trim() || `TX-${Math.floor(100000 + Math.random() * 900000)}`,
        notes: transferNotes,
      });
      await refetchPlanRequest();
      setSelectedPlanModal(null);
      toast.success(
        selectedPlanModal.price === 0
          ? l.t(
              "تم تفعيل الخطة المجانية تلقائياً وبنجاح! يمكنك الآن استخدام استوديو المؤلف.",
              "Free plan activated automatically!"
            )
          : l.t(
              "تم إرسال إشعار تحويل المحفظة بنجاح! سيتم التحقق وتفعيل حسابك كمؤلف من خلال لوحة الإدارة.",
              "Wallet transfer submitted! Admin will activate after verification."
            )
      );
    } catch {
      toast.error(l.t("تعذر إرسال الطلب، يرجى المحاولة لاحقاً", "Could not submit request"));
    } finally {
      setSubmittingPlan(false);
    }
  }

  // Load profile from localStorage first (instant), then merge Supabase profile
  useEffect(() => {
    if (!session) return;
    const localKey = `unibook_reader_profile_${session.user.id}`;
    let hasLocal = false;
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(localKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          setProfile({
            display_name: parsed.display_name || defaultDisplayName,
            shipping_name: parsed.shipping_name || defaultDisplayName,
            shipping_phone: parsed.shipping_phone || "",
            shipping_address: parsed.shipping_address || "",
          });
          hasLocal = true;
        } else {
          setProfile((prev) => ({
            ...prev,
            display_name: prev.display_name || defaultDisplayName,
            shipping_name: prev.shipping_name || defaultDisplayName,
          }));
        }
      } catch {
        /* ignore */
      }
    }

    supabase
      .from("profiles")
      .select("display_name,shipping_name,shipping_phone,shipping_address")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfile((prev) => ({
            display_name: data.display_name || prev.display_name || defaultDisplayName,
            shipping_name: data.shipping_name || prev.shipping_name || defaultDisplayName,
            shipping_phone: data.shipping_phone || prev.shipping_phone || "",
            shipping_address: data.shipping_address || prev.shipping_address || "",
          }));
        } else if (!hasLocal) {
          setProfile((prev) => ({
            ...prev,
            display_name: prev.display_name || defaultDisplayName,
            shipping_name: prev.shipping_name || defaultDisplayName,
          }));
        }
      });
  }, [session?.user.id, defaultDisplayName]);

  const { data: catalogBooks = [] } = useQuery({
    queryKey: ["books", "reader-catalog"],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("books")
          .select("*")
          .eq("status", "approved")
          .order("featured", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(12);
        return mergeLocalBooks((data || []) as Book[]);
      } catch {
        return mergeLocalBooks([]);
      }
    },
  });

  const { data: publisher } = useQuery({
    queryKey: ["my-publisher-profile", session?.user?.id],
    enabled: !!session?.user?.id && accountMode === "author",
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
    enabled: !!session?.user?.id && accountMode === "author",
    queryFn: async () => {
      const { data } = await supabase
        .from("manuscripts")
        .select("*")
        .eq("author_id", session!.user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: remoteFavorites = [] } = useQuery({
    queryKey: ["favorites", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("reader_favorites")
          .select("book_id,books(*)");
        if (error) return [];
        return data ?? [];
      } catch {
        return [];
      }
    },
  });

  // Combine remote favorites with local favorites
  const favoriteBooks: Book[] = (() => {
    const map = new Map<string, Book>();
    for (const rf of remoteFavorites) {
      if (rf.books) {
        map.set(rf.book_id, rf.books as unknown as Book);
      }
    }
    for (const id of localFavIds) {
      if (!map.has(id)) {
        const found = catalogBooks.find((b) => b.id === id);
        if (found) map.set(id, found);
      }
    }
    return Array.from(map.values());
  })();

  function toggleLocalFavorite(bookId: string) {
    const exists = localFavIds.includes(bookId);
    const next = exists ? localFavIds.filter((id) => id !== bookId) : [...localFavIds, bookId];
    setLocalFavIdsState(next);
    setLocalFavoriteIds(session?.user.id, next);
    if (exists) {
      if (session?.user?.id) {
        supabase
          .from("reader_favorites")
          .delete()
          .eq("user_id", session.user.id)
          .eq("book_id", bookId)
          .then(() => {
            qc.invalidateQueries({ queryKey: ["favorites"] });
          });
      }
      toast.info(l.t("تمت إزالة الكتاب من المفضلة", "Removed from favorites"));
    } else {
      if (session?.user?.id) {
        supabase
          .from("reader_favorites")
          .upsert({ user_id: session.user.id, book_id: bookId }, { onConflict: "user_id,book_id" })
          .then(() => {
            qc.invalidateQueries({ queryKey: ["favorites"] });
          });
      }
      toast.success(l.t("تمت إضافة الكتاب إلى المفضلة", "Added to favorites"));
    }
  }

  const { data: orders = [] } = useQuery({
    queryKey: ["my-orders", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      if (!session) return [];
      try {
        const { data, error } = await supabase
          .from("orders")
          .select(
            "id,total,status,created_at,order_items(id,format,quantity,unit_price,books(id,title,cover_url,file_path))"
          )
          .eq("buyer_id", session.user.id)
          .order("created_at", { ascending: false });
        if (error) return [];
        return (data ?? []) as unknown as OrderRow[];
      } catch {
        return [];
      }
    },
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setSavingProfile(true);
    try {
      // Save locally first so it always persists immediately
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          `unibook_reader_profile_${session.user.id}`,
          JSON.stringify(profile)
        );
      }
      if (profile.display_name.trim()) {
        await supabase.auth.updateUser({ data: { display_name: profile.display_name.trim() } });
        await refresh();
      }
      await supabase.from("profiles").upsert({
        id: session.user.id,
        display_name: profile.display_name,
        shipping_name: profile.shipping_name,
        shipping_phone: profile.shipping_phone,
        shipping_address: profile.shipping_address,
      });
      toast.success(l.t("تم حفظ بيانات الحساب وعنوان الشحن بنجاح", "Account & shipping details saved successfully"));
    } catch {
      toast.success(l.t("تم حفظ بيانات الحساب بنجاح", "Account details saved successfully"));
    } finally {
      setSavingProfile(false);
    }
  }

  const library = Array.from(
    new Map(
      orders
        .flatMap((o) => o.order_items)
        .flatMap((i) => (i.format === "digital" && i.books ? [[i.books.id, i.books] as const] : []))
    ).values()
  );

  const adminWallet = getAdminWalletNumber();

  const [tab, setTab] = useState<string>(() => {
    if (accountMode === "reader") {
      if (typeof window !== "undefined") {
        const requested = window.sessionStorage.getItem("unibook_reader_tab");
        if (requested && (READER_TABS as readonly string[]).includes(requested)) {
          return requested;
        }
      }
      return "library";
    }
    return "plans";
  });

  useEffect(() => {
    if (accountMode !== "reader") return;
    const onReaderTab = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail && (READER_TABS as readonly string[]).includes(detail)) {
        setTab(detail);
        window.sessionStorage.removeItem("unibook_reader_tab");
      }
    };
    window.addEventListener("unibook_reader_tab", onReaderTab);
    return () => window.removeEventListener("unibook_reader_tab", onReaderTab);
  }, [accountMode]);

  useEffect(() => {
    const requested =
      typeof window !== "undefined" ? window.sessionStorage.getItem("unibook_reader_tab") : null;
    if (
      accountMode === "reader" &&
      requested &&
      (READER_TABS as readonly string[]).includes(requested)
    ) {
      window.sessionStorage.removeItem("unibook_reader_tab");
      setTab(requested);
    } else {
      setTab(accountMode === "reader" ? "library" : "plans");
    }
  }, [accountMode]);

  // Dynamic Hero Header info per Reader page
  const heroPages: Record<string, { badge: string; title: string; desc: string; icon: typeof BookOpen }> = {
    library: {
      badge: l.t("مكتبتي الرقمية · الصفحة الرئيسية", "My Digital Library · Home"),
      title: l.t("أهلاً بك في مكتبتك الرقمية", "Welcome to Your Digital Library"),
      desc: l.t(
        "استعرض كتبك الرقمية الجاهزة للقراءة الفورية بنظام الحماية الذكي، واستكشف أحدث إصدارات المنصة.",
        "Read your purchased digital books instantly with DRM protection and explore our latest releases."
      ),
      icon: Library,
    },
    favorites: {
      badge: l.t("قائمة المفضلة الشخصية", "Personal Favorites"),
      title: l.t("الكتب المحفوظة في مفضلتك", "Your Saved Favorite Books"),
      desc: l.t(
        "احتفظ بالكتب التي تنال إعجابك في قائمتك الخاصة للرجوع إليها أو اقتنائها في أي وقت.",
        "Keep track of the books you love in your personal wishlist to read or purchase anytime."
      ),
      icon: Heart,
    },
    orders: {
      badge: l.t("مركز الطلبات والشحنات", "Orders & Shipments Center"),
      title: l.t("طلباتي وتتبع الشحنات الورقية", "My Orders & Shipment Tracking"),
      desc: l.t(
        "تابع حالة طلباتك الرقمية والورقية ومراحل التجهيز والتوصيل خطوة بخطوة.",
        "Track your digital and print book orders and delivery status step by step."
      ),
      icon: Package,
    },
    settings: {
      badge: l.t("إعدادات القارئ والعنوان", "Reader Profile & Shipping"),
      title: l.t("بيانات الحساب وعنوان الشحن", "Account Details & Shipping Address"),
      desc: l.t(
        "حدّث اسمك وبيانات التواصل وعنوان التوصيل المعتمد لاستلام نسخك الورقية بسهولة.",
        "Update your personal details and default shipping address for print book deliveries."
      ),
      icon: Settings,
    },
    currency: {
      badge: l.t("تفضيلات التسعير والمنطقة", "Pricing & Regional Preferences"),
      title: l.t("العملة والمنطقة الجغرافية", "Currency & Geographic Region"),
      desc: l.t(
        "اختر عملتك المحلية ودولتك لعرض أسعار الكتب الرقمية والورقية وتكاليف الشحن بعملتك المفضلة.",
        "Choose your preferred currency and country to view book prices and shipping rates in your local currency."
      ),
      icon: Coins,
    },
  };
  const readerHeroMeta = heroPages[tab || "library"] ?? {
    badge: l.t("مساحة القارئ", "Reader Studio"),
    title: l.t("أهلاً بك في مكتبتك", "Welcome to your library"),
    desc: "",
    icon: BookOpen,
  };

  const HeroIcon = readerHeroMeta.icon;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:py-10">
      {/* Reader Mode Dynamic Header */}
      {accountMode === "reader" ? (
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card/95 to-primary/5 p-6 md:p-9 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-extrabold text-primary">
                <HeroIcon className="h-3.5 w-3.5" />
                <span>{readerHeroMeta.badge}</span>
              </div>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                {readerHeroMeta.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm sm:text-base text-muted-foreground leading-relaxed">
                {readerHeroMeta.desc}
              </p>
            </div>

            {/* Active Page Indicator Pill */}
            <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/80 px-4 py-3 backdrop-blur-xs shadow-2xs">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <HeroIcon className="h-5 w-5" />
              </span>
              <div>
                <div className="text-[11px] font-bold text-muted-foreground">
                  {l.t("القسم المفتوح حالياً", "Current Section")}
                </div>
                <div className="text-sm font-extrabold text-foreground">
                  {tab === "library" && l.t("مكتبتي الرقمية (الرئيسية)", "My Digital Library (Home)")}
                  {tab === "favorites" && l.t("قائمة المفضلة", "Favorites")}
                  {tab === "orders" && l.t("طلباتي والشحنات", "My Orders")}
                  {tab === "settings" && l.t("بيانات الحساب والشحن", "Account Details")}
                  {tab === "currency" && `${l.currentCountry.flag} ${l.t("العملة والمنطقة", "Currency")} (${l.currency})`}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Author Mode Header */
        <div className="space-y-6">
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
                    "Choose the right publishing plan for your digital and print books and start your journey."
                  )}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="rounded-2xl border border-border bg-background/80 px-4 py-2.5 backdrop-blur-xs">
                  <span className="text-xs text-muted-foreground">
                    {l.t("حساب المؤلف:", "Author Account:")}
                  </span>
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
                  <Link to="/author">
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
              className={`rounded-3xl border p-5 sm:p-6 transition-all ${
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
                      {planRequest.status === "active" &&
                        `🎉 باقة (${planRequest.planTitle}) مفعّلة بنجاح`}
                      {planRequest.status === "pending" &&
                        `⏳ طلب تفعيل (${planRequest.planTitle}) قيد المراجعة في لوحة الإدارة`}
                      {planRequest.status === "rejected" &&
                        `❌ تعذر تفعيل (${planRequest.planTitle})`}
                    </div>
                    <p className="mt-1 text-xs sm:text-sm opacity-90 leading-relaxed">
                      {planRequest.status === "active" &&
                        `حسابك كمؤلف نشط بالكامل. يمكنك الآن رفع المخطوطات والبدء بالإنتاج حتى ${planRequest.booksCount} كتب.`}
                      {planRequest.status === "pending" &&
                        `تم إرسال إشعار تحويل المحفظة (المرجع: ${planRequest.reference}). يقوم الأدمن بمراجعة التحويل وتفعيل حسابك كمؤلف.`}
                      {planRequest.status === "rejected" &&
                        (planRequest.rejectionReason ||
                          "يرجى مراجعة إشعار التحويل وإعادة المحاولة.")}
                    </p>
                  </div>
                </div>

                {planRequest.status === "active" ? (
                  <Button asChild className="rounded-xl font-bold shadow-xs">
                    <Link to="/author">
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
            <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5 text-foreground flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">إنشاء الحساب مجاني بالكامل!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    لاستخدام الحساب كمؤلف ونشر الكتب، اختر إحدى باقات النشر أدناه وقم بتحويل المبلغ عبر المحفظة لتفعيل حسابك من قِبل الإدارة.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="mt-8">
        <TabsList
          className={
            accountMode === "reader"
              ? "hidden"
              : "h-auto flex-wrap gap-1.5 p-1.5 bg-muted/70 rounded-2xl border border-border/60"
          }
        >
          {accountMode !== "reader" && (
            <>
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
                value="settings"
                className="rounded-xl px-4 py-2.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:font-extrabold data-[state=active]:shadow-xs text-sm font-semibold transition-all cursor-pointer"
              >
                <Settings className="me-2 h-4 w-4" />
                {l.t("بيانات الحساب", "Account Settings")}
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Author Tab 1: 6 Publishing Plans */}
        <TabsContent value="plans" className="mt-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {l.t("اختر خطة النشر الأنسب لأهدافك الأدبية", "Choose Your Publishing Plan")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {l.t(
                  "تبدأ من الخطة المجانية لنشر أول كتاب، وتصل إلى الباقة السنوية لـ 12 كتاباً مع خدمات إنتاج وطباعة متكاملة.",
                  "From free 1-book starter to comprehensive 12-book annual tier."
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-muted/60 p-2 text-xs font-medium text-muted-foreground border border-border/60">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>
                {l.t("أرباح المؤلف: 70% للرقمي و 30% للورقي", "Author: 70% digital / 30% print")}
              </span>
            </div>
          </div>

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

                    <h3 className="mt-4 text-2xl font-extrabold text-foreground">{plan.title}</h3>
                    <p className="text-xs text-muted-foreground">{plan.tagline}</p>

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

                    <div className="mt-5 border-y border-border/60 py-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                          {plan.priceDisplay}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{plan.priceNote}</p>
                    </div>

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

        {/* Author Tab 2: Manuscripts */}
        <TabsContent value="manuscripts" className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6">
            <div>
              <h2 className="text-xl font-bold">
                {l.t("إدارة المخطوطات والإنتاج", "Manuscripts & Production")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {l.t(
                  "تابع حالة تدقيق وإنتاج كتبك أو ارفع مخطوط Word جديد لمراجعته.",
                  "Track production or submit new Word file."
                )}
              </p>
            </div>
            <Button asChild className="rounded-xl font-bold">
              <Link to="/author">
                <PenLine className="me-2 h-4 w-4" />
                {l.t("فتح استوديو المؤلف الكامل", "Open Author Studio")}
              </Link>
            </Button>
          </div>

          {manuscripts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/80 p-12 text-center bg-card/40">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/60" />
              <h3 className="mt-4 text-lg font-bold">
                {l.t("لا توجد مخطوطات مرفوعة بعد", "No manuscripts yet")}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {l.t(
                  "يمكنك البدء بالخطة المجانية لنشر أول كتاب برفع ملف Word الآن.",
                  "Start with the Free plan by uploading a Word file now."
                )}
              </p>
              <Button asChild className="mt-5 rounded-xl font-bold">
                <Link to="/author">
                  <FileText className="me-2 h-4 w-4" />
                  {l.t("رفع ملف Word جديد", "Upload Word Manuscript")}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {manuscripts.map((m) => (
                <div
                  key={m.id}
                  className="rounded-2xl border border-border bg-card p-5 flex flex-wrap items-center justify-between gap-4"
                >
                  <div>
                    <h3 className="text-lg font-bold">{m.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(m.created_at).toLocaleDateString(l.language)} · الصيغة:{" "}
                      {m.format === "both" ? "رقمي وورقي" : m.format}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      {m.stage}
                    </span>
                    <Button asChild variant="outline" size="sm" className="rounded-lg">
                      <Link to="/author">{l.t("عرض التفاصيل", "View details")}</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ================================================================= */}
        {/* READER PAGE 1: مكتبتي الرقمية (الصفحة الرئيسية للحساب)            */}
        {/* ================================================================= */}
        <TabsContent value="library" className="mt-6 space-y-8">
          {/* Reader KPI Summary Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground">
                  {l.t("كتبي الرقمية", "My Digital Books")}
                </p>
                <p className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-foreground font-mono">
                  {library.length}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                  {l.t("جاهزة للقراءة الفورية", "Ready for instant reading")}
                </p>
              </div>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Library className="h-5 w-5" />
              </span>
            </div>

            <button
              type="button"
              onClick={() => setTab("favorites")}
              className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs flex items-center justify-between text-start hover:border-rose-500/40 transition-all cursor-pointer"
            >
              <div>
                <p className="text-xs font-bold text-muted-foreground">
                  {l.t("الكتب المفضلة", "Saved Favorites")}
                </p>
                <p className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-foreground font-mono">
                  {favoriteBooks.length}
                </p>
                <p className="text-[11px] text-rose-500 font-semibold mt-0.5">
                  {l.t("عرض قائمة المفضلة ←", "View favorites →")}
                </p>
              </div>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-500/10 text-rose-500">
                <Heart className="h-5 w-5" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTab("orders")}
              className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs flex items-center justify-between text-start hover:border-amber-500/40 transition-all cursor-pointer"
            >
              <div>
                <p className="text-xs font-bold text-muted-foreground">
                  {l.t("طلباتي وشحناتي", "My Orders")}
                </p>
                <p className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-foreground font-mono">
                  {orders.length}
                </p>
                <p className="text-[11px] text-amber-600 font-semibold mt-0.5">
                  {l.t("تتبع الطلبات والشحن ←", "Track orders →")}
                </p>
              </div>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-amber-600">
                <Package className="h-5 w-5" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTab("currency")}
              className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs flex items-center justify-between text-start hover:border-primary/40 transition-all cursor-pointer"
            >
              <div>
                <p className="text-xs font-bold text-muted-foreground">
                  {l.t("العملة والمنطقة", "Currency & Region")}
                </p>
                <p className="mt-1.5 text-xl sm:text-2xl font-extrabold text-foreground font-mono flex items-center gap-1.5">
                  <span>{l.currentCountry.flag}</span>
                  <span>{l.currency}</span>
                </p>
                <p className="text-[11px] text-primary font-semibold mt-0.5">
                  {l.t("تغيير العملة ←", "Change currency →")}
                </p>
              </div>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                <Coins className="h-5 w-5" />
              </span>
            </button>
          </div>

          {/* Owned Digital Books Section */}
          <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-2xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-foreground">
                    {l.t("مكتبتي الرقمية الخاصة", "My Purchased Digital Books")}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {l.t(
                      "جميع الكتب الرقمية التي قمت بشرائها متاحة للقراءة الفورية داخل القارئ الذكي المحمي.",
                      "All digital books you have purchased are ready for instant DRM-protected reading."
                    )}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="gap-1.5 py-1 px-3 font-bold text-xs border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                {l.t("قارئ unibook المحمي DRM", "DRM Protected Reader")}
              </Badge>
            </div>

            {library.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-8 sm:p-10 text-center space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Library className="h-7 w-7" />
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-foreground">
                  {l.t("مكتبتك الرقمية جاهزة لاستقبال أول كتاب", "Your digital library is ready for your first book")}
                </h3>
                <p className="mx-auto max-w-md text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {l.t(
                    "لم تقم بشراء كتب رقمية بعد. يمكنك استكشاف أحدث الكتب المتاحة بالأسفل وإضافتها إلى سلتك أو مفضلتك مباشرةً.",
                    "You haven't purchased any digital books yet. Explore our featured catalog below to add books to your cart or favorites."
                  )}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                {library.map((b) => (
                  <div
                    key={b.id}
                    className="group rounded-2xl border border-border/70 bg-background/60 p-3 transition-all hover:border-primary/40 hover:shadow-md"
                  >
                    {b.cover_url && (
                      <img
                        src={b.cover_url}
                        alt={b.title}
                        className="aspect-[2/3] w-full rounded-xl object-cover shadow-book"
                      />
                    )}
                    <div className="mt-3 font-display font-bold text-sm line-clamp-1">{b.title}</div>
                    <Button
                      size="sm"
                      className="mt-2.5 w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      onClick={() =>
                        setReadingBook({
                          id: b.id,
                          title: b.title,
                          author: "دار عبيد للنشر والتوزيع",
                          file_path: b.file_path,
                          cover_url: b.cover_url,
                        })
                      }
                    >
                      <BookOpen className="h-4 w-4" />
                      {l.t("قراءة الكتاب الآن", "Read Book Now")}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Store Discovery Catalog right inside Reader's Home (مكتبتي) */}
          {catalogBooks.length > 0 && (
            <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-2xs space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-foreground">
                      {l.t("أحدث إصدارات الكتب للقراءة والاقتناء", "Featured Books to Read & Collect")}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {l.t(
                        "تصفّح الإصدارات الرقمية والورقية المتوفرة، وأضف ما يعجبك إلى السلة أو قائمة المفضلة.",
                        "Browse available digital and print editions and add your favorites to your cart or wishlist."
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-xl font-bold border-primary/30 text-primary hover:bg-primary/5"
                >
                  <Link to="/cart">
                    <ShoppingBag className="me-1.5 h-4 w-4" />
                    {l.t("عرض سلة المشتريات", "View Shopping Cart")}
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                {catalogBooks.slice(0, 8).map((book) => {
                  const isFav = favoriteBooks.some((fb) => fb.id === book.id);
                  return (
                    <div key={book.id} className="flex flex-col justify-between space-y-2">
                      <BookCard book={book} />
                      <Button
                        type="button"
                        size="sm"
                        variant={isFav ? "default" : "outline"}
                        onClick={() => toggleLocalFavorite(book.id)}
                        className={`w-full rounded-xl text-xs font-bold cursor-pointer ${
                          isFav
                            ? "bg-rose-500 hover:bg-rose-600 text-white"
                            : "border-border/80 hover:border-rose-500/50 hover:text-rose-600"
                        }`}
                      >
                        <Heart className={`me-1.5 h-3.5 w-3.5 ${isFav ? "fill-current" : ""}`} />
                        {isFav
                          ? l.t("محفوظ في المفضلة", "Saved in Favorites")
                          : l.t("إضافة إلى المفضلة", "Add to Favorites")}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ================================================================= */}
        {/* READER PAGE 2: المفضلة (Favorites)                                */}
        {/* ================================================================= */}
        <TabsContent value="favorites" className="mt-6 space-y-6">
          <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-2xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-500/10 text-rose-500">
                  <Heart className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-foreground">
                    {l.t("كتبي المفضلة المحفوظة", "My Saved Favorite Books")}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {l.t(
                      "قائمتك الخاصة بالكتب التي حفظتها للرجوع إليها وشرائها في أي وقت.",
                      "Your personal wishlist of books saved for future reading and purchase."
                    )}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-extrabold px-3 py-1">
                {favoriteBooks.length} {l.t("كتاب في المفضلة", "Saved Books")}
              </Badge>
            </div>

            {favoriteBooks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-10 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
                  <Heart className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-extrabold text-foreground">
                    {l.t("قائمة المفضلة فارغة حالياً", "Your favorites list is currently empty")}
                  </h3>
                  <p className="mx-auto max-w-md text-xs sm:text-sm text-muted-foreground">
                    {l.t(
                      "اضغط على زر (إضافة إلى المفضلة) على أي كتاب في مكتبتك لحفظه هنا والوصول إليه بسهولة.",
                      "Click 'Add to Favorites' on any book in your library view to save it here."
                    )}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => setTab("library")}
                  className="rounded-xl font-bold cursor-pointer"
                >
                  <Library className="me-2 h-4 w-4" />
                  {l.t("استكشاف الكتب في مكتبتي", "Explore Books in My Library")}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
                {favoriteBooks.map((book) => (
                  <div
                    key={book.id}
                    className="flex flex-col justify-between rounded-2xl border border-border/70 bg-background/50 p-3 shadow-2xs"
                  >
                    <BookCard book={book} />
                    <Button
                      className="mt-3 w-full rounded-xl text-xs font-bold border-destructive/30 text-destructive hover:bg-destructive/10 cursor-pointer"
                      size="sm"
                      variant="outline"
                      onClick={() => toggleLocalFavorite(book.id)}
                    >
                      <Trash2 className="me-1.5 h-3.5 w-3.5" />
                      {l.t("إزالة من المفضلة", "Remove from Favorites")}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ================================================================= */}
        {/* READER PAGE 3: طلباتي وتتبع الشحنات (Orders)                      */}
        {/* ================================================================= */}
        <TabsContent value="orders" className="mt-6 space-y-6">
          {/* Orders KPI Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground">
                  {l.t("إجمالي الطلبات", "Total Orders")}
                </p>
                <p className="mt-1.5 text-3xl font-extrabold text-foreground font-mono">
                  {orders.length}
                </p>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Package className="h-5 w-5" />
              </span>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground">
                  {l.t("طلبات نشطة / قيد الشحن", "Active Shipments")}
                </p>
                <p className="mt-1.5 text-3xl font-extrabold text-amber-600 font-mono">
                  {orders.filter((o) => o.status !== "cancelled" && o.status !== "delivered").length}
                </p>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-500/10 text-amber-600">
                <Truck className="h-5 w-5" />
              </span>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground">
                  {l.t("إجمالي قيمة المشتريات", "Total Purchases")}
                </p>
                <p className="mt-1.5 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                  {l.price(
                    orders
                      .filter((o) => o.status !== "cancelled")
                      .reduce((acc, o) => acc + (Number(o.total) || 0), 0)
                  )}
                </p>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                <ShoppingBag className="h-5 w-5" />
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-2xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
                  <Package className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-foreground">
                    {l.t("سجل الطلبات وتتبع الشحنات", "Order History & Shipment Tracking")}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {l.t(
                      "تفاصيل كافة طلباتك الرقمية والورقية وحالة توصيل كل شحنة.",
                      "Details of all your digital and print orders and delivery status."
                    )}
                  </p>
                </div>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-10 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
                  <Package className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-extrabold text-foreground">
                    {l.t("لا توجد طلبات مسجلة بعد", "No orders placed yet")}
                  </h3>
                  <p className="mx-auto max-w-md text-xs sm:text-sm text-muted-foreground">
                    {l.t(
                      "عندما تقوم بشراء كتب رقمية أو طلب نسخ ورقية، ستظهر جميع تفاصيل الطلب ومراحل الشحن هنا.",
                      "When you purchase digital or print books, your order details and shipment tracking will appear here."
                    )}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => setTab("library")}
                  className="rounded-xl font-bold cursor-pointer"
                >
                  <BookOpen className="me-2 h-4 w-4" />
                  {l.t("العودة إلى مكتبتي واستكشاف الكتب", "Return to My Library")}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((o) => (
                  <div
                    key={o.id}
                    className="rounded-2xl border border-border/80 bg-background/60 p-5 space-y-4 transition-all hover:border-primary/40"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary font-mono text-xs font-extrabold">
                          #{o.id.slice(0, 4)}
                        </span>
                        <div>
                          <div className="font-extrabold text-sm text-foreground">
                            {l.t("طلب رقم", "Order")} #{o.id.slice(0, 8)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(o.created_at).toLocaleDateString(l.language)}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-3.5 py-1 text-xs font-extrabold ${
                          o.status === "cancelled"
                            ? "bg-destructive/10 text-destructive border border-destructive/30"
                            : o.status === "delivered"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {o.status === "cancelled"
                          ? l.t("ملغي", "Cancelled")
                          : o.status === "delivered"
                            ? l.t("تم التسليم", "Delivered")
                            : o.status === "shipped"
                              ? l.t("خرج للشحن", "Shipped")
                              : l.t("قيد التجهيز والمراجعة", "Processing")}
                      </span>
                    </div>

                    <ul className="space-y-2 text-sm">
                      {o.order_items.map((i) => (
                        <li
                          key={i.id}
                          className="flex items-center justify-between rounded-xl bg-card p-3 border border-border/50"
                        >
                          <div className="flex items-center gap-2.5">
                            <BookOpen className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-bold text-foreground">
                              {i.books?.title}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {i.format === "digital"
                                ? l.t("نسخة رقمية", "Digital")
                                : `${l.t("نسخة ورقية", "Print")} × ${i.quantity}`}
                            </Badge>
                          </div>
                          <span className="font-mono font-bold text-foreground">
                            {l.price(i.unit_price * i.quantity)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <div className="flex flex-wrap items-center justify-between border-t border-border/60 pt-3 gap-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs text-muted-foreground">
                          {l.t("الإجمالي:", "Total:")}
                        </span>
                        <span className="font-extrabold text-lg text-primary font-mono">
                          {l.price(o.total)}
                        </span>
                      </div>
                      {o.status !== "cancelled" &&
                        o.status !== "delivered" &&
                        o.status !== "shipped" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-destructive/30 text-destructive hover:bg-destructive/10 text-xs rounded-xl h-9 px-4 font-bold cursor-pointer"
                            onClick={async () => {
                              if (
                                !window.confirm(
                                  l.t(
                                    "هل أنت متأكد من إلغاء هذا الطلب؟",
                                    "Are you sure you want to cancel this order?"
                                  )
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
                                toast.success(
                                  l.t("تم إلغاء الطلب بنجاح", "Order cancelled successfully")
                                );
                                qc.invalidateQueries({ queryKey: ["my-orders"] });
                              }
                            }}
                          >
                            {l.t("إلغاء الطلب", "Cancel Order")}
                          </Button>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ================================================================= */}
        {/* READER PAGE 4: بيانات الحساب وعنوان الشحن (Settings)              */}
        {/* ================================================================= */}
        <TabsContent value="settings" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Account Identity & Quick Summary Card */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-7 shadow-2xs space-y-6 flex flex-col justify-between">
              <div className="space-y-5">
                <div className="flex items-center gap-3.5">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                    <User className="h-7 w-7" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Badge
                      variant="outline"
                      className="mb-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-extrabold"
                    >
                      <CheckCircle2 className="me-1 h-3 w-3" />
                      {l.t("حساب قارئ مفعّل", "Active Reader Account")}
                    </Badge>
                    <h3 className="truncate text-lg font-extrabold text-foreground">
                      {profile.display_name || defaultDisplayName || l.t("قارئ unibook", "unibook Reader")}
                    </h3>
                    <p className="truncate text-xs font-mono text-muted-foreground" dir="ltr">
                      {session?.user.email}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-semibold">
                      {l.t("نوع العضوية:", "Membership:")}
                    </span>
                    <span className="font-extrabold text-foreground">
                      {l.t("قارئ معتمد", "Verified Reader")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-semibold">
                      {l.t("المنطقة والعملة:", "Region & Currency:")}
                    </span>
                    <span className="font-mono font-extrabold text-foreground">
                      {l.currentCountry.flag} {l.country} · {l.currency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-semibold">
                      {l.t("لغة الواجهة:", "Interface Language:")}
                    </span>
                    <span className="font-extrabold text-primary">
                      {l.language === "ar" ? "العربية" : "English"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTab("currency")}
                  className="w-full rounded-xl justify-between font-bold text-xs cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-amber-600" />
                    {l.t("تعديل العملة والمنطقة الجغرافية", "Change Currency & Region")}
                  </span>
                  <span className="font-mono text-[11px]">
                    {l.currentCountry.flag} {l.currency}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => l.set({ language: l.language === "ar" ? "en" : "ar" })}
                  className="w-full rounded-xl justify-between font-bold text-xs cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    {l.t("تبديل لغة المنصة", "Switch Platform Language")}
                  </span>
                  <span className="text-[11px] text-primary">
                    {l.language === "ar" ? "English" : "العربية"}
                  </span>
                </Button>
              </div>
            </div>

            {/* Column 2 & 3: Professional Personal & Shipping Details Form */}
            <form
              onSubmit={save}
              className="lg:col-span-2 rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-2xs space-y-6"
            >
              <div className="flex items-center gap-3 border-b border-border/60 pb-4">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Settings className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-foreground">
                    {l.t(
                      "البيانات الشخصية وعنوان توصيل الكتب الورقية",
                      "Personal Info & Print Books Shipping Address"
                    )}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {l.t(
                      "تُستخدم هذه البيانات لتخصيص حسابك وتوصيل طلبات الكتب المطبوعة إلى باب منزلك.",
                      "Used to personalize your account and deliver printed book orders to your doorstep."
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="display_name" className="text-xs font-extrabold flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-primary" />
                    {l.t("الاسم الكامل للقارئ", "Full Display Name")}
                  </Label>
                  <Input
                    id="display_name"
                    value={profile.display_name}
                    onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                    placeholder={l.t("مثال: محمد السيد أحمد", "e.g. Mohammed Ahmed")}
                    className="h-11 rounded-xl bg-background/60"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shipping_name" className="text-xs font-extrabold flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-primary" />
                    {l.t("اسم مستلم الشحنة الورقية", "Shipping Recipient Name")}
                  </Label>
                  <Input
                    id="shipping_name"
                    value={profile.shipping_name}
                    onChange={(e) => setProfile({ ...profile, shipping_name: e.target.value })}
                    placeholder={l.t("الاسم الثلاثي لمستلم الشحنة", "Recipient full name")}
                    className="h-11 rounded-xl bg-background/60"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="shipping_phone" className="text-xs font-extrabold flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    {l.t("رقم الجوال للتواصل عند التوصيل", "Shipping Phone Number")}
                  </Label>
                  <Input
                    id="shipping_phone"
                    dir="ltr"
                    value={profile.shipping_phone}
                    onChange={(e) => setProfile({ ...profile, shipping_phone: e.target.value })}
                    placeholder="+966 5X XXX XXXX / +20 10X XXX XXXX"
                    className="h-11 rounded-xl bg-background/60 font-mono"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="shipping_address" className="text-xs font-extrabold flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {l.t(
                      "العنوان التفصيلي للشحن (الدولة، المدينة، الحي، الشارع، رقم المبنى)",
                      "Detailed Shipping Address (Country, City, District, Street, Building)"
                    )}
                  </Label>
                  <Textarea
                    id="shipping_address"
                    rows={3}
                    value={profile.shipping_address}
                    onChange={(e) => setProfile({ ...profile, shipping_address: e.target.value })}
                    placeholder={l.t(
                      "اكتب عنوان التوصيل بالتفصيل لضمان وصول النسخ الورقية بسرعة ودقة...",
                      "Enter your full delivery address for fast and accurate shipping..."
                    )}
                    className="rounded-xl bg-background/60"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-4">
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    {l.t(
                      "بياناتك مشفرة ومحفوظة بأمان لطلباتك القادمة.",
                      "Your information is securely saved for future orders."
                    )}
                  </span>
                </div>
                <Button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-xl px-8 py-5 font-extrabold shadow-sm cursor-pointer"
                >
                  <Save className="me-2 h-4 w-4" />
                  {savingProfile
                    ? l.t("جارٍ الحفظ...", "Saving...")
                    : l.t("حفظ وتحديث بيانات الحساب", "Save Account Details")}
                </Button>
              </div>
            </form>
          </div>
        </TabsContent>

        {/* ================================================================= */}
        {/* READER PAGE 5: العملة والمنطقة الجغرافية (Currency & Region)      */}
        {/* ================================================================= */}
        <TabsContent value="currency" className="mt-6 space-y-6">
          <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-2xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-500/10 text-amber-600">
                  <Coins className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-foreground">
                    {l.t("اختيار العملة والمنطقة الجغرافية", "Select Your Currency & Region")}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {l.t(
                      "اختر دولتك وعملتك المفضلة ليتم تحويل وعرض جميع أسعار الكتب وتكاليف الشحن تلقائياً.",
                      "Select your country and currency to automatically convert all book prices and shipping rates."
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-2.5">
                <span className="text-2xl leading-none">{l.currentCountry.flag}</span>
                <div>
                  <div className="text-[10px] font-bold text-muted-foreground">
                    {l.t("العملة الفعّالة حالياً", "Active Currency")}
                  </div>
                  <div className="text-sm font-extrabold text-primary font-mono">
                    {l.language === "ar" ? l.currentCountry.nameAr : l.currentCountry.nameEn} ({l.currency})
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Countries & Currencies Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {countries.map((c) => {
                const isSelected = l.currentCountry.code === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      l.set(
                        {
                          country: c.code,
                          currency: c.currency,
                          language: ["EG", "SA", "AE", "KW", "QA", "BH", "OM", "JO"].includes(
                            c.code
                          )
                            ? "ar"
                            : l.language,
                        },
                        true
                      );
                      toast.success(
                        l.t(
                          `تم تغيير المنطقة والعملة إلى ${c.nameAr} (${c.currency})`,
                          `Region & currency updated to ${c.nameEn} (${c.currency})`
                        )
                      );
                    }}
                    className={`flex items-center justify-between rounded-2xl border p-4 text-start transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/10 ring-2 ring-primary/25 shadow-xs"
                        : "border-border/80 bg-background/60 hover:border-primary/40 hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="text-3xl leading-none shrink-0">{c.flag}</span>
                      <div className="min-w-0">
                        <div className="font-extrabold text-sm text-foreground truncate">
                          {l.language === "ar" ? c.nameAr : c.nameEn}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">
                          {l.t("العملة:", "Currency:")} <strong className="text-foreground">{c.currency}</strong>
                        </div>
                      </div>
                    </div>

                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-extrabold text-primary-foreground shrink-0">
                        <Check className="h-3.5 w-3.5" />
                        {l.t("مفعّلة", "Active")}
                      </span>
                    ) : (
                      <span className="rounded-xl border border-border/80 bg-card px-2.5 py-1 font-mono text-xs font-bold text-muted-foreground shrink-0">
                        {c.currency}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Plan Subscription Dialog via Wallet Transfer */}
      <Dialog
        open={!!selectedPlanModal}
        onOpenChange={(open) => !open && setSelectedPlanModal(null)}
      >
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

              <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-4 sm:p-5 space-y-2.5">
                <div className="flex items-baseline justify-between border-b border-border/60 pb-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    قيمة الباقة المطلوبة:
                  </span>
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
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    70% رقمي · 30% ورقي
                  </span>
                </div>
              </div>

              {selectedPlanModal.price > 0 && (
                <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm">
                    <Wallet className="h-4 w-4" />
                    <span>بيانات محفظة الإدارة للتحويل</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    قم بتحويل مبلغ{" "}
                    <strong className="text-foreground">{selectedPlanModal.priceDisplay}</strong> إلى
                    رقم المحفظة التالي:
                  </p>

                  <div className="mt-3 flex items-center justify-between rounded-xl bg-card border border-border p-3">
                    <div>
                      <span className="text-[11px] text-muted-foreground">
                        رقم المحفظة (فودافون كاش / إنستاباي / STC Pay):
                      </span>
                      <p
                        className="font-mono text-lg font-extrabold tracking-wider text-foreground"
                        dir="ltr"
                      >
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
                    الخطة الأولى مجانية لنشر كتاب واحد، وتُفعّل تلقائياً وفوراً بمجرد التأكيد دون انتظار موافقة الإدارة.
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
                      ? selectedPlanModal.price === 0 ? "جارٍ تفعيل الخطة المجانية..." : "جارٍ إرسال الطلب للإدارة..."
                      : selectedPlanModal.price === 0
                        ? "تفعيل الخطة المجانية تلقائياً الآن"
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
                        `استفسار بخصوص تحويل باقة ${selectedPlanModal.title} - unibook`
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

      {/* Protected In-App Reader (Zero-Download DRM) */}
      {readingBook && (
        <ProtectedBookReader
          book={readingBook}
          open={!!readingBook}
          onClose={() => setReadingBook(null)}
        />
      )}
    </div>
  );
}
