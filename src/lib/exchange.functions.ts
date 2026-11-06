import { createServerFn } from "@tanstack/react-start";

export const getExchangeRates = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/SAR", { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error("Rates unavailable");
    const result = (await response.json()) as { result: string; rates: Record<string, number>; time_last_update_utc: string };
    if (result.result !== "success" || result.rates["SAR"] !== 1) throw new Error("Invalid rates");
    const rates: Record<string, number> = {};
    const supported = [
      "SAR", "EGP", "USD", "EUR", "GBP", "AED", "KWD", "QAR", "BHD", "OMR", "JOD", "CAD", "AUD", "KWD"
    ];
    for (const key of supported) {
      const value = result.rates[key];
      if (typeof value === "number" && value > 0) rates[key] = value;
    }
    return { rates, updated: result.time_last_update_utc };
  } catch {
    return {
      rates: { SAR: 1, EGP: 13.5, USD: 0.27, EUR: 0.25, GBP: 0.21, AED: 0.98, KWD: 0.082, QAR: 0.97, BHD: 0.10, OMR: 0.10, JOD: 0.19 } as Record<string, number>,
      updated: null,
    };
  }
});
