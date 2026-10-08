/**
 * Stocks opportunity scanner — capital-aware universe, multi-TF analysis, selection.
 * Runs every ~15 min during US (15:30–22:00) and EU (09:00–17:30) Madrid windows.
 */

import "server-only";

import {
  getHistory,
  getIntradayHistory,
  screenerEuOpportunityUniverse,
  screenerUsOpportunityUniverse,
  type EodhdBar,
  type EodhdOpportunityRow,
} from "@/lib/market-data/eodhd";
import type { OhlcvBar } from "@/lib/market-data/types";
import {
  isEuropeanEquityOrderWindow,
  isUsListedEquityOrderWindow,
} from "@/lib/trading/cycle-schedule";
import {
  getEuropeanEurEquity,
  ibkrEurStocksAccountId,
  ibkrUsdStocksAccountId,
  stocksMaxPositionsPerAccount,
} from "@/lib/trading/europe-equities";
import { analyzeOpportunity } from "@/lib/trading/stocks/opportunity-score";
import {
  saveStocksOpportunityScan,
  type ScoredOpportunity,
  type StocksOpportunityScan,
} from "@/lib/trading/stocks/scan-store";
import { renderOpportunityChartPng } from "@/lib/trading/stocks/chart-png";
import {
  sendTelegramDocument,
  sendTelegramMessage,
} from "@/lib/notifications/telegram-bot";
import { fetchCapitalSnapshot, pickIbkrAccountWithMostUsd } from "@/lib/trading/capital";
import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { isIbkrNonExecutableUsEtf } from "@/lib/trading/usa-sectors";
import { isIbkrNonTradable } from "@/lib/trading/ibkr-non-tradable";

const TOP_CANDIDATES = 30;
const MIN_SCORE = 70;
const MIN_RR = 2;
const COST_MULT = 5;
const DEFAULT_ROUND_TRIP_COST = 0.002; // 0.2% estimate commissions+spread
const REL_VOL_MIN = 1.5;

function toOhlcv(bars: readonly EodhdBar[]): OhlcvBar[] {
  return bars.map((b) => ({
    date: b.date,
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
    volume: b.volume,
  }));
}

type AccountTag = { value?: string; currency?: string };
type AccountMap = Record<string, Record<string, AccountTag>>;

function numTag(tags: Record<string, AccountTag> | undefined, key: string): number {
  const v = Number(tags?.[key]?.value ?? NaN);
  return Number.isFinite(v) ? v : 0;
}

async function resolveCashBalances(): Promise<{ cashUsd: number; cashEur: number }> {
  try {
    const [cap, usdPick, account] = await Promise.all([
      fetchCapitalSnapshot().catch(() => null),
      pickIbkrAccountWithMostUsd().catch(() => ({ accountId: null as string | null, cashUSD: 0 })),
      ibkrServiceFetch<AccountMap>("/api/ibkr/account").catch(() => ({}) as AccountMap),
    ]);

    let cashUsd = Math.max(usdPick.cashUSD, cap?.cashUSD ?? 0);
    let cashEur = cap?.cashEUR ?? 0;

    const eurId = ibkrEurStocksAccountId().toUpperCase();
    const usdId = ibkrUsdStocksAccountId().toUpperCase();
    for (const [id, tags] of Object.entries(account ?? {})) {
      const upper = id.toUpperCase();
      const usd = numTag(tags, "CashBalance_USD");
      const eur = numTag(tags, "CashBalance_EUR");
      if (upper === usdId && usd > 0) cashUsd = Math.max(cashUsd, usd);
      if (upper === eurId && eur > 0) cashEur = Math.max(cashEur, eur);
      if (eur > cashEur) cashEur = eur;
      if (usd > cashUsd) cashUsd = usd;
    }

    if (!(cashUsd > 0)) cashUsd = Number(process.env.STOCKS_SCAN_FALLBACK_CASH_USD ?? 500);
    if (!(cashEur > 0)) cashEur = Number(process.env.STOCKS_SCAN_FALLBACK_CASH_EUR ?? 330);
    return { cashUsd, cashEur };
  } catch {
    return {
      cashUsd: Number(process.env.STOCKS_SCAN_FALLBACK_CASH_USD ?? 500),
      cashEur: Number(process.env.STOCKS_SCAN_FALLBACK_CASH_EUR ?? 330),
    };
  }
}

