/**
 * Real IBKR capital + exposure for pre-order risk checks.
 */

import "server-only";

import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import {
  fetchTradingAccountSnapshot,
  type TradingAccountSnapshot,
} from "@/lib/trading/ibkr-data";
import {
  getOrSetIbkrCached,
  ibkrCacheKey,
} from "@/lib/trading/ibkr-cache";

export type CapitalSnapshot = TradingAccountSnapshot & {
  cashEUR: number;
  availableFunds: number;
  grossPositionValue: number;
  exposureUSD: number;
  openTickers: string[];
};

type AccountTag = { value?: string; currency?: string };
type AccountMap = Record<string, Record<string, AccountTag>>;

function num(tags: Record<string, AccountTag> | undefined, tag: string): number {
  const n = Number(tags?.[tag]?.value);
  return Number.isFinite(n) ? n : 0;
}

function tagCurrency(tags: Record<string, AccountTag> | undefined, tag: string): string {
  return String(tags?.[tag]?.currency ?? "").toUpperCase();
}

async function loadCapitalLive(): Promise<CapitalSnapshot> {
  const [base, account, positions] = await Promise.all([
    fetchTradingAccountSnapshot(),
    ibkrServiceFetch<AccountMap>("/api/ibkr/account").catch(() => ({}) as AccountMap),
    ibkrServiceFetch<
      Array<{
        symbol?: string;
        position?: number;
        avgCost?: number;
        marketValue?: number;
        currency?: string;
        account?: string;
      }>
    >("/api/ibkr/positions").catch(() => []),
  ]);

  const primary = (process.env.IBKR_ACCOUNT_ID ?? "").trim();
  const ids = Object.keys(account ?? {});
  const pickId =
    primary && ids.includes(primary) ? primary : ids[0] ?? "";
  const tags = pickId ? account[pickId] : undefined;

  let cashUSD = 0;
  let cashEUR = 0;
  const cbUsd = num(tags, "CashBalance_USD");
  const cbEur = num(tags, "CashBalance_EUR");
  if (cbUsd > 0 || cbEur > 0) {
    cashUSD = cbUsd;
    cashEUR = cbEur;
  } else {
    const totalCash = num(tags, "TotalCashValue") || base.cashUSD;
    const cur = tagCurrency(tags, "TotalCashValue");
    if (cur === "EUR") {
      cashEUR = totalCash;
      cashUSD = 0;
    } else if (cur === "USD") {
      cashUSD = totalCash;
    } else {
      // Base currency unknown — treat TotalCashValue as available buying power proxy in USD terms
      cashUSD = totalCash;
    }
  }

  const availableFunds =
    num(tags, "AvailableFunds") || Math.max(cashUSD, cashEUR, base.cashUSD);
  const grossPositionValue = num(tags, "GrossPositionValue");

  const openTickers: string[] = [];
  let exposureUSD = 0;
  for (const p of Array.isArray(positions) ? positions : []) {
    if (primary && p.account && p.account !== primary) continue;
    const qty = Math.abs(Number(p.position ?? 0));
    if (!(qty > 0)) continue;
    const symbol = String(p.symbol ?? "").trim().toUpperCase();
    if (!symbol) continue;
    openTickers.push(symbol);
    const mv = Math.abs(Number(p.marketValue ?? 0));
    const avg = Number(p.avgCost ?? 0);
    exposureUSD += mv > 0 ? mv : qty * (Number.isFinite(avg) ? avg : 0);
  }
  if (!(exposureUSD > 0) && grossPositionValue > 0) {
    exposureUSD = grossPositionValue;
  }

  // Prefer explicit USD cash; if only EUR, keep cashUSD as 0 but availableFunds for sizing via EUR
  const tradingCash =
    cashUSD > 0 ? cashUSD : cashEUR > 0 ? cashEUR : base.cashUSD;

  return {
    ...base,
    cashUSD: cashUSD > 0 ? cashUSD : tradingCash,
    cashEUR,
    availableFunds: availableFunds > 0 ? availableFunds : tradingCash,
    grossPositionValue,
    exposureUSD,
    openTickers: [...new Set(openTickers)],
  };
}

/** Cached ~30s — short enough for live sizing, long enough to avoid spam. */
export async function fetchCapitalSnapshot(): Promise<CapitalSnapshot> {
  return getOrSetIbkrCached(ibkrCacheKey("capital-v2"), loadCapitalLive, 30_000);
}

/**
 * Pick IBKR account with the most USD cash (CashBalance_USD / TotalCashValue USD).
 * Used when IBKR_CRYPTO_ENABLED routes crypto to PAXOS.
 */
export async function pickIbkrAccountWithMostUsd(): Promise<{
  accountId: string | null;
  cashUSD: number;
}> {
  try {
    const account = await ibkrServiceFetch<AccountMap>("/api/ibkr/account");
    const ids = Object.keys(account ?? {});
    if (ids.length === 0) {
      const fallback = (process.env.IBKR_ACCOUNT_ID ?? "").trim() || null;
      return { accountId: fallback, cashUSD: 0 };
    }

    let bestId = ids[0]!;
    let bestUsd = -1;
    for (const id of ids) {
      const tags = account[id];
      const cbUsd = num(tags, "CashBalance_USD");
      const total = num(tags, "TotalCashValue");
      const cur = tagCurrency(tags, "TotalCashValue");
      const available = num(tags, "AvailableFunds");
      let usd = cbUsd;
      if (!(usd > 0) && cur === "USD" && total > 0) usd = total;
      if (!(usd > 0) && available > 0 && cur !== "EUR") usd = available;
      if (usd > bestUsd) {
        bestUsd = usd;
        bestId = id;
      }
    }

    const primary = (process.env.IBKR_ACCOUNT_ID ?? "").trim();
    if (!(bestUsd > 0) && primary && ids.includes(primary)) {
      return { accountId: primary, cashUSD: 0 };
    }

    console.log(
      `[Capital] cuenta con más USD: ${bestId} cashUSD=$${Math.max(0, bestUsd).toFixed(2)}`,
    );
    return { accountId: bestId, cashUSD: Math.max(0, bestUsd) };
  } catch (err) {
    console.warn(
      "[Capital] pickIbkrAccountWithMostUsd failed:",
      err instanceof Error ? err.message : err,
    );
    return {
      accountId: (process.env.IBKR_ACCOUNT_ID ?? "").trim() || null,
      cashUSD: 0,
    };
  }
}

/** Tickers that typically need settled USD (leveraged / vol / crypto ETFs). */
export const USD_REQUIRED_ETFS = new Set([
  "VXX",
  "UVXY",
  "SVXY",
  "TQQQ",
  "SQQQ",
  "SPXU",
  "UPRO",
  "SOXL",
  "SOXS",
  "IBIT",
  "FETH",
  "BITO",
  "ARKB",
  "GBTC",
  "ETHA",
  "BITB",
]);

/** European ADRs that trade USD on SMART. */
export const EUROPEAN_ADR_USD = new Set([
  "GSK",
  "SHEL",
  "BP",
  "AZN",
  "UL",
  "NVS",
  "SAN",
  "BBVA",
  "ING",
  "ASML",
  "NVO",
]);

export function requiresUsdBalance(ticker: string): boolean {
  return USD_REQUIRED_ETFS.has(ticker.trim().toUpperCase());
}

export function isEuropeanAdr(ticker: string): boolean {
  return EUROPEAN_ADR_USD.has(ticker.trim().toUpperCase());
}
