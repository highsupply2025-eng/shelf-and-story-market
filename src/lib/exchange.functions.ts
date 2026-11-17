import { createServerFn } from "@tanstack/react-start";

export const getExchangeRates = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error("Rates unavailable");
    const result = (await response.json()) as { result: string; rates: Record<string, number>; time_last_update_utc: string };
    if (result.result !== "success" || result.rates["USD"] !== 1) throw new Error("Invalid rates");
    const rates: Record<string, number> = {};
    const supported = [
      "USD", "EGP", "SAR", "EUR", "GBP", "AED", "KWD", "QAR", "BHD", "OMR", "JOD", "CAD", "AUD"
    ];
    for (const key of supported) {
      const value = result.rates[key];
      if (typeof value === "number" && value > 0) rates[key] = value;
    }
    return { rates, updated: result.time_last_update_utc };
  } catch {
    return {
      rates: {
        USD: 1, EGP: 49.5, SAR: 3.75, AED: 3.67, EUR: 0.92, GBP: 0.79,
        KWD: 0.307, QAR: 3.64, BHD: 0.376, OMR: 0.385, JOD: 0.709, CAD: 1.39, AUD: 1.53,
      } as Record<string, number>,
      updated: null,
    };
  }
});