function prefilterDay(row: EodhdOpportunityRow): boolean {
  // Intraday move band −3%…+6%; relative volume > 1.5 when day vol ≠ avg (screener may only give avg)
  if (row.changePct < -3 || row.changePct > 6) return false;
  if (!(row.avgVolume > 0)) return false;
  const dayVol = Number(row.volume ?? 0);
  if (dayVol > 0 && Math.abs(dayVol - row.avgVolume) > 1) {
    if (dayVol / row.avgVolume < REL_VOL_MIN) return false;
  }
  return true;
}

function eligibleUs(row: EodhdOpportunityRow, maxPrice: number): boolean {
  if (isIbkrNonExecutableUsEtf(row.symbol)) return false;
  if (isIbkrNonTradable(row.symbol)) return false;
  if (!(row.price >= 2 && row.price <= maxPrice * 0.8)) return false;
  if (row.avgVolume < 1_000_000) return false;
  if ((row.marketCap ?? 0) > 0 && (row.marketCap ?? 0) < 300_000_000) return false;
  return prefilterDay(row);
}

function eligibleEu(row: EodhdOpportunityRow, maxPriceEur: number): boolean {
  if (!(row.price > 0 && row.price <= maxPriceEur * 0.8)) return false;
  if (row.avgVolume < 300_000) return false;
  return prefilterDay(row);
}

async function loadBenchmark(market: "US" | "EU"): Promise<OhlcvBar[]> {
  const sym = market === "US" ? "SPY" : "EXW1.XETRA"; // Euro Stoxx 50 ETF proxy
  const bars = await getHistory(sym, 120).catch(() => []);
  if (bars.length >= 60) return toOhlcv(bars);
  if (market === "EU") {
    const spy = await getHistory("SPY", 120).catch(() => []);
    return toOhlcv(spy);
  }
  return [];
}

function roundTripCostPct(market: "US" | "EU"): number {
  const env =
    market === "US"
      ? Number(process.env.STOCKS_US_ROUND_TRIP_COST_PCT ?? DEFAULT_ROUND_TRIP_COST)
      : Number(process.env.STOCKS_EU_ROUND_TRIP_COST_PCT ?? DEFAULT_ROUND_TRIP_COST);
  return Number.isFinite(env) && env > 0 ? env : DEFAULT_ROUND_TRIP_COST;
}

async function analyzeCandidate(
  row: EodhdOpportunityRow,
  market: "US" | "EU",
  benchmark: readonly OhlcvBar[],
): Promise<ScoredOpportunity | null> {
  const histKey = market === "EU" ? row.eodhdCode : row.symbol;
  const dailyRaw = await getHistory(histKey, 275).catch(() => []);
  if (dailyRaw.length < 60) return null;
  const hourlyRaw = await getIntradayHistory(histKey, "1h", 40).catch(() => []);
  const m15Raw = await getIntradayHistory(histKey, "15m", 10).catch(() => []);

  const analysis = analyzeOpportunity({
    daily: toOhlcv(dailyRaw),
    hourly: toOhlcv(hourlyRaw),
    m15: toOhlcv(m15Raw),
    benchmarkDaily: benchmark,
  });
  if (!analysis) return null;

  const cost = roundTripCostPct(market);
  const currency = market === "EU" ? "EUR" : "USD";
  let passed = true;
  let rejectReason: string | undefined;
  if (analysis.score < MIN_SCORE) {
    passed = false;
    rejectReason = `score ${analysis.score} < ${MIN_SCORE}`;
  } else if (analysis.riskReward < MIN_RR) {
    passed = false;
    rejectReason = `R:R ${analysis.riskReward} < ${MIN_RR}`;
  } else if (analysis.expectedMovePct / 100 < cost * COST_MULT) {
    passed = false;
    rejectReason = `move ${analysis.expectedMovePct.toFixed(2)}% < ${COST_MULT}× cost`;
  } else {
    const relVol = Number(analysis.indicators.relativeVolume ?? NaN);
    if (Number.isFinite(relVol) && relVol > 0 && relVol < REL_VOL_MIN) {
      passed = false;
      rejectReason = `relVol ${relVol.toFixed(2)} < ${REL_VOL_MIN}`;
    }
  }

  const eu = getEuropeanEurEquity(row.symbol);
  return {
    symbol: row.symbol,
    market,
    currency,
    price: analysis.entry,
    score: analysis.score,
    components: analysis.components,
    entry: analysis.entry,
    stop: analysis.stop,
    target: analysis.target,
    riskReward: analysis.riskReward,
    expectedMovePct: analysis.expectedMovePct,
    roundTripCostPct: cost,
    rationale: analysis.rationale,
    indicators: {
      ...analysis.indicators,
      eodhdCode: row.eodhdCode,
      exchange: row.exchange,
      primaryExchange: eu?.primaryExchange ?? null,
      patterns: analysis.patternsHit.join(","),
    },
    passedSelection: passed,
    rejectReason,
  };
}

