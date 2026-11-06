import { useState, useEffect } from "react";

export function useAppMode() {
  const [isAppMode, setIsAppMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const isCapacitor = Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
    const hasAppParam = window.location.search.includes("app=1");
    const isStored = window.localStorage.getItem("is_app_mode") === "1";
    const isStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches ?? false;

    if (hasAppParam || isCapacitor) {
      try {
        window.localStorage.setItem("is_app_mode", "1");
      } catch {
        // ignore storage errors
      }
    }

    return isCapacitor || hasAppParam || isStored || isStandalone;
  });

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkApp = () => {
      const isCapacitor = Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
      const hasAppParam = window.location.search.includes("app=1");
      const isStored = window.localStorage.getItem("is_app_mode") === "1";
      const isStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches ?? false;

      if (hasAppParam || isCapacitor) {
        window.localStorage.setItem("is_app_mode", "1");
      }

      setIsAppMode(isCapacitor || hasAppParam || isStored || isStandalone);
      setIsMobile(window.innerWidth < 768);
    };

    checkApp();

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    isAppMode,
    isMobile,
    isAppExperience: isAppMode || isMobile,
  };
}
