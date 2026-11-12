import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ShoppingBag,
  LogOut,
  PenLine,
  Building2,
  ShieldCheck,
  BookOpen,
  ChevronDown,
  LayoutDashboard,
  Library,
  Home,
  Sparkles,
  ArrowUpRight,
  MessageSquare,
  Globe,
  Clock,
  XCircle,
  Heart,
  Package,
  Settings,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth, clearLocalSession } from "@/lib/auth";
import { getUserApprovalStatus } from "@/lib/admin-store";
import { useCart } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useLocale, countries } from "@/lib/locale";
import { AdminAuthModal } from "@/components/AdminAuthModal";
import { Badge } from "@/components/ui/badge";
import { useAppMode } from "@/lib/useAppMode";

export function SiteHeader() {
  const { t, language, currency, currentCountry, set } = useLocale();
  const { session, isAdmin, accountType } = useAuth();
  const [, setApprovalTick] = useState(0);

  useEffect(() => {
    const onUpdate = () => setApprovalTick((n) => n + 1);
    window.addEventListener("unibook_admin_update", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("unibook_admin_update", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  function toggleLanguage() {
    const nextLang = language === "ar" ? "en" : "ar";
    set({ language: nextLang });
  }

  function selectReaderTab(tabName: "library" | "settings" | "favorites" | "orders") {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("unibook_reader_tab", tabName);
      window.dispatchEvent(new CustomEvent("unibook_reader_tab", { detail: tabName }));
    }
    navigate({ to: "/account" });
  }
  const { count } = useCart();
  const { isAppExperience } = useAppMode();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    clearLocalSession();
    try {
      await qc.cancelQueries();
      qc.clear();
      await supabase.auth.signOut({ scope: "local" });
    } catch (err) {
      console.warn("Sign out notice:", err);
    }
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    toast.success(t("تم تسجيل الخروج بنجاح", "Logged out successfully"));
    if (typeof window !== "undefined") {
      try {
        for (const k of Object.keys(window.localStorage)) {
          if (k.startsWith("sb-") && k.endsWith("-auth-token")) {
            window.localStorage.removeItem(k);
          }
        }
      } catch {
        /* ignore */
      }
      window.location.replace("/");
    } else {
      navigate({ to: "/" });
    }
  }

  const [logoClicks, setLogoClicks] = useState(0);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [adminModalOpen, setAdminModalOpen] = useState(false);

  function handleLogoClick(e: React.MouseEvent) {
    const nextCount = logoClicks + 1;
    setLogoClicks(nextCount);
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    if (nextCount > 1 && nextCount < 5) e.preventDefault();
    if (nextCount >= 5) {
      e.preventDefault();
      e.stopPropagation();
      setLogoClicks(0);
      const isCurrentAdmin = isAdmin || session?.user?.email?.toLowerCase().trim() === "highsupply2025@gmail.com";
      if (isCurrentAdmin) navigate({ to: "/admin" });
      else setAdminModalOpen(true);
      return;
    }
    clickTimeoutRef.current = setTimeout(() => setLogoClicks(0), 3000);
  }

  // Account role configuration
  const roleConfig = {
    admin: {
      label: t("إدارة المنصة", "Admin"),
      fullBadge: t("إدارة unibook العليا", "Chief Admin"),
      dash: t("لوحة الإدارة", "Admin dashboard"),
      icon: ShieldCheck,
      to: "/admin" as const,
      color: "text-rose-600 bg-rose-500/10 border-rose-500/30",
      accentBg: "from-rose-500 to-amber-600",
    },
    publisher: {
      label: t("ناشر", "Publisher"),
      fullBadge: t("حساب دار نشر", "Publisher"),
      dash: t("لوحة دار النشر", "Publisher dashboard"),
      icon: Building2,
      to: "/publisher" as const,
      color: "text-blue-600 bg-blue-500/10 border-blue-500/30",
      accentBg: "from-blue-600 to-indigo-700",
    },
    author: {
      label: t("مؤلف", "Author"),
      fullBadge: t("حساب مؤلف", "Author"),
      dash: t("استوديو المؤلف", "Author studio"),
      icon: PenLine,
      to: "/author" as const,
      color: "text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30",
      accentBg: "from-amber-600 to-orange-600",
    },
    reader: {
      label: t("قارئ", "Reader"),
      fullBadge: t("حساب قارئ", "Reader"),
      dash: t("لوحة القارئ", "Reader dashboard"),
      icon: BookOpen,
      to: "/account" as const,
      color: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
      accentBg: "from-emerald-600 to-teal-700",
    },
  }[accountType];

  const RoleIcon = roleConfig.icon;
  const name =
    (session?.user.user_metadata?.["display_name"] as string | undefined) ||
    (session?.user.user_metadata?.["full_name"] as string | undefined) ||
    session?.user.email?.split("@")[0] ||
    "";

  // Check whether a Reader, Author, or Publisher account is logged in
  const isUserAccountLogged = Boolean(session) && !isAdmin;
  const approvalStatus = isAdmin
    ? "approved"
    : session
      ? getUserApprovalStatus(session.user.id, session.user.email)
      : "pending";

  const showCart = !session || accountType === "reader" || isAdmin;

  const linkCls =
    "text-[14px] md:text-[15px] font-semibold text-foreground/80 hover:text-primary transition-colors px-3 py-2 rounded-xl hover:bg-primary/5 [&.active]:text-primary [&.active]:bg-primary/10 flex items-center gap-2";
  const iconBtn =
    "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-card text-foreground transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary shadow-xs cursor-pointer";

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-1.5 md:min-h-18 md:gap-6 md:px-8">
        
        {/* Brand Logo with 5-click easter egg + Account Role label underneath when logged in */}
        <Link
          to={isUserAccountLogged ? roleConfig.to : "/"}
          onClick={handleLogoClick}
          className="flex min-w-0 flex-col items-center justify-center group cursor-pointer select-none shrink-0"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card border border-border/80 shadow-xs md:h-10 md:w-10 transition-transform group-hover:scale-105">
              <img src="/logo-icon.png" alt="unibook" className="h-6 w-auto object-contain md:h-7" />
            </div>
            <span className="truncate font-display text-2xl font-extrabold tracking-tight text-foreground group-hover:text-primary md:text-3xl leading-none">
              unibook
            </span>
          </div>
          {session && (
            <span
              className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold leading-none ${roleConfig.color}`}
            >
              <RoleIcon className="h-3 w-3" />
              <span>
                {accountType === "reader"
                  ? t("قارئ", "Reader")
                  : accountType === "author"
                    ? t("مؤلف", "Author")
                    : accountType === "publisher"
                      ? t("ناشر", "Publisher")
                      : t("إدارة المنصة", "Admin")}
              </span>
            </span>
          )}
        </Link>

        {/* Navigation Links:
            When logged into Reader, Author, or Publisher account:
            Hide الرئيسية, المتجر, and انشر كتاب, and keep تواصل معنا */}
        {!isAppExperience && (
          <nav className="flex items-center gap-1">
            {!isUserAccountLogged && (
              <div className="hidden items-center gap-1 md:flex">
                <Link to="/" className={linkCls} activeOptions={{ exact: true }}>
                  <Home className="h-4 w-4 opacity-75" />
                  <span>{t("الرئيسية", "Home")}</span>
                </Link>
                <Link to="/books" className={linkCls}>
                  <Library className="h-4 w-4 opacity-75" />
                  <span>{t("المتجر", "Bookshop")}</span>
                </Link>
                <a
                  href="https://wa.me/966563057356?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20unibook%D8%8C%20%D8%A3%D8%B1%D8%BA%D8%A8%20%D9%81%D9%8A%20%D9%86%D8%B4%D8%B1%20%D9%83%D8%AA%D8%A7%D8%A8%D9%8A%20%D9%85%D8%B9%D9%83%D9%85."
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkCls}
                >
                  <PenLine className="h-4 w-4 opacity-75" />
                  <span>{t("انشر كتاب", "Publish")}</span>
                </a>
              </div>
            )}
            <Link to="/contact" className={linkCls}>
              <MessageSquare className="h-4 w-4 opacity-75" />
              <span>{t("تواصل معنا", "Contact")}</span>
            </Link>
          </nav>
        )}

        {/* Top Header Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          
          {/* Geo Currency & Country Selector Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-10 items-center gap-1.5 rounded-full border border-border/80 bg-card px-2 sm:px-2.5 text-foreground transition-all hover:border-primary/50 hover:bg-primary/5 shadow-xs cursor-pointer select-none active:scale-95"
                title={t("المنطقة الجغرافية والعملة التلقائية", "Geographic Region & Currency")}
              >
                <span className="text-sm sm:text-base leading-none">{currentCountry.flag}</span>
                <span className="text-[10px] sm:text-xs font-mono font-bold">
                  {currency}
                </span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 p-2 rounded-2xl shadow-xl border border-border/80 bg-card max-h-80 overflow-y-auto">
              <div className="px-2.5 py-1.5 text-xs font-bold text-muted-foreground border-b border-border/50 mb-1 flex items-center justify-between">
                <span>{t("تحديد المنطقة والعملة", "Select Region & Currency")}</span>
                <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">تلقائي جغرافي</span>
              </div>
              {countries.map((c) => (
                <DropdownMenuItem
                  key={c.code}
                  onClick={() => set({ country: c.code, currency: c.currency, language: ["EG", "SA", "AE", "KW", "QA", "BH", "OM", "JO"].includes(c.code) ? "ar" : language }, true)}
                  className={`flex items-center justify-between p-2 rounded-xl text-xs font-bold cursor-pointer ${
                    currentCountry.code === c.code ? "bg-primary/10 text-primary" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-base leading-none shrink-0">{c.flag}</span>
                    <span className="truncate">{language === "ar" ? c.nameAr : c.nameEn}</span>
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground font-semibold shrink-0">{c.currency}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Language Switcher Icon Button (عربي / EN) — shown in header only when not logged in; inside dropdown menu when logged in */}
          {!session && (
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex h-10 items-center gap-1.5 rounded-full border border-border/80 bg-card px-2.5 sm:px-3 text-foreground transition-all hover:border-primary/50 hover:bg-primary/5 shadow-xs cursor-pointer select-none active:scale-95"
              aria-label={language === "ar" ? "Switch to English" : "التبديل إلى العربية"}
              title={language === "ar" ? "Switch to English" : "التبديل إلى العربية"}
            >
              <Globe className="h-4 w-4 text-primary" />
              <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider">
                {language === "ar" ? "EN" : "عربي"}
              </span>
            </button>
          )}

          {/* السلة (Cart Icon): Visible only for Reader account (or unauthenticated / admin) */}
          {showCart && (
            <Link to="/cart" className={iconBtn} aria-label={t("السلة", "Cart")}>
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -top-1 -start-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground shadow-xs animate-in zoom-in">
                  {count}
                </span>
              )}
            </Link>
          )}

          {/* دخول (Login Button or Active Profile) */}
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 rounded-full border border-border/80 bg-card py-1 ps-1 pe-2.5 sm:pe-3.5 text-xs sm:text-sm font-bold transition-all hover:border-primary/50 hover:shadow-xs cursor-pointer select-none ring-1 ring-border/30"
                  aria-label={roleConfig.dash}
                >
                  {/* Active Indicator & Avatar Icon */}
                  <div className="relative">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-xs">
                      <RoleIcon className="h-4 w-4" />
                    </span>
                    <span className="absolute -bottom-0.5 -start-0.5 flex h-2.5 w-2.5">
                      <span
                        className={`relative inline-flex h-2.5 w-2.5 rounded-full border border-background ${
                          approvalStatus === "approved"
                            ? "bg-emerald-500"
                            : approvalStatus === "rejected"
                              ? "bg-destructive"
                              : "bg-amber-500 animate-pulse"
                        }`}
                      />
                    </span>
                  </div>

                  {/* Account Text info */}
                  <div className="flex flex-col items-start text-start leading-tight">
                    <span className="max-w-24 sm:max-w-36 truncate font-extrabold text-foreground text-[12px] sm:text-[13px]">
                      {name}
                    </span>
                    <span
                      className={`hidden sm:inline-block text-[10px] font-semibold ${
                        approvalStatus === "approved"
                          ? "text-muted-foreground"
                          : approvalStatus === "rejected"
                            ? "text-destructive"
                            : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {approvalStatus === "approved"
                        ? `${roleConfig.label} ${t("مفعّل", "Active")}`
                        : approvalStatus === "rejected"
                          ? `${roleConfig.label} • ${t("معلّق", "Suspended")}`
                          : `${roleConfig.label} • ${t("تحت المراجعة", "Under Review")}`}
                    </span>
                  </div>

                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ms-0.5" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-64 sm:w-72 p-2 rounded-2xl shadow-xl border border-border/80 bg-card">
                {/* Active Profile Info Header */}
                <div className="rounded-xl border border-border/60 bg-muted/40 p-3 mb-1">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                      <RoleIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-extrabold text-sm">{name}</div>
                      <div className="truncate text-[11px] text-muted-foreground font-mono" dir="ltr">
                        {session.user.email}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between border-t border-border/50 pt-2">
                    <Badge variant="outline" className={`text-[10px] font-bold py-0.5 px-2 gap-1 ${roleConfig.color}`}>
                      <RoleIcon className="h-3 w-3" />
                      {roleConfig.fullBadge}
                    </Badge>
                    {approvalStatus === "approved" ? (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {t("نشط ومفعّل", "Active")}
                      </span>
                    ) : approvalStatus === "rejected" ? (
                      <span className="text-[10px] font-semibold text-destructive flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        {t("حساب معلّق", "Suspended")}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Clock className="h-3 w-3 animate-pulse" />
                        {t("تحت المراجعة", "Under Review")}
                      </span>
                    )}
                  </div>
                </div>

                <DropdownMenuSeparator />

                {/* Reader Navigation Items (مكتبتي هي الصفحة الرئيسية، بيانات الحساب، المفضلة، طلباتي) */}
                {approvalStatus === "approved" && accountType === "reader" ? (
                  <>
                    <DropdownMenuItem
                      onClick={() => selectReaderTab("library")}
                      className="p-2.5 rounded-xl font-bold cursor-pointer bg-primary/5 hover:bg-primary/10 text-primary my-0.5"
                    >
                      <Library className="me-2 h-4 w-4 text-primary" />
                      <span>{t("مكتبتي", "My Library")}</span>
                      <span className="ms-auto rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                        {t("الرئيسية", "Home")}
                      </span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => selectReaderTab("settings")}
                      className="p-2 rounded-lg cursor-pointer font-semibold"
                    >
                      <Settings className="me-2 h-4 w-4 text-muted-foreground" />
                      <span>{t("بيانات الحساب", "Account Details")}</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => selectReaderTab("favorites")}
                      className="p-2 rounded-lg cursor-pointer font-semibold"
                    >
                      <Heart className="me-2 h-4 w-4 text-rose-500" />
                      <span>{t("المفضلة", "Favorites")}</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => selectReaderTab("orders")}
                      className="p-2 rounded-lg cursor-pointer font-semibold"
                    >
                      <Package className="me-2 h-4 w-4 text-amber-600" />
                      <span>{t("طلباتي", "My Orders")}</span>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem asChild className="p-2.5 rounded-xl font-bold cursor-pointer bg-primary/5 hover:bg-primary/10 text-primary my-1">
                    <Link to={roleConfig.to}>
                      <LayoutDashboard className="me-2 h-4 w-4" />
                      <span>
                        {approvalStatus === "approved"
                          ? roleConfig.dash
                          : t("متابعة حالة المراجعة", "Application Review Status")}
                      </span>
                      <ArrowUpRight className="ms-auto h-3.5 w-3.5 opacity-60" />
                    </Link>
                  </DropdownMenuItem>
                )}

                {approvalStatus === "approved" && accountType === "author" && (
                  <DropdownMenuItem asChild className="p-2 rounded-lg cursor-pointer">
                    <Link to="/author" search={{ view: "plans" }}>
                      <Sparkles className="me-2 h-4 w-4 text-amber-600" />
                      <span>{t("باقات النشر الستة", "Publishing Plans")}</span>
                    </Link>
                  </DropdownMenuItem>
                )}

                {approvalStatus === "approved" && accountType === "publisher" && (
                  <DropdownMenuItem asChild className="p-2 rounded-lg cursor-pointer">
                    <Link to="/publisher">
                      <Building2 className="me-2 h-4 w-4 text-blue-600" />
                      <span>{t("إدارة كتب الدار والمبيعات", "Manage Catalog & Sales")}</span>
                    </Link>
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  asChild
                  className="p-2 rounded-lg cursor-pointer text-emerald-700 dark:text-emerald-400 font-bold"
                >
                  <a
                    href="https://wa.me/966563057356?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20%D8%A5%D8%AF%D8%A7%D8%B1%D8%A9%20unibook%D8%8C%20%D8%A3%D8%B1%D8%BA%D8%A8%20%D9%81%D9%8A%20%D9%86%D8%B4%D8%B1%20%D9%83%D8%AA%D8%A7%D8%A8%D9%8A%20%D9%85%D8%AC%D8%A7%D9%86%D8%A7%D9%8B%20%D9%85%D8%B9%D9%83%D9%85."
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <PenLine className="me-2 h-4 w-4 text-emerald-600" />
                    <span>{t("انشر كتابك مجاناً", "Publish your book for free")}</span>
                    <ArrowUpRight className="ms-auto h-3.5 w-3.5 opacity-60" />
                  </a>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Language / Change Language inside Dropdown Menu */}
                <DropdownMenuItem
                  onClick={toggleLanguage}
                  className="p-2 rounded-lg cursor-pointer font-semibold flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <Globe className="me-2 h-4 w-4 text-primary" />
                    <span>{t("اللغة / تغيير اللغة", "Language / Change Language")}</span>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                    {language === "ar" ? "English" : "العربية"}
                  </span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Sign out */}
                <DropdownMenuItem
                  onClick={signOut}
                  className="p-2 rounded-lg text-destructive focus:text-destructive cursor-pointer font-semibold"
                >
                  <LogOut className="me-2 h-4 w-4" />
                  <span>{t("تسجيل الخروج", "Sign out")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            /* دخول + إنشاء حساب (في الموقع فقط بجوار دخول) */
            <div className="flex items-center gap-2">
              {!isAppExperience && (
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full px-3 sm:px-5 font-bold shadow-xs text-xs sm:text-sm border-primary/30 hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <Link to="/register">{t("إنشاء حساب", "Sign Up")}</Link>
                </Button>
              )}
              <Button asChild className="rounded-full px-4 sm:px-6 font-extrabold shadow-xs text-xs sm:text-sm">
                <Link to="/login">{t("دخول", "Sign In")}</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Secret Admin Verification Modal */}
      <AdminAuthModal open={adminModalOpen} onOpenChange={setAdminModalOpen} />
    </header>
  );
}

export function SiteFooter() {
  const { t, language, set } = useLocale();
  const { session, isAdmin } = useAuth();
  const isUserAccountLogged = Boolean(session) && !isAdmin;

  function toggleLanguage() {
    const nextLang = language === "ar" ? "en" : "ar";
    set({ language: nextLang });
  }

  const socialLinks = [
    {
      name: "Facebook",
      icon: (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      name: "X (Twitter)",
      icon: (
        <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      name: "Instagram",
      icon: (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
    },
    {
      name: "LinkedIn",
      icon: (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
      ),
    },
    {
      name: "YouTube",
      icon: (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
    },
  ];

  return (
    <footer className="mt-auto border-t border-border/20 bg-ink text-ink-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:py-12 md:grid-cols-3">
        {/* Col 1: Brand */}
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-card border border-border/80 shadow-xs">
              <img src="/logo-icon.png" alt="unibook" className="h-8 w-auto object-contain" />
            </div>
            <span className="font-display text-3xl font-extrabold text-gold tracking-tight">unibook</span>
          </div>
          <p className="mt-3 max-w-xs text-sm opacity-70 leading-relaxed">
            {t("دار عبيد للنشر والتوزيع والطباعة · مصر", "Dar Obaid Publishing, Distribution & Printing · Egypt")}
          </p>
        </div>

        {/* Col 2: Navigation */}
        <div className="text-sm opacity-80">
          <div className="mb-3 font-semibold text-gold">{t("روابط سريعة", "Quick links")}</div>
          <ul className="space-y-2">
            {!isUserAccountLogged && (
              <>
                <li>
                  <Link to="/books" className="hover:text-gold transition-colors">
                    {t("كل الكتب", "All books")}
                  </Link>
                </li>
                <li>
                  <Link to="/author" className="hover:text-gold transition-colors">
                    {t("انشر معنا", "Publish with us")}
                  </Link>
                </li>
              </>
            )}
            <li>
              <Link to="/contact" className="hover:text-gold transition-colors">
                {t("تواصل معنا", "Contact us")}
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Social Media + Mobile Apps (Android & iOS) */}
        <div>
          <div className="mb-3 font-semibold text-gold">{t("تابعنا وتطبيقات الهاتف", "Follow us & Mobile Apps")}</div>
          <div className="flex flex-wrap items-center gap-2">
            {socialLinks.map((s) => (
              <div
                key={s.name}
                className="group/social relative flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/40 cursor-not-allowed transition-all select-none hover:border-white/30 hover:bg-white/10 hover:text-white/60"
                aria-disabled="true"
                role="button"
                tabIndex={-1}
              >
                {s.icon}
                <span className="pointer-events-none absolute -top-8 scale-0 rounded bg-background/95 px-2 py-0.5 text-[10px] font-semibold text-foreground shadow-md transition-all duration-150 group-hover/social:scale-100 whitespace-nowrap border border-border/50">
                  {t("قريباً", "Coming soon")}
                </span>
              </div>
            ))}

            {/* Separator */}
            <div className="h-6 w-px bg-white/20 mx-0.5" />

            {/* Android Icon (Direct APK Download + Coming soon to Google Play) */}
            <a
              href="/unibook-app.apk"
              download="unibook-v1.0.apk"
              className="group/android relative flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 hover:border-emerald-400 hover:scale-105 transition-all shadow-xs cursor-pointer"
              aria-label="تحميل ملف APK مباشر للأندرويد (Google Play قريباً)"
            >
              <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5898 8.4026 13.8567 8.082 12 8.082s-3.5898.3206-5.1368.8677L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
              </svg>
              <span className="pointer-events-none absolute -top-8 scale-0 rounded bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-300 shadow-md transition-all duration-150 group-hover/android:scale-100 whitespace-nowrap border border-emerald-500/40 z-50">
                APK متاح حالياً · Google Play قريباً
              </span>
            </a>

            {/* iOS (Apple) Icon (Coming soon to App Store) */}
            <div
              className="group/ios relative flex h-9 w-9 items-center justify-center rounded-full border border-sky-400/50 bg-sky-500/15 text-sky-300 hover:bg-sky-500/25 hover:border-sky-300 transition-all shadow-xs cursor-default"
              aria-label="تطبيق iOS قريباً على App Store"
            >
              <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.64 1.35-.56.65-1.05 1.71-.92 2.73 1.01.08 2.01-.48 2.63-1.23z" />
              </svg>
              <span className="pointer-events-none absolute -top-8 scale-0 rounded bg-sky-950 px-2 py-0.5 text-[10px] font-bold text-sky-300 shadow-md transition-all duration-150 group-hover/ios:scale-100 whitespace-nowrap border border-sky-400/40 z-50">
                App Store قريباً
              </span>
            </div>
          </div>

          {/* Explanation badge below icons */}
          <div className="mt-3 space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>المتوفر حالياً: ملف APK للأندرويد</span>
            </div>
            <p className="text-[11px] text-white/60 leading-relaxed">
              تطبيقات الهاتف الرسمية (Android & iOS) ستتوفر قريباً على متجري Google Play و App Store.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Copyright Bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 text-xs opacity-80 text-center">
          <div>
            © {new Date().getFullYear()} {t("unibook. جميع الحقوق محفوظة.", "unibook. All rights reserved.")}
          </div>
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-white/90 hover:bg-white/10 hover:border-gold hover:text-gold transition-colors cursor-pointer"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>{language === "ar" ? "English (الإنجليزية)" : "العربية (Arabic)"}</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