export async function runStocksOpportunityScan(opts?: {
  notifyTelegram?: boolean;
  executeSelected?: boolean;
}): Promise<StocksOpportunityScan> {
  const notify = opts?.notifyTelegram !== false;
  const usOpen = isUsListedEquityOrderWindow();
  const euOpen = isEuropeanEquityOrderWindow();
  const { cashUsd, cashEur } = await resolveCashBalances();

  console.log(
    `[StocksScan] start usOpen=${usOpen} euOpen=${euOpen} cashUSD=$${cashUsd.toFixed(0)} cashEUR=€${cashEur.toFixed(0)}`,
  );

  if (!usOpen && !euOpen) {
    const empty: StocksOpportunityScan = {
      at: new Date().toISOString(),
      window: { usOpen, euOpen },
      cashUsd,
      cashEur,
      screened: 0,
      prefiltered: 0,
      analyzed: 0,
      selected: [],
      top10: [],
      allAnalyzed: [],
    };
    saveStocksOpportunityScan(empty);
    return empty;
  }

  const usRows = usOpen
    ? await screenerUsOpportunityUniverse(cashUsd).catch(() => [] as EodhdOpportunityRow[])
    : [];
  const euRows = euOpen
    ? await screenerEuOpportunityUniverse(cashEur).catch(() => [] as EodhdOpportunityRow[])
    : [];

  const usPre = usRows.filter((r) => eligibleUs(r, cashUsd));
  const euPre = euRows.filter((r) => eligibleEu(r, cashEur));

  // Rank prefilter by |change| * log(volume)
  const rankKey = (r: EodhdOpportunityRow) =>
    Math.abs(r.changePct) * Math.log10(Math.max(10, r.avgVolume));
  usPre.sort((a, b) => rankKey(b) - rankKey(a));
  euPre.sort((a, b) => rankKey(b) - rankKey(a));

  const usTake = Math.min(TOP_CANDIDATES, Math.ceil(TOP_CANDIDATES * (usOpen && euOpen ? 0.6 : 1)));
  const euTake = TOP_CANDIDATES - (usOpen ? Math.min(usTake, usPre.length) : 0);
  const candidates: Array<{ row: EodhdOpportunityRow; market: "US" | "EU" }> = [
    ...usPre.slice(0, usTake).map((row) => ({ row, market: "US" as const })),
    ...euPre.slice(0, Math.max(0, euTake)).map((row) => ({ row, market: "EU" as const })),
  ].slice(0, TOP_CANDIDATES);

  console.log(
    `[StocksScan] screened=${usRows.length + euRows.length} prefiltered=${usPre.length + euPre.length} analyze=${candidates.length}`,
  );

  const benchUs = usOpen ? await loadBenchmark("US") : [];
  const benchEu = euOpen ? await loadBenchmark("EU") : [];

  const analyzed: ScoredOpportunity[] = [];
  for (const c of candidates) {
    try {
      const scored = await analyzeCandidate(
        c.row,
        c.market,
        c.market === "US" ? benchUs : benchEu,
      );
      if (scored) analyzed.push(scored);
    } catch (err) {
      console.warn(
        `[StocksScan] ${c.row.symbol}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  analyzed.sort((a, b) => b.score * b.riskReward - a.score * a.riskReward);

  const RISK_PCT = 0.01;
  for (const a of analyzed) {
    const cash = a.currency === "EUR" ? cashEur : cashUsd;
    const riskBudget = cash * RISK_PCT;
    const perShareRisk = Math.max(0.01, a.entry - a.stop);
    let shares = Math.floor(riskBudget / perShareRisk);
    const maxByCash = Math.floor((cash * 0.98) / a.entry);
    shares = Math.max(0, Math.min(shares, maxByCash));
    a.suggestedShares = shares;
    a.suggestedNotional = Number((shares * a.entry).toFixed(2));
    if (a.passedSelection && shares < 1) {
      a.passedSelection = false;
      a.rejectReason = "sin tamaño (≥1 acción) con 1% riesgo / cash";
    }
  }

  const selected = analyzed
    .filter((a) => a.passedSelection && (a.suggestedShares ?? 0) >= 1)
    .slice(0, stocksMaxPositionsPerAccount());
  const top10 = analyzed.slice(0, 10);

  const scan: StocksOpportunityScan = {
    at: new Date().toISOString(),
    window: { usOpen, euOpen },
    cashUsd,
    cashEur,
    screened: usRows.length + euRows.length,
    prefiltered: usPre.length + euPre.length,
    analyzed: analyzed.length,
    selected,
    top10,
    allAnalyzed: analyzed,
  };
  saveStocksOpportunityScan(scan);

  console.log(
    `[StocksScan] done analyzed=${analyzed.length} selected=${selected.length} top=${top10[0]?.symbol ?? "—"} score=${top10[0]?.score ?? 0}`,
  );

  if (notify) {
    for (const opp of selected.slice(0, 3)) {
      await notifyOpportunityEntry(opp).catch((err) =>
        console.warn("[StocksScan] telegram entry:", err instanceof Error ? err.message : err),
      );
    }
  }

  return scan;
}

export async function notifyOpportunityEntry(opp: ScoredOpportunity): Promise<void> {
  const daily = await getHistory(
    String(opp.indicators.eodhdCode ?? opp.symbol),
    130,
  ).catch(() => []);
  const hourly = await getIntradayHistory(
    String(opp.indicators.eodhdCode ?? opp.symbol),
    "1h",
    20,
  ).catch(() => []);
  const png = renderOpportunityChartPng({
    symbol: opp.symbol,
    daily: toOhlcv(daily),
    hourly: toOhlcv(hourly),
    entry: opp.entry,
    stop: opp.stop,
    target: opp.target,
    support: Number(opp.indicators.support ?? opp.stop),
    resistance: Number(opp.indicators.resistance ?? opp.target),
  });
  const ccy = opp.currency === "EUR" ? "€" : "$";
  const lines = [
    `📈 <b>${opp.symbol}</b> ${opp.market} score=${opp.score} R:R=${opp.riskReward}`,
    `Entrada ${ccy}${opp.entry.toFixed(2)} · Stop ${ccy}${opp.stop.toFixed(2)} · Obj ${ccy}${opp.target.toFixed(2)}`,
    opp.rationale.slice(0, 3).join(" · ") || "Setup técnico multi-marco",
  ];
  await sendTelegramDocument({
    buffer: png,
    filename: `${opp.symbol}-setup.png`,
    caption: lines.join("\n"),
    mimeType: "image/png",
  });
}

export async function sendStocksScanDailyDigest(): Promise<void> {
  const scan = (await import("@/lib/trading/stocks/scan-store")).loadStocksOpportunityScan();
  if (!scan?.top10.length) {
    await sendTelegramMessage("📊 <b>Escáner stocks</b>: sin candidatos hoy");
    return;
  }
  const lines = [
    "📊 <b>Top 10 candidatos stocks</b>",
    `Cash USD $${scan.cashUsd.toFixed(0)} · EUR €${scan.cashEur.toFixed(0)}`,
    ...scan.top10.map(
      (o, i) =>
        `${i + 1}. ${o.symbol} ${o.market} score=${o.score} RR=${o.riskReward} ${o.passedSelection ? "✅" : "—"} ${(o.rationale[0] ?? o.rejectReason ?? "").slice(0, 60)}`,
    ),
  ];
  await sendTelegramMessage(lines.join("\n"));
}
