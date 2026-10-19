import { readEnvLocalKey } from "@/lib/trading/stocks-execution-gate";
import type { StocksInPlayMode } from "@/lib/trading/stocks-in-play/types";

export const STOCKS_IN_PLAY_MAX_LIST = 15;
export const STOCKS_IN_PLAY_MAX_NOTIONAL_USD = 50;
export const STOCKS_IN_PLAY_MAX_OPEN_POSITIONS = 1;
export const STOCKS_IN_PLAY_COST_MULT = 3;
export const STOCKS_IN_PLAY_MIN_SHADOW_CLOSED = 20;
export const STOCKS_IN_PLAY_MIN_PROFIT_FACTOR = 1.2;

export function getStocksInPlayMode(): StocksInPlayMode {
  const raw =
    readEnvLocalKey("STOCKS_IN_PLAY_MODE") ??
    process.env.STOCKS_IN_PLAY_MODE ??
    "shadow";
  return String(raw).trim().toLowerCase() === "live" ? "live" : "shadow";
}
