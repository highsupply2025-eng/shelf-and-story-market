import { useState, useRef } from "react";
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
  User,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/locale";
import { AdminAuthModal } from "@/components/AdminAuthModal";
import { Badge } from "@/components/ui/badge";

export function SiteHeader() {
  const { t } = useLocale();
  const { session, isAdmin, accountType } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
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
      label: t("دار نشر", "Publisher"),
      fullBadge: t("حساب دار نشر مستقلة", "Independent Publisher"),
      dash: t("لوحة دار النشر", "Publisher dashboard"),
      icon: Building2,
      to: "/publisher" as const,
      color: "text-blue-600 bg-blue-500/10 border-blue-500/30",
      accentBg: "from-blue-600 to-indigo-700",
    },
    author: {
      label: t("مؤلف", "Author"),
      fullBadge: t("حساب مؤلف مستقل", "Independent Author"),
      dash: t("استوديو المؤلف", "Author studio"),
      icon: PenLine,
      to: "/author" as const,
      color: "text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30",
      accentBg: "from-amber-600 to-orange-600",
    },
    reader: {
      label: t("قارئ", "Reader"),
      fullBadge: t("حساب قارئ مستقل", "Independent Reader"),
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

  const linkCls =
    "text-[14px] md:text-[15px] font-semibold text-foreground/80 hover:text-primary transition-colors px-3 py-2 rounded-xl hover:bg-primary/5 [&.active]:text-primary [&.active]:bg-primary/10 flex items-center gap-2";
  const iconBtn =
    "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-card text-foreground transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary shadow-xs cursor-pointer";

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 md:h-18 md:gap-6 md:px-8">
        
        {/* Brand Logo with 5-click easter egg */}
        <Link to="/" onClick={handleLogoClick} className="flex min-w-0 items-center gap-2.5 group cursor-pointer select-none">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card border border-border/80 shadow-xs md:h-11 md:w-11 transition-transform group-hover:scale-105">
            <img src="/logo-icon.png" alt="unibook" className="h-7 w-auto object-contain md:h-8" />
          </div>
          <div className="flex flex-col">
            <span className="truncate font-display text-2xl font-extrabold tracking-tight text-foreground group-hover:text-primary md:text-3xl">
              unibook
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-1 md:flex">
          <Link to="/" className={linkCls} activeOptions={{ exact: true }}>
            <Home className="h-4 w-4 opacity-75" />
            <span>{t("الرئيسية", "Home")}</span>
          </Link>
          <Link to="/books" className={linkCls}>
            <Library className="h-4 w-4 opacity-75" />
            <span>{t("المتجر", "Bookshop")}</span>
          </Link>
          <Link to="/author" className={linkCls}>
            <PenLine className="h-4 w-4 opacity-75" />
            <span>{t("انشر كتاب", "Publish")}</span>
          </Link>
        </nav>

        {/* Top Header Controls: السلة + دخول (No hamburger menu / No redundant dropdowns) */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          
          {/* السلة (Cart Icon) */}
          <Link to="/cart" className={iconBtn} aria-label={t("السلة", "Cart")}>
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -top-1 -start-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground shadow-xs animate-in zoom-in">
                {count}
              </span>
            )}
          </Link>

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
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 border border-background"></span>
                    </span>
                  </div>

                  {/* Account Text info */}
                  <div className="flex flex-col items-start text-start leading-tight">
                    <span className="max-w-24 sm:max-w-36 truncate font-extrabold text-foreground text-[12px] sm:text-[13px]">
                      {name}
                    </span>
                    <span className="hidden sm:inline-block text-[10px] text-muted-foreground font-medium">
                      {roleConfig.label} مفعّل
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
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      نشط ومفعّل
                    </span>
                  </div>
                </div>

                <DropdownMenuSeparator />

                {/* Primary Role Dashboard Link */}
                <DropdownMenuItem asChild className="p-2.5 rounded-xl font-bold cursor-pointer bg-primary/5 hover:bg-primary/10 text-primary my-1">
                  <Link to={roleConfig.to}>
                    <LayoutDashboard className="me-2 h-4 w-4" />
                    <span>{roleConfig.dash}</span>
                    <ArrowUpRight className="ms-auto h-3.5 w-3.5 opacity-60" />
                  </Link>
                </DropdownMenuItem>

                {/* Sub-links based on specific account type */}
                {accountType === "reader" && (
                  <DropdownMenuItem asChild className="p-2 rounded-lg cursor-pointer">
                    <Link to="/account">
                      <BookOpen className="me-2 h-4 w-4 text-emerald-600" />
                      <span>{t("مكتبتي وطلباتي", "My Library & Orders")}</span>
                    </Link>
                  </DropdownMenuItem>
                )}

                {accountType === "author" && (
                  <DropdownMenuItem asChild className="p-2 rounded-lg cursor-pointer">
                    <Link to="/author" search={{ view: "plans" }}>
                      <Sparkles className="me-2 h-4 w-4 text-amber-600" />
                      <span>{t("باقات النشر الستة", "Publishing Plans")}</span>
                    </Link>
                  </DropdownMenuItem>
                )}

                {accountType === "publisher" && (
                  <DropdownMenuItem asChild className="p-2 rounded-lg cursor-pointer">
                    <Link to="/publisher">
                      <Building2 className="me-2 h-4 w-4 text-blue-600" />
                      <span>{t("إدارة كتب الدار والمبيعات", "Manage Catalog & Sales")}</span>
                    </Link>
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem asChild className="p-2 rounded-lg cursor-pointer">
                  <Link to="/books">
                    <Library className="me-2 h-4 w-4 opacity-75" />
                    <span>{t("تصفح متجر الكتب", "Browse Bookshop")}</span>
                  </Link>
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
            /* دخول (Sign In Button when guest) */
            <Button asChild className="rounded-full px-4 sm:px-6 font-extrabold shadow-xs text-xs sm:text-sm">
              <Link to="/auth">{t("دخول", "Sign In")}</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Secret Admin Verification Modal */}
      <AdminAuthModal open={adminModalOpen} onOpenChange={setAdminModalOpen} />
    </header>
  );
}

export function SiteFooter() {
  const { t } = useLocale();

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
          <div className="mb-3 font-semibold text-gold">{t("تصفح", "Explore")}</div>
          <ul className="space-y-2">
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
            <li>
              <a
                href="https://mail.google.com/mail/?view=cm&fs=1&to=darobaid@unigates.online"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gold transition-colors"
              >
                {t("تواصل", "Contact")}
              </a>
            </li>
          </ul>
        </div>

        {/* Col 3: Social Media (Disabled with badge) */}
        <div>
          <div className="mb-3 font-semibold text-gold">{t("تابعنا", "Follow us")}</div>
          <div className="flex items-center gap-2.5">
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
          </div>
        </div>
      </div>

      {/* Bottom Copyright Bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-4 text-xs opacity-70 text-center">
          <div>
            © {new Date().getFullYear()} {t("unibook. جميع الحقوق محفوظة.", "unibook. All rights reserved.")}
          </div>
        </div>
      </div>
    </footer>
  );
}
