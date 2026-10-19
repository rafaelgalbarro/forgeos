import { isOtcPinkNonExecutable } from "@/lib/trading/otc-pink";
import { isIbkrNonExecutableUsEtf } from "@/lib/trading/usa-sectors";
import { isIbkrNonTradable } from "@/lib/trading/ibkr-non-tradable";
import type { EodhdOpportunityRow } from "@/lib/market-data/eodhd";

const ALLOWED_EXCHANGES = new Set([
  "NYSE",
  "NASDAQ",
  "NASDAQ GS",
  "NASDAQ GM",
  "NASDAQ CM",
  "AMEX",
  "NYSE AMERICAN",
  "NYSE MKT",
]);

const LEVERAGED_INVERSE_NAME = /\b(2X|3X|ULTRA|INVERSE|SHORT|BEAR|BULL)\b/i;

export function isAllowedUsListingExchange(exchange: string | undefined): boolean {
  const ex = (exchange ?? "").trim().toUpperCase();
  if (!ex) return true;
  if (ex.includes("PINK") || ex.includes("OTC")) return false;
  for (const allowed of ALLOWED_EXCHANGES) {
    if (ex === allowed || ex.startsWith(allowed)) return true;
  }
  return false;
}

export function isExcludedTickerSuffix(symbol: string): boolean {
  const t = symbol.trim().toUpperCase();
  return Boolean(t && /[WRU]$/.test(t) && t.length >= 4);
}

export function passesHardSymbolRules(symbol: string): { ok: true } | { ok: false; reason: string } {
  const t = symbol.trim().toUpperCase();
  if (!t) return { ok: false, reason: "empty_symbol" };
  if (isOtcPinkNonExecutable(t)) return { ok: false, reason: "otc_pink" };
  if (isIbkrNonExecutableUsEtf(t)) return { ok: false, reason: "etf_or_leveraged" };
  if (isExcludedTickerSuffix(t)) return { ok: false, reason: "warrant_rights_spac_suffix" };
  if (isIbkrNonTradable(t)) return { ok: false, reason: "ibkr_non_tradable" };
  return { ok: true };
}

export function passesHardScreenerRow(
  row: EodhdOpportunityRow,
  opts?: {
    earningsToday?: ReadonlySet<string>;
    haltSymbols?: ReadonlySet<string>;
    spreadPct?: number;
  },
): { ok: true } | { ok: false; reason: string } {
  const sym = row.symbol.trim().toUpperCase();
  const symRule = passesHardSymbolRules(sym);
  if (!symRule.ok) return symRule;
  if (!isAllowedUsListingExchange(row.exchange)) {
    return { ok: false, reason: `exchange_${row.exchange ?? "unknown"}` };
  }
  const type = String((row as { type?: string }).type ?? "").toUpperCase();
  if (type.includes("ETF") || type.includes("FUND")) return { ok: false, reason: "type_etf" };
  const name = String((row as { name?: string }).name ?? "");
  if (LEVERAGED_INVERSE_NAME.test(name)) return { ok: false, reason: "leveraged_inverse_name" };
  if (!(row.price >= 3 && row.price <= 60)) return { ok: false, reason: "price_band" };
  const mcap = row.marketCap ?? 0;
  if (mcap > 0 && mcap < 300_000_000) return { ok: false, reason: "mcap" };
  if (!(row.avgVolume >= 1_000_000)) return { ok: false, reason: "avg_volume_shares" };
  if (!(row.avgVolume * row.price >= 10_000_000)) return { ok: false, reason: "avg_dollar_volume" };
  if (opts?.earningsToday?.has(sym)) return { ok: false, reason: "earnings_day" };
  if (opts?.haltSymbols?.has(sym)) return { ok: false, reason: "trading_halt" };
  if (opts?.spreadPct != null && opts.spreadPct > 0.3) return { ok: false, reason: "spread" };
  return { ok: true };
}
