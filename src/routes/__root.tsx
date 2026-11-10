import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { AppBottomNav } from "@/components/AppBottomNav";
import { useAppMode } from "@/lib/useAppMode";
import { InstallPrompt } from "@/components/InstallPrompt";
import { Toaster } from "@/components/ui/sonner";
import { LocaleProvider } from "@/lib/locale";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#9a4320" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "unibook" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { title: "unibook — متجر الكتب الرقمية والورقية" },
      { name: "description", content: "اشترِ الكتب الرقمية والورقية أو انشر كتابك على unibook." },
      { property: "og:site_name", content: "unibook" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "unibook — متجر الكتب الرقمية والورقية" },
      { property: "og:description", content: "اشترِ الكتب الرقمية والورقية أو انشر كتابك على unibook." },
      { property: "og:image", content: "https://unibook.store/icon-512.png" },
      { property: "og:image:width", content: "512" },
      { property: "og:image:height", content: "512" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "unibook — متجر الكتب الرقمية والورقية" },
      { name: "twitter:description", content: "اشترِ الكتب الرقمية والورقية أو انشر كتابك على unibook." },
      { name: "twitter:image", content: "https://unibook.store/icon-512.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", sizes: "48x48 32x32 16x16" },
      { rel: "shortcut icon", href: "/favicon.ico" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
      { rel: "icon", type: "image/png", sizes: "64x64", href: "/favicon.png" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=El+Messiri:wght@500;600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              #lovable-badge, [id*="lovable-badge"], [class*="lovable-badge"], [data-lovable-badge], lovable-badge, a[href*="lovable.dev"], a[href*="gptengineer.app"], div:has(> a[href*="lovable.dev"]), div:has(> a[href*="gptengineer.app"]) {
                display: none !important;
                opacity: 0 !important;
                visibility: hidden !important;
                pointer-events: none !important;
                width: 0 !important;
                height: 0 !important;
                position: absolute !important;
                z-index: -99999 !important;
              }
            `,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const { isAppExperience } = useAppMode();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");

  // Completely hide web footer in mobile app experience OR on specific account/checkout pages
  const hideFooter =
    isAppExperience ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/publisher") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/cart") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/contact");

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  // Permanently suppress and eradicate any "Edit with Lovable" badge
  useEffect(() => {
    if (typeof window === "undefined") return;

    const purgeLovableBadge = () => {
      const selectors = [
        "#lovable-badge",
        "[id*='lovable-badge']",
        "[class*='lovable-badge']",
        "[data-lovable-badge]",
        "lovable-badge",
        "a[href*='lovable.dev']",
        "a[href*='gptengineer.app']",
        "iframe[src*='lovable.dev']",
        "div:has(> a[href*='lovable.dev'])",
        "[data-component-name='LovableBadge']",
      ];
      selectors.forEach((sel) => {
        try {
          document.querySelectorAll(sel).forEach((el) => {
            el.remove();
          });
        } catch {
          /* ignore */
        }
      });

      // Also scan direct children of body for floating widgets containing "Lovable"
      document.querySelectorAll("body > div, body > a").forEach((el) => {
        const text = (el.textContent || "").toLowerCase();
        if (text.includes("edit with lovable") || text.includes("built with lovable")) {
          el.remove();
        }
      });
    };

    purgeLovableBadge();

    const observer = new MutationObserver(() => {
      purgeLovableBadge();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LocaleProvider>
        <CartProvider>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className={`flex-1 ${isAppExperience && !isAuthPage ? "pb-24 sm:pb-28" : "pb-0"} pb-safe`}>
              <Outlet />
            </main>
            {!hideFooter && <SiteFooter />}
            <AppBottomNav />
          </div>
          <Toaster position="top-center" richColors />
          <InstallPrompt />
        </CartProvider>
        </LocaleProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
