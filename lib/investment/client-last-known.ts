/**
 * Client last-known snapshot store — paint instantly on enter, refresh in background.
 */

const PREFIX = "forgeos:last-known:";

export function readLastKnown<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeLastKnown<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

/** Fire-and-forget warm of critical investment endpoints after shell mount / login. */
export function warmInvestmentDataCaches(): void {
  if (typeof window === "undefined") return;
  const urls = [
    "/api/investment/header-quotes",
    "/api/investment/dashboard",
    "/api/investment/opportunities?preferCache=1&limit=20",
    "/api/investment/batch-quotes?symbols=SPY,QQQ,AAPL,NVDA,TSLA,ASML,TSM,EZU,IBIT,EWJ",
  ];
  for (const url of urls) {
    void fetch(url, { cache: "no-store" }).catch(() => undefined);
  }
}
