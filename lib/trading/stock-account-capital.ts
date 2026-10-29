/**
 * Per-account stock capital (pure — safe for unit tests).
 * EUR local listings: size only on IBKR_EUR_STOCKS account; never USD cash from other accounts.
 */

import {
  ibkrEurStocksAccountId,
  ibkrUsdStocksAccountId,
} from "@/lib/trading/europe-equities";
import { isEuropeanEurEquity } from "@/lib/trading/europe-equities";

export type AccountTagRow = { value?: string; currency?: string };

export type StockSizingCurrency = "USD" | "EUR";

export type StockAccountCapitalPick = {
  accountId: string | null;
  currency: StockSizingCurrency;
  /** Raw cash in sizing currency (before reserve). */
  cash: number;
  /** Cash after reserve / USD-debit haircut — used for resolvePositionSize. */
  usableCash: number;
  cashUsd: number;
  cashEur: number;
  detail: string;
};

function numTag(tags: Record<string, AccountTagRow> | undefined, key: string): number {
  const n = Number(tags?.[key]?.value);
  return Number.isFinite(n) ? n : 0;
}

function tagCurrency(tags: Record<string, AccountTagRow> | undefined, key: string): string {
  return String(tags?.[key]?.currency ?? "").toUpperCase();
}

/** Conservative EUR/USD for USD loan haircut on multi-currency accounts. */
export function eurUsdFxForMargin(): number {
  const n = Number(process.env.STOCKS_EUR_USD_FX ?? 1.08);
  return Number.isFinite(n) && n > 0 ? n : 1.08;
}

/**
 * Usable EUR for a local EUR stock BUY on one IBKR account.
 * Never spends USD; if CashBalance_USD is negative, caps by net cash in EUR terms.
 */
export function computeUsableEurForLocalStockBuy(balances: {
  cashEur: number;
  cashUsd: number;
  availableFunds?: number;
  availableFundsCurrency?: string;
}): { usableEur: number; detail: string } {
  const cashEur = balances.cashEur;
  const cashUsd = balances.cashUsd;
  if (!(cashEur > 0)) {
    return {
      usableEur: 0,
      detail: `CashBalance_EUR=€${Math.max(0, cashEur).toFixed(2)} (sin EUR positivo)`,
    };
  }

  let usableEur = cashEur;
  let detail: string;

  if (cashUsd < 0) {
    const fx = eurUsdFxForMargin();
    const netCashEur = cashEur + cashUsd / fx;
    usableEur = Math.max(0, Math.min(cashEur, netCashEur));
    detail =
      `EUR cash €${cashEur.toFixed(2)}; préstamo USD $${cashUsd.toFixed(2)} ` +
      `(net≈€${netCashEur.toFixed(2)} @${fx.toFixed(2)}); utilizable €${usableEur.toFixed(2)}`;
  } else {
    detail =
      `EUR cash €${cashEur.toFixed(2)} (USD $${cashUsd.toFixed(2)} no usado para compras EUR)`;
  }

  const af = balances.availableFunds ?? 0;
  const afCur = (balances.availableFundsCurrency ?? "").toUpperCase();
  if (af > 0 && afCur === "EUR" && af < usableEur) {
    usableEur = af;
    detail += `; AvailableFunds €${af.toFixed(2)}`;
  }

  return { usableEur: Math.max(0, usableEur), detail };
}

export function extractAccountCashFromTags(
  tags: Record<string, AccountTagRow> | undefined,
): {
  cashUsd: number;
  cashEur: number;
  availableFunds: number;
  availableFundsCurrency: string;
} {
  const cbUsd = numTag(tags, "CashBalance_USD");
  const cbEur = numTag(tags, "CashBalance_EUR");
  let cashUsd = cbUsd;
  let cashEur = cbEur;
  if (!(cashUsd > 0) && !(cashEur > 0)) {
    const total = numTag(tags, "TotalCashValue");
    const cur = tagCurrency(tags, "TotalCashValue");
    if (cur === "USD" && total > 0) cashUsd = total;
    else if (cur === "EUR" && total > 0) cashEur = total;
  }
  const availableFunds = numTag(tags, "AvailableFunds");
  const availableFundsCurrency = tagCurrency(tags, "AvailableFunds");
  return { cashUsd, cashEur, availableFunds, availableFundsCurrency };
}

