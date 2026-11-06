import { useState } from "react";
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
import { ContactModal } from "@/components/ContactModal";

export function AppBottomNav() {
  const { t } = useLocale();
  const { session, isAdmin, accountType } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [contactOpen, setContactOpen] = useState(false);

  // Determine account destination
  const getAccountLink = () => {
    if (!session) return "/auth";
    if (isAdmin) return "/admin";
    if (accountType === "publisher") return "/publisher";
    if (accountType === "author") return "/author";
    return "/account";
  };

  return (
    <>
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

          {/* 3. انشر كتاب */}
          <Link
            to="/author"
            className={`relative flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95 ${
              pathname.startsWith("/author") || pathname.startsWith("/publisher")
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground font-medium"
            }`}
          >
            <div className="relative">
              <span
                className={`flex h-8 w-11 items-center justify-center rounded-full transition-all duration-200 ${
                  pathname.startsWith("/author") || pathname.startsWith("/publisher")
                    ? "bg-primary/15 text-primary scale-105"
                    : "bg-transparent"
                }`}
              >
                <PenLine className={`h-5 w-5 ${pathname.startsWith("/author") || pathname.startsWith("/publisher") ? "stroke-[2.4]" : "stroke-[1.8]"}`} />
              </span>
            </div>
            <span className={`text-[10.5px] leading-tight mt-0.5 ${pathname.startsWith("/author") || pathname.startsWith("/publisher") ? "text-primary font-extrabold" : "text-muted-foreground"}`}>
              {t("انشر كتاب", "Publish")}
            </span>
          </Link>

          {/* 4. تواصل معنا */}
          <button
            type="button"
            onClick={() => setContactOpen(true)}
            className="relative flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95 text-muted-foreground hover:text-foreground font-medium cursor-pointer"
          >
            <div className="relative">
              <span className="flex h-8 w-11 items-center justify-center rounded-full bg-transparent hover:bg-muted/40 transition-all">
                <MessageSquare className="h-5 w-5 stroke-[1.8]" />
              </span>
            </div>
            <span className="text-[10.5px] leading-tight mt-0.5 text-muted-foreground">
              {t("تواصل معنا", "Contact")}
            </span>
          </button>

          {/* 5. تسجيل حساب (أو حسابي إذا مسجل) */}
          <Link
            to={getAccountLink()}
            className={`relative flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95 ${
              pathname.startsWith("/auth") || pathname.startsWith("/account") || pathname.startsWith("/admin")
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground font-medium"
            }`}
          >
            <div className="relative">
              <span
                className={`flex h-8 w-11 items-center justify-center rounded-full transition-all duration-200 ${
                  pathname.startsWith("/auth") || pathname.startsWith("/account") || pathname.startsWith("/admin")
                    ? "bg-primary/15 text-primary scale-105"
                    : "bg-transparent"
                }`}
              >
                {session ? (
                  <User className={`h-5 w-5 ${pathname.startsWith("/account") ? "stroke-[2.4]" : "stroke-[1.8]"}`} />
                ) : (
                  <UserPlus className={`h-5 w-5 ${pathname.startsWith("/auth") ? "stroke-[2.4]" : "stroke-[1.8]"}`} />
                )}
              </span>

              {/* Active user status dot */}
              {session && (
                <span className="absolute top-0.5 right-1 flex h-2 w-2">
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 border border-background shadow-xs"></span>
                </span>
              )}
            </div>
            <span className={`text-[10.5px] leading-tight mt-0.5 ${pathname.startsWith("/auth") || pathname.startsWith("/account") || pathname.startsWith("/admin") ? "text-primary font-extrabold" : "text-muted-foreground"}`}>
              {session ? t("حسابي", "Profile") : t("تسجيل حساب", "Sign up")}
            </span>
          </Link>
        </div>
      </nav>

      {/* Contact Us Modal */}
      <ContactModal open={contactOpen} onOpenChange={setContactOpen} />
    </>
  );
}
