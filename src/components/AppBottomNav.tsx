import { Link, useRouterState } from "@tanstack/react-router";
import {
  Compass,
  BookOpen,
  PenLine,
  User,
  Building2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLocale } from "@/lib/locale";

export function AppBottomNav() {
  const { t } = useLocale();
  const { session, isAdmin, accountType } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Determine account destination
  const getAccountLink = () => {
    if (!session) return "/auth";
    if (isAdmin) return "/admin";
    if (accountType === "publisher") return "/publisher";
    if (accountType === "author") return "/author";
    return "/account";
  };

  // Determine publish destination
  const getPublishLink = () => {
    if (accountType === "publisher") return "/publisher";
    return "/author";
  };

  // 4 Core App Navigation Tabs
  const navItems = [
    {
      id: "home",
      label: t("الرئيسية", "Home"),
      to: "/",
      icon: Compass,
      isActive: pathname === "/",
    },
    {
      id: "catalog",
      label: t("المتجر", "Store"),
      to: "/books",
      icon: BookOpen,
      isActive: pathname.startsWith("/books"),
    },
    {
      id: "publish",
      label: accountType === "publisher" ? t("الناشر", "Publisher") : t("النشر", "Publish"),
      to: getPublishLink(),
      icon: accountType === "publisher" ? Building2 : PenLine,
      isActive: pathname.startsWith("/author") || pathname.startsWith("/publisher"),
    },
    {
      id: "account",
      label: session ? t("حسابي", "Profile") : t("دخول", "Login"),
      to: getAccountLink(),
      icon: User,
      isActive: pathname.startsWith("/auth") || pathname.startsWith("/account") || pathname.startsWith("/admin"),
      isLive: Boolean(session),
    },
  ];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-card/95 backdrop-blur-xl border-t border-border/80 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] pb-safe transition-all select-none"
      aria-label="App Navigation"
    >
      <div className="flex h-16 items-center justify-around px-4 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;

          return (
            <Link
              key={item.id}
              to={item.to}
              className={`relative flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95 ${
                active
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground font-medium"
              }`}
            >
              {/* Active subtle pill glow */}
              <div className="relative">
                <span
                  className={`flex h-8 w-12 items-center justify-center rounded-full transition-all duration-200 ${
                    active ? "bg-primary/15 text-primary scale-105" : "bg-transparent"
                  }`}
                >
                  <Icon className={`h-5 w-5 transition-transform ${active ? "stroke-[2.4]" : "stroke-[1.8]"}`} />
                </span>

                {/* Live account dot */}
                {item.isLive && (
                  <span className="absolute top-0.5 right-1.5 flex h-2 w-2">
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 border border-background shadow-xs"></span>
                  </span>
                )}
              </div>

              {/* Tab Title */}
              <span className={`text-[11px] leading-tight mt-0.5 transition-colors ${active ? "text-primary font-extrabold" : "text-muted-foreground"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
