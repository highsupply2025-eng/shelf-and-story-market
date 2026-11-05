import { useState, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, LogOut, PenLine, Building2, ShieldCheck, BookOpen, Menu, ChevronDown, LayoutDashboard, Library, Home } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    setMenuOpen(false);
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

  const role = {
    admin: { label: t("الإدارة", "Admin"), dash: t("لوحة الإدارة", "Admin dashboard"), icon: ShieldCheck, to: "/admin" as const },
    publisher: { label: t("دار نشر", "Publisher"), dash: t("لوحة دار النشر", "Publisher dashboard"), icon: Building2, to: "/publisher" as const },
    author: { label: t("مؤلف", "Author"), dash: t("لوحة المؤلف", "Author dashboard"), icon: PenLine, to: "/author" as const },
    reader: { label: t("قارئ", "Reader"), dash: t("لوحة القارئ", "Reader dashboard"), icon: BookOpen, to: "/account" as const },
  }[accountType];
  const RoleIcon = role.icon;
  const name = (session?.user.user_metadata?.["full_name"] as string | undefined) || session?.user.email?.split("@")[0] || "";

  const linkCls =
    "text-[15px] font-semibold text-foreground/75 hover:text-primary transition-colors px-3 py-2 rounded-lg hover:bg-primary/5 [&.active]:text-primary [&.active]:bg-primary/10";
  const iconBtn =
    "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-card text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary";

  const navLinks = (onClick?: () => void, cls = linkCls) => (
    <>
      <Link to="/" className={cls} activeOptions={{ exact: true }} onClick={onClick}><Home className="h-4 w-4 md:hidden" />{t("الرئيسية", "Home")}</Link>
      <Link to="/books" className={cls} onClick={onClick}><Library className="h-4 w-4 md:hidden" />{t("المتجر", "Bookshop")}</Link>
      {!session && (
        <Link to="/auth" className={cls} onClick={onClick}><PenLine className="h-4 w-4 md:hidden" />{t("انشر معنا", "Publish with us")}</Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-md">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 md:flex md:h-18 md:gap-6 md:px-8">
        <Link to="/" onClick={handleLogoClick} className="flex min-w-0 items-center gap-2.5 group cursor-pointer">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card border border-border/80 md:h-11 md:w-11">
            <img src="/logo-icon.png" alt="unibook" className="h-7 w-auto object-contain md:h-8" />
          </div>
          <span className="truncate font-display text-2xl font-extrabold tracking-tight text-foreground group-hover:text-primary md:text-3xl">unibook</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">{navLinks()}</nav>

        <div className="flex items-center gap-2 md:ms-auto">
          <Link to="/cart" className={iconBtn} aria-label={t("السلة", "Cart")}>
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -top-1 -start-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">{count}</span>
            )}
          </Link>

          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hidden items-center gap-2 rounded-full border border-border/70 bg-card py-1 ps-1 pe-3 text-sm font-bold transition-colors hover:border-primary/50 md:flex cursor-pointer">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground"><RoleIcon className="h-4 w-4" /></span>
                  <span className="max-w-32 truncate">{role.dash}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="space-y-0.5">
                  <div className="truncate font-bold">{name}</div>
                  <div className="truncate text-xs font-normal text-muted-foreground" dir="ltr">{session.user.email}</div>
                  <Badge variant="secondary" className="mt-1 gap-1"><RoleIcon className="h-3 w-3" />{role.label}</Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to={role.to}><LayoutDashboard className="me-2 h-4 w-4" />{role.dash}</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/books"><Library className="me-2 h-4 w-4" />{t("تصفح المتجر", "Browse shop")}</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive"><LogOut className="me-2 h-4 w-4" />{t("تسجيل الخروج", "Sign out")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild className="hidden rounded-full px-6 font-bold md:inline-flex">
              <Link to="/auth">{t("دخول / تسجيل", "Sign in")}</Link>
            </Button>
          )}

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button className={`${iconBtn} md:hidden`} aria-label={t("القائمة", "Menu")}><Menu className="h-5 w-5" /></button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-sm p-0">
              <SheetHeader className="border-b p-5 pe-12 text-start">
                <SheetTitle className="font-display text-2xl">unibook</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 p-4">
                {session && (
                  <Link to={role.to} onClick={() => setMenuOpen(false)} className="mb-3 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><RoleIcon className="h-5 w-5" /></span>
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{role.dash}</span>
                      <span className="block truncate text-xs text-muted-foreground" dir="ltr">{session.user.email}</span>
                    </span>
                  </Link>
                )}
                {navLinks(() => setMenuOpen(false), "flex items-center gap-3 rounded-xl px-3 py-3 font-semibold hover:bg-muted [&.active]:bg-muted [&.active]:text-primary")}
                <div className="mt-4 border-t pt-4">
                  {session ? (
                    <Button variant="outline" className="w-full gap-2 text-destructive" onClick={signOut}><LogOut className="h-4 w-4" />{t("تسجيل الخروج", "Sign out")}</Button>
                  ) : (
                    <Button asChild className="w-full rounded-full font-bold"><Link to="/auth" onClick={() => setMenuOpen(false)}>{t("دخول / تسجيل", "Sign in")}</Link></Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
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
              <Link to="/publisher" className="hover:text-gold transition-colors">
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
