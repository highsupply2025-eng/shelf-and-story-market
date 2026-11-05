import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/locale";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const KEY = "unibook_install_dismissed";

/** Offers "install unibook" on supported phones; on iPhone shows Add-to-Home-Screen steps. */
export function InstallPrompt() {
  const { t } = useLocale();
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone;
    const dismissed = Number(localStorage.getItem(KEY) || 0);
    if (standalone || window.self !== window.top || Date.now() - dismissed < 7 * 864e5) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isIos) {
      setIos(true);
      timer = setTimeout(() => setShow(true), 4000);
    }
    const onInstalled = () => setShow(false);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(KEY, String(Date.now()));
    setShow(false);
  }

  async function install() {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    setEvt(null);
    setShow(false);
  }

  if (!show) return null;
  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-6 fade-in duration-500 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-lg">
        <img src="/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl border border-border" />
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold leading-tight">{t("ثبّت تطبيق unibook", "Install the unibook app")}</p>
          <p className="text-xs text-muted-foreground">
            {ios ? (
              <span className="inline-flex flex-wrap items-center gap-1">
                {t("اضغط", "Tap")} <Share className="inline h-3.5 w-3.5" /> {t("ثم «إضافة إلى الشاشة الرئيسية»", "then “Add to Home Screen”")}
              </span>
            ) : (
              t("وصول أسرع لمكتبتك من شاشة هاتفك", "Faster access to your library")
            )}
          </p>
        </div>
        {!ios && (
          <Button size="sm" onClick={install} className="shrink-0 gap-1 rounded-full font-bold">
            <Download className="h-4 w-4" />
            {t("تثبيت", "Install")}
          </Button>
        )}
        <button onClick={dismiss} aria-label={t("إغلاق", "Close")} className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
