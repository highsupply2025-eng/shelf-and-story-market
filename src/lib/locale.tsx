import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getExchangeRates } from "@/lib/exchange.functions";

export interface CountryInfo {
  code: string;
  nameAr: string;
  nameEn: string;
  currency: string;
  flag: string;
}

export const countries: CountryInfo[] = [
  { code: "EG", nameAr: "مصر", nameEn: "Egypt", currency: "EGP", flag: "🇪🇬" },
  { code: "SA", nameAr: "المملكة العربية السعودية", nameEn: "Saudi Arabia", currency: "SAR", flag: "🇸🇦" },
  { code: "AE", nameAr: "الإمارات العربية المتحدة", nameEn: "United Arab Emirates", currency: "AED", flag: "🇦🇪" },
  { code: "KW", nameAr: "الكويت", nameEn: "Kuwait", currency: "KWD", flag: "🇰🇼" },
  { code: "QA", nameAr: "قطر", nameEn: "Qatar", currency: "QAR", flag: "🇶🇦" },
  { code: "BH", nameAr: "البحرين", nameEn: "Bahrain", currency: "BHD", flag: "🇧🇭" },
  { code: "OM", nameAr: "عُمان", nameEn: "Oman", currency: "OMR", flag: "🇴🇲" },
  { code: "JO", nameAr: "الأردن", nameEn: "Jordan", currency: "JOD", flag: "🇯🇴" },
  { code: "US", nameAr: "الولايات المتحدة", nameEn: "United States", currency: "USD", flag: "🇺🇸" },
  { code: "GB", nameAr: "المملكة المتحدة", nameEn: "United Kingdom", currency: "GBP", flag: "🇬🇧" },
  { code: "FR", nameAr: "فرنسا", nameEn: "France", currency: "EUR", flag: "🇫🇷" },
  { code: "DE", nameAr: "ألمانيا", nameEn: "Germany", currency: "EUR", flag: "🇩🇪" },
  { code: "CA", nameAr: "كندا", nameEn: "Canada", currency: "CAD", flag: "🇨🇦" },
  { code: "AU", nameAr: "أستراليا", nameEn: "Australia", currency: "AUD", flag: "🇦🇺" },
  { code: "OTHER", nameAr: "دولي / بلدان أخرى", nameEn: "International", currency: "USD", flag: "🌐" },
];

export type Preferences = {
  language: "ar" | "en";
  country: string;
  currency: string;
};

type LocaleState = Preferences & {
  t: (ar: string, en: string) => string;
  set: (next: Partial<Preferences>, isManual?: boolean) => void;
  price: (n: number | null | undefined, base?: string) => string;
  updated: string | null;
  detectedRegionName: string;
  currentCountry: CountryInfo;
};

// Auto-detect default preferences from Timezone & Browser
function detectGeoFromTimezone(): Preferences {
  if (typeof window === "undefined") {
    return { language: "ar", country: "EG", currency: "EGP" };
  }

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const navLang = (navigator.language || "").toLowerCase();
    const isArabic = navLang.startsWith("ar");

    if (tz.includes("Cairo")) return { language: "ar", country: "EG", currency: "EGP" };
    if (tz.includes("Riyadh")) return { language: "ar", country: "SA", currency: "SAR" };
    if (tz.includes("Dubai")) return { language: "ar", country: "AE", currency: "AED" };
    if (tz.includes("Kuwait")) return { language: "ar", country: "KW", currency: "KWD" };
    if (tz.includes("Qatar")) return { language: "ar", country: "QA", currency: "QAR" };
    if (tz.includes("Bahrain")) return { language: "ar", country: "BH", currency: "BHD" };
    if (tz.includes("Muscat")) return { language: "ar", country: "OM", currency: "OMR" };
    if (tz.includes("Amman")) return { language: "ar", country: "JO", currency: "JOD" };
    if (tz.includes("London")) return { language: "en", country: "GB", currency: "GBP" };
    if (tz.includes("Paris") || tz.includes("Berlin") || tz.includes("Rome") || tz.includes("Madrid")) {
      return { language: isArabic ? "ar" : "en", country: "FR", currency: "EUR" };
    }
    if (tz.includes("New_York") || tz.includes("Chicago") || tz.includes("Los_Angeles") || tz.includes("Denver")) {
      return { language: isArabic ? "ar" : "en", country: "US", currency: "USD" };
    }
    if (tz.includes("Toronto") || tz.includes("Vancouver")) {
      return { language: isArabic ? "ar" : "en", country: "CA", currency: "CAD" };
    }
    if (tz.includes("Sydney") || tz.includes("Melbourne")) {
      return { language: isArabic ? "ar" : "en", country: "AU", currency: "AUD" };
    }

    return {
      language: isArabic ? "ar" : "en",
      country: isArabic ? "SA" : "US",
      currency: isArabic ? "SAR" : "USD",
    };
  } catch {
    return { language: "ar", country: "EG", currency: "EGP" };
  }
}

