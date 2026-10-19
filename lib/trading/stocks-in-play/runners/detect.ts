import type { EodhdOpportunityRow } from "@/lib/market-data/eodhd";
import { passesHardSymbolRules, isAllowedUsListingExchange } from "@/lib/trading/stocks-in-play/filters";
import {
  RUNNERS_MIN_GAIN_PCT,
  RUNNERS_MIN_RVOL_PENNY,
  RUNNERS_PENNY_MAX_USD,
  RUNNERS_PENNY_MIN_USD,
} from "@/lib/trading/stocks-in-play/runners/config";

export function qualifiesAsRunner(params: {
  changePct: number;
  price: number;
  rvol: number;
}): boolean {
  if (params.changePct > RUNNERS_MIN_GAIN_PCT) return true;
  return (
    params.price >= RUNNERS_PENNY_MIN_USD &&
    params.price <= RUNNERS_PENNY_MAX_USD &&
    params.rvol >= RUNNERS_MIN_RVOL_PENNY
  );
}

export function passesRunnerUniverseRow(
  row: EodhdOpportunityRow,
  rvol: number,
): { ok: true; reason: string } | { ok: false; reason: string } {
  const symRule = passesHardSymbolRules(row.symbol);
  if (!symRule.ok) return symRule;
  if (!isAllowedUsListingExchange(row.exchange)) {
    return { ok: false, reason: `exchange_${row.exchange ?? "unknown"}` };
  }
  if (!qualifiesAsRunner({ changePct: row.changePct, price: row.price, rvol })) {
    return { ok: false, reason: "not_runner_criteria" };
  }
  const tags = ["RUNNERS"];
  if (row.changePct > RUNNERS_MIN_GAIN_PCT) tags.push(`gain +${row.changePct.toFixed(1)}%`);
  if (row.price >= RUNNERS_PENNY_MIN_USD && row.price <= RUNNERS_PENNY_MAX_USD) {
    tags.push(`$${row.price.toFixed(2)} RVOL ${rvol.toFixed(1)}×`);
  }
  return { ok: true, reason: tags.join("; ") };
}
