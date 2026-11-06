import { Link, useRouterState } from "@tanstack/react-router";
import {
  Compass,
  BookOpen,
  PenLine,
  MessageSquare,
  User,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLocale } from "@/lib/locale";

const PUBLISH_WHATSAPP = "https://wa.me/966563057356?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20unibook%D8%8C%20%D8%A3%D8%B1%D8%BA%D8%A8%20%D9%81%D9%8A%20%D9%86%D8%B4%D8%B1%20%D9%83%D8%AA%D8%A7%D8%A8%D9%8A%20%D9%85%D8%B9%D9%83%D9%85.";

export function AppBottomNav() {
  const { t } = useLocale();
  const { session, isAdmin, accountType } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Determine account destination
  const getAccountLink = () => {
    if (!session) return "/register";
    if (isAdmin) return "/admin";
    if (accountType === "publisher") return "/publisher";
    if (accountType === "author") return "/author";
    return "/account";
  };

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-card/95 backdrop-blur-xl border-t border-border/80 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] pb-safe transition-all select-none"
      aria-label="App Bottom Navigation"
    >
      <div className="flex h-16 items-center justify-around px-2 max-w-lg mx-auto">
        {/* 1. الرئيسية */}
        <Link
          to="/"
          className={`relative flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95 ${
            pathname === "/"
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground font-medium"
          }`}
        >
          <div className="relative">
            <span
              className={`flex h-8 w-11 items-center justify-center rounded-full transition-all duration-200 ${
                pathname === "/" ? "bg-primary/15 text-primary scale-105" : "bg-transparent"
              }`}
            >
              <Compass className={`h-5 w-5 ${pathname === "/" ? "stroke-[2.4]" : "stroke-[1.8]"}`} />
            </span>
          </div>
          <span className={`text-[10.5px] leading-tight mt-0.5 ${pathname === "/" ? "text-primary font-extrabold" : "text-muted-foreground"}`}>
            {t("الرئيسية", "Home")}
          </span>
        </Link>

        {/* 2. المتجر */}
        <Link
          to="/books"
          className={`relative flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95 ${
            pathname.startsWith("/books")
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground font-medium"
          }`}
        >
          <div className="relative">
            <span
              className={`flex h-8 w-11 items-center justify-center rounded-full transition-all duration-200 ${
                pathname.startsWith("/books") ? "bg-primary/15 text-primary scale-105" : "bg-transparent"
              }`}
            >
              <BookOpen className={`h-5 w-5 ${pathname.startsWith("/books") ? "stroke-[2.4]" : "stroke-[1.8]"}`} />
            </span>
          </div>
          <span className={`text-[10.5px] leading-tight mt-0.5 ${pathname.startsWith("/books") ? "text-primary font-extrabold" : "text-muted-foreground"}`}>
            {t("المتجر", "Store")}
          </span>
        </Link>

        {/* 3. انشر كتاب (Direct WhatsApp: 00966563057356) */}
        <a
          href={PUBLISH_WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          className="relative flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95 text-muted-foreground hover:text-foreground font-medium group cursor-pointer"
        >
          <div className="relative">
            <span className="flex h-8 w-11 items-center justify-center rounded-full bg-transparent group-hover:bg-emerald-500/15 group-hover:text-emerald-600 transition-all">
              <PenLine className="h-5 w-5 stroke-[1.8] group-hover:stroke-emerald-600 transition-colors" />
            </span>
          </div>
          <span className="text-[10.5px] leading-tight mt-0.5 text-muted-foreground group-hover:text-emerald-600 font-semibold transition-colors">
            {t("انشر كتاب", "Publish")}
          </span>
        </a>

        {/* 4. تواصل معنا (صفحة خاصة للتواصل) */}
        <Link
          to="/contact"
          className={`relative flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95 ${
            pathname.startsWith("/contact")
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground font-medium"
          }`}
        >
          <div className="relative">
            <span
              className={`flex h-8 w-11 items-center justify-center rounded-full transition-all duration-200 ${
                pathname.startsWith("/contact") ? "bg-primary/15 text-primary scale-105" : "bg-transparent"
              }`}
            >
              <MessageSquare className={`h-5 w-5 ${pathname.startsWith("/contact") ? "stroke-[2.4]" : "stroke-[1.8]"}`} />
            </span>
          </div>
          <span className={`text-[10.5px] leading-tight mt-0.5 ${pathname.startsWith("/contact") ? "text-primary font-extrabold" : "text-muted-foreground"}`}>
            {t("تواصل معنا", "Contact")}
          </span>
        </Link>

        {/* 5. تسجيل حساب (مستقلة تماماً) */}
        <Link
          to={getAccountLink()}
          className={`relative flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95 ${
            pathname.startsWith("/register") || (session && (pathname.startsWith("/account") || pathname.startsWith("/admin")))
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground font-medium"
          }`}
        >
          <div className="relative">
            <span
              className={`flex h-8 w-11 items-center justify-center rounded-full transition-all duration-200 ${
                pathname.startsWith("/register") || (session && (pathname.startsWith("/account") || pathname.startsWith("/admin")))
                  ? "bg-primary/15 text-primary scale-105"
                  : "bg-transparent"
              }`}
            >
              {session ? (
                <User className={`h-5 w-5 ${pathname.startsWith("/account") ? "stroke-[2.4]" : "stroke-[1.8]"}`} />
              ) : (
                <UserPlus className={`h-5 w-5 ${pathname.startsWith("/register") ? "stroke-[2.4]" : "stroke-[1.8]"}`} />
              )}
            </span>

            {/* Active user status dot */}
            {session && (
              <span className="absolute top-0.5 right-1 flex h-2 w-2">
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 border border-background shadow-xs"></span>
              </span>
            )}
          </div>
          <span className={`text-[10.5px] leading-tight mt-0.5 ${pathname.startsWith("/register") || (session && (pathname.startsWith("/account") || pathname.startsWith("/admin"))) ? "text-primary font-extrabold" : "text-muted-foreground"}`}>
            {session ? t("حسابي", "Profile") : t("تسجيل حساب", "Sign Up")}
          </span>
        </Link>
      </div>
    </nav>
  );
}
