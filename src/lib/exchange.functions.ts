import { createServerFn } from "@tanstack/react-start";
export const getExchangeRates = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/SAR", { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error("Rates unavailable");
    const result = await response.json() as { result: string; rates: Record<string, number>; time_last_update_utc: string };
    if (result.result !== "success" || result.rates["SAR"] !== 1) throw new Error("Invalid rates");
    const rates: Record<string, number> = {};
    for (const key of ["SAR","EGP","USD","EUR","GBP","AED"]) {
      const value = result.rates[key];
      if (typeof value === "number" && value > 0) rates[key] = value;
    }
    return { rates, updated: result.time_last_update_utc };
  } catch { return { rates: { SAR: 1 } as Record<string, number>, updated: null }; }
});