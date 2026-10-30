import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, User, LogOut, PenLine, Shield } from "lucide-react";
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

  const linkCls =
    "text-[15px] font-semibold text-foreground/80 hover:text-primary transition-all duration-200 px-3.5 py-2 rounded-lg hover:bg-primary/5 [&.active]:text-primary [&.active]:font-bold [&.active]:bg-primary/10";

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex h-18 max-w-7xl items-center gap-6 px-4 md:px-8">
        {/* Brand / Logo */}
        <Link to="/" className="flex items-center gap-3 group transition-transform active:scale-95">
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
            {t("مساحة المؤلف", "Author studio")}
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
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-card/80 text-foreground transition-all duration-200 hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                  aria-label={t("الإدارة", "Admin")}
                >
                  <Shield className="h-5 w-5" />
                </Link>
              )}
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
  return (
    <footer className="mt-24 bg-ink text-ink-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-foreground/10 border border-white/10">
              <img src="/logo-icon.png" alt="unibook" className="h-7 w-auto object-contain brightness-110" />
            </div>
            <span className="font-display text-3xl font-extrabold text-gold tracking-tight">unibook</span>
          </div>
          <p className="mt-3 max-w-xs text-sm opacity-70 leading-relaxed">
            {t("دار عبيد للنشر والتوزيع والطباعة · مصر", "Dar Obaid Publishing, Distribution & Printing · Egypt")}
          </p>
        </div>
        <div className="text-sm opacity-80">
          <div className="mb-3 font-semibold text-gold">{t("تصفح", "Explore")}</div>
          <ul className="space-y-2">
            <li><Link to="/books" className="hover:text-gold transition-colors">{t("كل الكتب", "All books")}</Link></li>
            <li><Link to="/publisher" className="hover:text-gold transition-colors">{t("انشر معنا", "Publish with us")}</Link></li>
            <li><Link to="/account" className="hover:text-gold transition-colors">{t("مكتبتي", "My library")}</Link></li>
          </ul>
        </div>
        <div className="text-sm opacity-70">
          © {new Date().getFullYear()} {t("unibook. جميع الحقوق محفوظة.", "unibook. All rights reserved.")}
        </div>
      </div>
    </footer>
  );
}