const defaultCountry = countries[0];

const Ctx = createContext<LocaleState>({
  language: "ar",
  country: "EG",
  currency: "EGP",
  t: (ar) => ar,
  set: () => {},
  price: (n) => `${n ?? "—"} EGP`,
  updated: null,
  detectedRegionName: "مصر",
  currentCountry: defaultCountry,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [prefs, setPrefs] = useState<Preferences>(() => {
    // 1. Initial synchronous state from storage or timezone
    if (typeof window !== "undefined") {
      try {
        const saved = JSON.parse(localStorage.getItem("rafoof-locale") || "null");
        if (saved) return saved;
      } catch {}
      return detectGeoFromTimezone();
    }
    return { language: "ar", country: "EG", currency: "EGP" };
  });

  const { data } = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: () => getExchangeRates(),
    staleTime: 3600000,
  });

  // 2. Asynchronous IP Geolocation auto-detection for first-time visitors
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isManual = localStorage.getItem("rafoof-locale-manual") === "true";
    if (isManual) return; // Respect user's explicit manual selection

    async function autoDetectIpCountry() {
      try {
        const res = await fetch("https://api.country.is/", { signal: AbortSignal.timeout(3000) });
        if (!res.ok) return;
        const geo = await res.json();
        const code = (geo?.country || "").toUpperCase();
        if (!code) return;

        const matched = countries.find((c) => c.code === code);
        const navLang = (navigator.language || "").toLowerCase();
        const isArabic = navLang.startsWith("ar");

        if (matched) {
          const autoPrefs: Preferences = {
            country: matched.code,
            currency: matched.currency,
            language: ["EG", "SA", "AE", "KW", "QA", "BH", "OM", "JO"].includes(matched.code) ? "ar" : isArabic ? "ar" : "en",
          };
          setPrefs(autoPrefs);
          localStorage.setItem("rafoof-locale", JSON.stringify(autoPrefs));
        } else {
          // If non-listed country, assign USD
          const autoPrefs: Preferences = {
            country: "OTHER",
            currency: "USD",
            language: isArabic ? "ar" : "en",
          };
          setPrefs(autoPrefs);
          localStorage.setItem("rafoof-locale", JSON.stringify(autoPrefs));
        }
      } catch {
        // Fallback to timezone already in effect
      }
    }

    autoDetectIpCountry();
  }, []);

  // 3. User profile sync
  useEffect(() => {
    if (!session) return;
    supabase
      .from("profiles")
      .select("language,country,currency")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data && data.language) {
          setPrefs((p) => ({
            ...p,
            language: data.language as "ar" | "en",
            country: data.country || p.country,
            currency: data.currency || p.currency,
          }));
        }
      });
  }, [session?.user.id]);

  // 4. Document DOM lang & dir sync
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = prefs.language;
    document.documentElement.dir = prefs.language === "ar" ? "rtl" : "ltr";
  }, [prefs.language]);

  const set = (next: Partial<Preferences>, isManual = true) => {
    const value = { ...prefs, ...next };
    setPrefs(value);
    if (typeof window !== "undefined") {
      localStorage.setItem("rafoof-locale", JSON.stringify(value));
      if (isManual) {
        localStorage.setItem("rafoof-locale-manual", "true");
      }
    }
    if (session) {
      supabase
        .from("profiles")
        .update(value)
        .eq("id", session.user.id)
        .then(({ error }) => {
          if (error) console.error("Preference save failed");
        });
    }
  };

  const currentCountry = countries.find((c) => c.code === prefs.country) || defaultCountry;
  const detectedRegionName = prefs.language === "ar" ? currentCountry.nameAr : currentCountry.nameEn;

  // Real-time multi-currency price formatter
  const price = (n: number | null | undefined, base = "SAR") => {
    if (n == null) return "—";
    const targetCurrency = prefs.currency || "SAR";
    const rate = data?.rates?.[targetCurrency];
    const baseRate = data?.rates?.[base] || 1;
    const converted = rate && baseRate ? (n * rate) / baseRate : n;

    try {
      return new Intl.NumberFormat(prefs.language === "ar" ? "ar-EG" : "en-US", {
        style: "currency",
        currency: targetCurrency,
        maximumFractionDigits: targetCurrency === "KWD" || targetCurrency === "BHD" || targetCurrency === "OMR" ? 3 : 2,
      }).format(converted);
    } catch {
      return `${Math.round(converted * 100) / 100} ${targetCurrency}`;
    }
  };

  return (
    <Ctx.Provider
      value={{
        ...prefs,
        set,
        price,
        t: (ar, en) => (prefs.language === "ar" ? ar : en),
        updated: data?.updated ?? null,
        detectedRegionName,
        currentCountry,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useLocale = () => useContext(Ctx);
