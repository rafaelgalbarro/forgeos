import { readEnvLocalKey } from "@/lib/trading/stocks-execution-gate";

export type StocksRunnersMode = "shadow" | "live";

export function getStocksRunnersMode(): StocksRunnersMode {
  const raw =
    readEnvLocalKey("STOCKS_RUNNERS_MODE") ??
    process.env.STOCKS_RUNNERS_MODE ??
    "shadow";
  return String(raw).trim().toLowerCase() === "live" ? "live" : "shadow";
}

export const RUNNERS_MAX_LIST = 20;
export const RUNNERS_MIN_RVOL_PENNY = 5;
export const RUNNERS_MIN_GAIN_PCT = 20;
export const RUNNERS_PENNY_MIN_USD = 1;
export const RUNNERS_PENNY_MAX_USD = 3;
