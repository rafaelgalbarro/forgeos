/**
 * When EU RTH overlaps US premarket, alternate full-universe focus per stocks cycle
 * (keeps each cycle within ticker timeout without changing CYCLE_TIMEOUT_MS).
 */

import {
  isEuropeanEquityOrderWindow,
  isUsListedEquityOrderWindow,
} from "@/lib/trading/cycle-schedule";
import { isUsPremarketSession } from "@/lib/trading/exchange-hours";

export type StocksUniverseBand = "EU" | "US_PREMARKET" | "US_REGULAR";

export type StocksCycleUniversePlan = {
  includeEu: boolean;
  includeUsPremarketAnalysis: boolean;
  includeUsRegular: boolean;
  /** Which band was chosen when EU ∩ US premarket overlap. */
  overlapFocus?: StocksUniverseBand;
  label: string;
};

/** Pure planner — pass monotonic cycle counter from persistence. */
export function planStocksCycleUniverse(
  at: Date,
  cycleCounter: number,
): StocksCycleUniversePlan {
  const euOpen = isEuropeanEquityOrderWindow(at);
  const usRegular = isUsListedEquityOrderWindow(at);
  const usPremarket = isUsPremarketSession(at) && !usRegular;

  let includeEu = euOpen;
  let includeUsPremarketAnalysis = usPremarket;
  let includeUsRegular = usRegular;
  let overlapFocus: StocksUniverseBand | undefined;

  if (euOpen && usPremarket && !usRegular) {
    overlapFocus = cycleCounter % 2 === 0 ? "EU" : "US_PREMARKET";
    if (overlapFocus === "EU") {
      includeUsPremarketAnalysis = false;
    } else {
      includeEu = false;
    }
  }

  const parts: string[] = [];
  if (includeEu) parts.push("EU");
  if (includeUsPremarketAnalysis) parts.push("US_PREMARKET");
  if (includeUsRegular) parts.push("US_REGULAR");
  const label =
    overlapFocus != null
      ? `${parts.join("+")}(alt-${overlapFocus})`
      : parts.join("+") || "none";

  return {
    includeEu,
    includeUsPremarketAnalysis,
    includeUsRegular,
    overlapFocus,
    label,
  };
}
