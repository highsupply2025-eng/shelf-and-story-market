import { useState, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, User, LogOut, PenLine } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/locale";

export function SiteHeader() {
  const { t } = useLocale();
  const { session, isAdmin } = useAuth();
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

  function handleLogoClick(e: React.MouseEvent) {
    const nextCount = logoClicks + 1;
    setLogoClicks(nextCount);

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    if (nextCount >= 5) {
      e.preventDefault();
      setLogoClicks(0);
      navigate({ to: "/admin" });
      return;
    }

    clickTimeoutRef.current = setTimeout(() => {
      setLogoClicks(0);
    }, 2500);
  }

  const linkCls =
    "text-[15px] font-semibold text-foreground/80 hover:text-primary transition-all duration-200 px-3.5 py-2 rounded-lg hover:bg-primary/5 [&.active]:text-primary [&.active]:font-bold [&.active]:bg-primary/10";

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex h-18 max-w-7xl items-center gap-6 px-4 md:px-8">
        {/* Brand / Logo */}
        <Link
          to="/"
          onClick={handleLogoClick}
          className="flex items-center gap-3 group transition-transform active:scale-95 cursor-pointer"
        >
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-card border border-border/80 shadow-xs transition-all duration-200 group-hover:border-primary/40 group-hover:shadow-sm">
            <img src="/logo-icon.png" alt="unibook" className="h-8 w-auto object-contain" />
          </div>
          <span className="font-display text-2xl md:text-3xl font-extrabold tracking-tight text-foreground transition-colors group-hover:text-primary">
            unibook
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden items-center gap-2 md:flex">
          <Link to="/" className={linkCls} activeOptions={{ exact: true }}>
            {t("الرئيسية", "Home")}
          </Link>
          <Link to="/books" className={linkCls}>
            {t("المتجر", "Bookshop")}
          </Link>
          <Link to="/publisher" className={linkCls}>
            {t("نشر كتاب", "Publish a book")}
          </Link>
        </nav>

        {/* Actions */}
        <div className="ms-auto flex items-center gap-3">
          <Link
            to="/cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-card/80 text-foreground transition-all duration-200 hover:border-primary/50 hover:bg-primary/10 hover:text-primary shadow-xs"
            aria-label={t("السلة", "Cart")}
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -top-1 -start-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground shadow-sm animate-in zoom-in">
                {count}
              </span>
            )}
          </Link>

          {session ? (
            <>
              <Link
                to="/publisher"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-card/80 text-foreground transition-all duration-200 hover:border-primary/50 hover:bg-primary/10 hover:text-primary md:hidden"
                aria-label={t("انشر", "Publish")}
              >
                <PenLine className="h-5 w-5" />
              </Link>
              <Link
                to="/account"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-card/80 text-foreground transition-all duration-200 hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                aria-label={t("حسابي", "Account")}
              >
                <User className="h-5 w-5" />
              </Link>
              <button
                onClick={signOut}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-card/80 text-foreground transition-all duration-200 hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                aria-label={t("خروج", "Sign out")}
              >
                <LogOut className="h-5 w-5" />
              </button>
            </>
          ) : (
            <Button asChild size="default" className="rounded-full px-6 font-bold shadow-xs transition-transform active:scale-95">
              <Link to="/auth">{t("دخول / تسجيل", "Sign in")}</Link>
            </Button>
          )}
        </div>
      </div>
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
    <footer className="mt-24 bg-ink text-ink-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 md:grid-cols-3">
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
        <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-6 text-xs opacity-70 text-center">
          <div>
            © {new Date().getFullYear()} {t("unibook. جميع الحقوق محفوظة.", "unibook. All rights reserved.")}
          </div>
        </div>
      </div>
    </footer>
  );
}
