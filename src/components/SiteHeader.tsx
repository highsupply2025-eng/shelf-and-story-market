import { Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, ShoppingBag, User, LogOut, PenLine, Shield } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
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
    "text-sm text-muted-foreground transition-colors hover:text-foreground [&.active]:text-primary [&.active]:font-semibold";

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="h-5 w-5" />
          </span>
          <span className="font-display text-2xl font-bold">رفوف</span>
        </Link>
        <nav className="hidden items-center gap-5 md:flex">
          <Link to="/" className={linkCls} activeOptions={{ exact: true }}>
            الرئيسية
          </Link>
          <Link to="/books" className={linkCls}>
            المتجر
          </Link>
          <Link to="/publisher" className={linkCls}>
            انشر كتابك
          </Link>
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <Link to="/cart" className="relative rounded-full p-2 hover:bg-muted" aria-label="السلة">
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 -start-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
          {session ? (
            <>
              {isAdmin && (
                <Link to="/admin" className="rounded-full p-2 hover:bg-muted" aria-label="الإدارة">
                  <Shield className="h-5 w-5" />
                </Link>
              )}
              <Link to="/publisher" className="rounded-full p-2 hover:bg-muted md:hidden" aria-label="انشر">
                <PenLine className="h-5 w-5" />
              </Link>
              <Link to="/account" className="rounded-full p-2 hover:bg-muted" aria-label="حسابي">
                <User className="h-5 w-5" />
              </Link>
              <button onClick={signOut} className="rounded-full p-2 hover:bg-muted" aria-label="خروج">
                <LogOut className="h-5 w-5" />
              </button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">دخول / تسجيل</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-ink text-ink-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 md:grid-cols-3">
        <div>
          <div className="font-display text-3xl font-bold text-gold">رفوف</div>
          <p className="mt-3 max-w-xs text-sm opacity-70">
            متجر كتب عربي يجمع القرّاء والناشرين في مكان واحد — نسخ رقمية فورية وكتب ورقية تصل إلى بابك.
          </p>
        </div>
        <div className="text-sm opacity-80">
          <div className="mb-3 font-semibold text-gold">تصفّح</div>
          <ul className="space-y-2">
            <li><Link to="/books">كل الكتب</Link></li>
            <li><Link to="/publisher">انشر معنا</Link></li>
            <li><Link to="/account">مكتبتي</Link></li>
          </ul>
        </div>
        <div className="text-sm opacity-70">© {new Date().getFullYear()} رفوف. جميع الحقوق محفوظة.</div>
      </div>
    </footer>
  );
}