export function pickStockAccountCapitalFromMap(
  accountMap: Record<string, Record<string, AccountTagRow>>,
  ticker: string,
): StockAccountCapitalPick {
  const sym = ticker.trim().toUpperCase();
  const eu = isEuropeanEurEquity(sym);

  if (eu) {
    const target = ibkrEurStocksAccountId().trim().toUpperCase();
    const id =
      Object.keys(accountMap ?? {}).find((k) => k.trim().toUpperCase() === target) ??
      target;
    const tags = accountMap[id];
    const { cashUsd, cashEur, availableFunds, availableFundsCurrency } =
      extractAccountCashFromTags(tags);
    const { usableEur, detail } = computeUsableEurForLocalStockBuy({
      cashEur,
      cashUsd,
      availableFunds,
      availableFundsCurrency,
    });
    return {
      accountId: id,
      currency: "EUR",
      cash: Math.max(0, cashEur),
      usableCash: usableEur,
      cashUsd,
      cashEur,
      detail: `cuenta ${id} | ${detail}`,
    };
  }

  const usdTarget = ibkrUsdStocksAccountId().trim().toUpperCase();
  const preferKey = Object.keys(accountMap ?? {}).find(
    (k) => k.trim().toUpperCase() === usdTarget,
  );
  // Owner 29/10: the EUR account may also buy US stocks (IBKR lends/converts the USD against the
  // EUR cash). Use whichever account can fund the larger order.
  const fromEur = usdBuyingPowerFromEurAccount(accountMap);
  if (fromEur) {
    const preferUsd = preferKey ? Math.max(0, extractAccountCashFromTags(accountMap[preferKey]).cashUsd) : 0;
    if (fromEur.usableUsd > preferUsd) {
      return {
        accountId: fromEur.accountId,
        currency: "USD",
        cash: fromEur.usableUsd,
        usableCash: fromEur.usableUsd,
        cashUsd: fromEur.cashUsd,
        cashEur: fromEur.cashEur,
        detail: `cuenta ${fromEur.accountId} | ${fromEur.detail}`,
      };
    }
  }
  if (preferKey) {
    const { cashUsd } = extractAccountCashFromTags(accountMap[preferKey]);
    if (cashUsd > 0) {
      return {
        accountId: preferKey,
        currency: "USD",
        cash: cashUsd,
        usableCash: cashUsd,
        cashUsd,
        cashEur: 0,
        detail: `cuenta ${preferKey} | USD cash $${cashUsd.toFixed(2)}`,
      };
    }
  }

  let bestId: string | null = null;
  let bestUsd = 0;
  for (const [rawId, tags] of Object.entries(accountMap ?? {})) {
    const { cashUsd } = extractAccountCashFromTags(tags);
    if (cashUsd < 0) continue;
    if (cashUsd > bestUsd) {
      bestUsd = cashUsd;
      bestId = rawId;
    }
  }

  const cash = Math.max(0, bestUsd);
  return {
    accountId: bestId,
    currency: "USD",
    cash,
    usableCash: cash,
    cashUsd: cash,
    cashEur: 0,
    detail:
      bestId && cash > 0
        ? `cuenta ${bestId} | USD cash $${cash.toFixed(2)}`
        : "ninguna cuenta con USD cash > 0",
  };
}

/**
 * USD buying power of the EUR stocks account for a US stock BUY:
 * USD cash (or minus a USD loan) + 90 % of EUR cash at a conservative EUR/USD, capped by
 * AvailableFunds. Disabled with STOCKS_US_FROM_EUR_ACCOUNT=false.
 */
export function usdBuyingPowerFromEurAccount(
  accountMap: Record<string, Record<string, AccountTagRow>>,
): { accountId: string; usableUsd: number; cashUsd: number; cashEur: number; detail: string } | null {
  if ((process.env.STOCKS_US_FROM_EUR_ACCOUNT ?? "true").trim().toLowerCase() === "false") return null;
  const target = ibkrEurStocksAccountId().trim().toUpperCase();
  if (!target) return null;
  const id = Object.keys(accountMap ?? {}).find((k) => k.trim().toUpperCase() === target);
  if (!id) return null;
  const { cashUsd, cashEur, availableFunds, availableFundsCurrency } = extractAccountCashFromTags(accountMap[id]);
  const fx = eurUsdFxForMargin();
  let usable = cashUsd + Math.max(0, cashEur) * fx * 0.9;
  let detail = `USD $${cashUsd.toFixed(2)} + 90% de EUR €${Math.max(0, cashEur).toFixed(2)} @${fx.toFixed(2)}`;
  const afUsd = availableFunds > 0 ? (availableFundsCurrency === "USD" ? availableFunds : availableFunds * fx) : 0;
  if (afUsd > 0 && afUsd < usable) {
    usable = afUsd;
    detail += `; AvailableFunds ≈$${afUsd.toFixed(2)}`;
  }
  usable = Math.max(0, usable);
  return { accountId: id, usableUsd: usable, cashUsd, cashEur, detail: `${detail} → utilizable $${usable.toFixed(2)}` };
}
