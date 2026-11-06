import { Link, useRouterState } from "@tanstack/react-router";
import {
  Compass,
  ShoppingBag,
  PenLine,
  MessageSquare,
  User,
  ShieldCheck,
  Building2,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLocale } from "@/lib/locale";
import { useAppMode } from "@/lib/useAppMode";

const PUBLISH_WHATSAPP = "https://wa.me/966563057356?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20unibook%D8%8C%20%D8%A3%D8%B1%D8%BA%D8%A8%20%D9%81%D9%8A%20%D9%86%D8%B4%D8%B1%20%D9%83%D8%AA%D8%A7%D8%A8%D9%8A%20%D9%85%D8%B9%D9%83%D9%85.";

export function AppBottomNav() {
  const { t } = useLocale();
  const { session, isAdmin, accountType } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isAppExperience } = useAppMode();

  // If on desktop web without mobile/app mode, bottom nav is hidden
  if (!isAppExperience) return null;

  // Do not render bottom nav on login or register pages (user requirement)
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    return null;
  }

  // Determine account destination
  const getAccountLink = () => {
    if (!session) return "/register";
    if (isAdmin) return "/admin";
    if (accountType === "publisher") return "/publisher";
    if (accountType === "author") return "/author";
    return "/account";
  };

  const isHome = pathname === "/";
  const isStore = pathname.startsWith("/books");
  const isContact = pathname.startsWith("/contact");
  const isAccountActive =
    pathname.startsWith("/account") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/publisher") ||
    pathname.startsWith("/author") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth");

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/80 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] pb-safe transition-all select-none"
      aria-label="App Bottom Navigation"
    >
      <div className="flex h-16 items-center justify-around px-2 max-w-xl mx-auto">
        {/* 1. الرئيسية */}
        <Link
          to="/"
          className={`relative flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95 ${
            isHome
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground font-medium"
          }`}
        >
          <div className="relative">
            <span
              className={`flex h-8 w-11 items-center justify-center rounded-full transition-all duration-200 ${
                isHome ? "bg-primary/15 text-primary scale-105" : "bg-transparent"
              }`}
            >
              <Compass className={`h-5 w-5 ${isHome ? "stroke-[2.4]" : "stroke-[1.8]"}`} />
            </span>
          </div>
          <span className={`text-[10px] sm:text-[11px] leading-tight mt-0.5 ${isHome ? "text-primary font-extrabold" : "text-muted-foreground"}`}>
            {t("الرئيسية", "Home")}
          </span>
        </Link>

        {/* 2. المتجر */}
        <Link
          to="/books"
          className={`relative flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95 ${
            isStore
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground font-medium"
          }`}
        >
          <div className="relative">
            <span
              className={`flex h-8 w-11 items-center justify-center rounded-full transition-all duration-200 ${
                isStore ? "bg-primary/15 text-primary scale-105" : "bg-transparent"
              }`}
            >
              <ShoppingBag className={`h-5 w-5 ${isStore ? "stroke-[2.4]" : "stroke-[1.8]"}`} />
            </span>
          </div>
          <span className={`text-[10px] sm:text-[11px] leading-tight mt-0.5 ${isStore ? "text-primary font-extrabold" : "text-muted-foreground"}`}>
            {t("المتجر", "Store")}
          </span>
        </Link>

        {/* 3. انشر كتاب (Direct WhatsApp to 00966563057356) */}
        <a
          href={PUBLISH_WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          className="relative flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95 text-muted-foreground hover:text-primary group"
          aria-label={t("انشر كتاب", "Publish book")}
        >
          <div className="relative">
            <span className="flex h-8 w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-all duration-200 group-hover:bg-primary group-hover:text-primary-foreground group-active:scale-95">
              <PenLine className="h-5 w-5 stroke-[2]" />
            </span>
          </div>
          <span className="text-[10px] sm:text-[11px] font-bold leading-tight mt-0.5 text-primary">
            {t("انشر كتاب", "Publish")}
          </span>
        </a>

        {/* 4. تواصل معنا (Standalone Contact Page) */}
        <Link
          to="/contact"
          className={`relative flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95 ${
            isContact
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground font-medium"
          }`}
        >
          <div className="relative">
            <span
              className={`flex h-8 w-11 items-center justify-center rounded-full transition-all duration-200 ${
                isContact ? "bg-primary/15 text-primary scale-105" : "bg-transparent"
              }`}
            >
              <MessageSquare className={`h-5 w-5 ${isContact ? "stroke-[2.4]" : "stroke-[1.8]"}`} />
            </span>
          </div>
          <span className={`text-[10px] sm:text-[11px] leading-tight mt-0.5 ${isContact ? "text-primary font-extrabold" : "text-muted-foreground"}`}>
            {t("تواصل معنا", "Contact")}
          </span>
        </Link>

        {/* 5. تسجيل حساب (Direct to /register or active dashboard) */}
        <Link
          to={getAccountLink()}
          className={`relative flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95 ${
            isAccountActive
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground font-medium"
          }`}
        >
          <div className="relative">
            <span
              className={`flex h-8 w-11 items-center justify-center rounded-full transition-all duration-200 ${
                isAccountActive ? "bg-primary/15 text-primary scale-105" : "bg-transparent"
              }`}
            >
              {session ? (
                isAdmin ? (
                  <ShieldCheck className={`h-5 w-5 text-rose-600 ${isAccountActive ? "stroke-[2.4]" : "stroke-[1.8]"}`} />
                ) : accountType === "publisher" ? (
                  <Building2 className={`h-5 w-5 text-blue-600 ${isAccountActive ? "stroke-[2.4]" : "stroke-[1.8]"}`} />
                ) : accountType === "author" ? (
                  <Sparkles className={`h-5 w-5 text-amber-600 ${isAccountActive ? "stroke-[2.4]" : "stroke-[1.8]"}`} />
                ) : (
                  <BookOpen className={`h-5 w-5 text-emerald-600 ${isAccountActive ? "stroke-[2.4]" : "stroke-[1.8]"}`} />
                )
              ) : (
                <User className={`h-5 w-5 ${isAccountActive ? "stroke-[2.4]" : "stroke-[1.8]"}`} />
              )}
            </span>
            {session && (
              <span className="absolute top-1 end-2 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-card" />
            )}
          </div>
          <span className={`text-[10px] sm:text-[11px] leading-tight mt-0.5 ${isAccountActive ? "text-primary font-extrabold" : "text-muted-foreground"}`}>
            {session ? t("حسابي", "Account") : t("تسجيل حساب", "Sign Up")}
          </span>
        </Link>
      </div>
    </nav>
  );
}
