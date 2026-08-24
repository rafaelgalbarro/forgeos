/**
 * Telegram notification policy — hourly digests, immediate trade alerts, night silence.
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";
import { getDailyPnlSummary, listTrades } from "@/lib/db/database";
import { getDailyMarketUniverse } from "@/lib/investment/market-daily-universe";
import { getBatchQuotes } from "@/lib/market-data/fmp";
import { readMultiScannerResults } from "@/lib/market-data/scanner-store";
import { fetchTradingAccountSnapshot, fetchTradingPrice } from "@/lib/trading/ibkr-data";
import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";
import {
  computeRiskRewardLabel,
  formatPremiumHourlySummary,
  formatShortHourlySummary,
  usdToEur,
  type PremiumHourlyContext,
  type PremiumOpenLine,
} from "@/lib/notifications/telegram-premium-format";
import { loadTradingState } from "@/src/core/trading/trading-state-store";

const MADRID_TZ = "Europe/Madrid";
const STORE_FILE = path.resolve(process.cwd(), ".forgeos", "cache", "telegram-hourly.json");
const STATS_FILE = path.resolve(process.cwd(), ".forgeos", "cache", "cycle-daily-stats.json");

export type TelegramAlertKind = "critical" | "trade" | "digest" | "noise";

type HourlyClose = {
  ticker: string;
  pnlUSD: number;
  pnlPct: number;
  price: number;
  kind: "TP" | "SL" | "MANUAL" | "PAPER";
  at: string;
};

type HourlyExec = {
  ticker: string;
  side: "BUY" | "SELL";
  shares: number;
  price: number;
  at: string;
};

type HourBucket = {
  hourKey: string;
  executions: HourlyExec[];
  closes: HourlyClose[];
  analyzedTickers: number;
};

type HourlyStore = {
  active: HourBucket;
  pending: HourBucket | null;
  lastSentHourKey: string;
  /** Running total of tickers analyzed today (Madrid). */
  analyzedToday: number;
  analyzedDateKey: string;
};

function madridDateKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MADRID_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

function madridHourKey(now = new Date()): { hourKey: string; hour: number; hourLabel: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: MADRID_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const pick = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const hh = Number(pick("hour"));
  const mm = pick("minute");
  return {
    hourKey: `${pick("year")}-${pick("month")}-${pick("day")}-${String(hh).padStart(2, "0")}`,
    hour: hh,
    hourLabel: `${String(hh).padStart(2, "0")}:${mm}`,
  };
}

/** Night silence 23:00–08:00 Madrid — only critical alerts. */
export function isNightSilenceMadrid(now = new Date()): boolean {
  const { hour } = madridHourKey(now);
  return hour >= 23 || hour < 8;
}

export function canSendTelegramAlert(kind: TelegramAlertKind): boolean {
  if (kind === "critical") return true;
  if (isNightSilenceMadrid()) return false;
  return true;
}

function emptyBucket(hourKey: string): HourBucket {
  return { hourKey, executions: [], closes: [], analyzedTickers: 0 };
}

function defaultStore(): HourlyStore {
  const { hourKey } = madridHourKey();
  const today = madridDateKey();
  return {
    active: emptyBucket(hourKey),
    pending: null,
    lastSentHourKey: "",
    analyzedToday: 0,
    analyzedDateKey: today,
  };
}

function readStore(): HourlyStore {
  try {
    if (!fs.existsSync(STORE_FILE)) return defaultStore();
    const parsed = JSON.parse(fs.readFileSync(STORE_FILE, "utf8")) as Partial<HourlyStore>;
    const active =
      parsed.active && typeof parsed.active.hourKey === "string"
        ? {
            hourKey: parsed.active.hourKey,
            executions: Array.isArray(parsed.active.executions) ? parsed.active.executions : [],
            closes: Array.isArray(parsed.active.closes) ? parsed.active.closes : [],
            analyzedTickers: Number(parsed.active.analyzedTickers ?? 0) || 0,
          }
        : emptyBucket(madridHourKey().hourKey);
    const pending =
      parsed.pending && typeof parsed.pending.hourKey === "string"
        ? {
            hourKey: parsed.pending.hourKey,
            executions: Array.isArray(parsed.pending.executions) ? parsed.pending.executions : [],
            closes: Array.isArray(parsed.pending.closes) ? parsed.pending.closes : [],
            analyzedTickers: Number(parsed.pending.analyzedTickers ?? 0) || 0,
          }
        : null;
    const today = madridDateKey();
    return {
      active,
      pending,
      lastSentHourKey: typeof parsed.lastSentHourKey === "string" ? parsed.lastSentHourKey : "",
      analyzedToday:
        parsed.analyzedDateKey === today ? Number(parsed.analyzedToday ?? 0) || 0 : 0,
      analyzedDateKey: today,
    };
  } catch {
    return defaultStore();
  }
}

function writeStore(store: HourlyStore): void {
  fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}

function hasActivity(b: HourBucket): boolean {
  return b.executions.length > 0 || b.closes.length > 0;
}

function rotateIfNeeded(store: HourlyStore): HourlyStore {
  const { hourKey } = madridHourKey();
  const today = madridDateKey();
  if (store.analyzedDateKey !== today) {
    store.analyzedToday = 0;
    store.analyzedDateKey = today;
  }
  if (store.active.hourKey === hourKey) return store;
  const next: HourlyStore = {
    active: emptyBucket(hourKey),
    pending: hasActivity(store.active) ? store.active : store.pending,
    lastSentHourKey: store.lastSentHourKey,
    analyzedToday: store.analyzedToday,
    analyzedDateKey: store.analyzedDateKey,
  };
  if (hasActivity(store.active) && store.pending && hasActivity(store.pending)) {
    next.pending = store.active;
  }
  return next;
}

export function recordHourlyExecution(params: {
  ticker: string;
  side: "BUY" | "SELL";
  shares: number;
  price: number;
}): void {
  let store = rotateIfNeeded(readStore());
  store.active.executions.push({
    ticker: params.ticker.toUpperCase(),
    side: params.side,
    shares: params.shares,
    price: params.price,
    at: new Date().toISOString(),
  });
  store.active.executions = store.active.executions.slice(-80);
  writeStore(store);
}

export function recordHourlyClose(params: {
  ticker: string;
  pnlUSD: number;
  pnlPct?: number;
  price?: number;
  kind: "TP" | "SL" | "MANUAL" | "PAPER";
}): void {
  let store = rotateIfNeeded(readStore());
  store.active.closes.push({
    ticker: params.ticker.toUpperCase(),
    pnlUSD: params.pnlUSD,
    pnlPct: params.pnlPct ?? 0,
    price: params.price ?? 0,
    kind: params.kind,
    at: new Date().toISOString(),
  });
  store.active.closes = store.active.closes.slice(-80);
  writeStore(store);
}

/** Accumulate tickers analyzed this cycle (for short hourly line). */
export function recordHourlyAnalyzed(count: number): void {
  if (!(count > 0)) return;
  let store = rotateIfNeeded(readStore());
  store.active.analyzedTickers += count;
  store.analyzedToday += count;
  writeStore(store);
}

function readCycleStatsToday(): number {
  try {
    if (!fs.existsSync(STATS_FILE)) return 0;
    const parsed = JSON.parse(fs.readFileSync(STATS_FILE, "utf8")) as {
      dateKey?: string;
      cyclesRun?: number;
    };
    return parsed.dateKey === madridDateKey() ? Number(parsed.cyclesRun ?? 0) || 0 : 0;
  } catch {
    return 0;
  }
}

async function fetchBrokerConnected(): Promise<boolean> {
  try {
    const status = await ibkrServiceFetch<{ connected?: boolean }>("/api/ibkr/status");
    return Boolean(status.connected);
  } catch {
    return false;
  }
}

function scannerOk(): boolean {
  const snap = readMultiScannerResults();
  if (!snap?.scannedAt) return false;
  const age = Date.now() - new Date(snap.scannedAt).getTime();
  return age < 6 * 60 * 60 * 1000;
}

async function buildOpenPositionLines(): Promise<PremiumOpenLine[]> {
  const rows = await ibkrServiceFetch<
    Array<{ symbol?: string; position?: number; avgCost?: number }>
  >("/api/ibkr/positions").catch(() => []);
  const state = loadTradingState().monitoredPositions;
  const sltp = new Map(state.map((p) => [p.ticker.toUpperCase(), p]));
  const open = (rows ?? []).filter((p) => Math.abs(Number(p.position ?? 0)) > 0);
  const lines: PremiumOpenLine[] = [];
  for (const row of open.slice(0, 8)) {
    const ticker = String(row.symbol ?? "").trim().toUpperCase();
    const shares = Math.abs(Number(row.position ?? 0));
    const avg = Number(row.avgCost ?? 0);
    if (!ticker || !(shares > 0)) continue;
    const mon = sltp.get(ticker);
    let price = avg;
    try {
      const q = await fetchTradingPrice(ticker);
      if (q.currentPrice > 0) price = q.currentPrice;
    } catch {
      /* use avgCost */
    }
    const pnlPct = avg > 0 ? ((price - avg) / avg) * 100 : 0;
    const sl = mon?.stopLoss ?? avg * 0.97;
    const tp = mon?.takeProfit ?? avg * 1.05;
    lines.push({ ticker, shares, price, pnlPct, sl, tp });
  }
  return lines;
}

async function sendBucketSummary(bucket: HourBucket, store: HourlyStore): Promise<void> {
  const active = hasActivity(bucket);
  const [acct, ibkrOk, openLines, macroQuotes] = await Promise.all([
    fetchTradingAccountSnapshot().catch(() => null),
    fetchBrokerConnected(),
    buildOpenPositionLines(),
    getBatchQuotes(["SPY", "QQQ", "^VIX"]).catch(() => new Map()),
  ]);

  const navUsd = acct?.combinedNav ?? acct?.navUSD ?? 0;
  const navEur = usdToEur(navUsd);
  const { hourLabel } = madridHourKey();

  if (!active) {
    const analyzed = Math.max(store.analyzedToday, bucket.analyzedTickers);
    const text = formatShortHourlySummary({ hourLabel, analyzed, navEur });
    await sendTelegramMessage(text, undefined, { plain: true });
    return;
  }

  const daily = getDailyPnlSummary();
  const todayTrades = listTrades(500).filter((t) => {
    const d = new Intl.DateTimeFormat("en-CA", {
      timeZone: MADRID_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(t.timestamp));
    return d === madridDateKey();
  });
  const winsToday = todayTrades.filter((t) => t.pnl > 0);
  const lossesToday = todayTrades.filter((t) => t.pnl < 0);
  const winPnls = winsToday.map((t) => t.pnl);
  const lossPnls = lossesToday.map((t) => t.pnl);

  const hourCloses = bucket.closes;
  const best = [...hourCloses].sort((a, b) => b.pnlUSD - a.pnlUSD).slice(0, 3);
  const worst = [...hourCloses].sort((a, b) => a.pnlUSD - b.pnlUSD).slice(0, 3);

  const positionValue = openLines.reduce((s, p) => s + p.price * p.shares, 0);
  const exposurePct = navUsd > 0 ? (positionValue / navUsd) * 100 : 0;

  const universe = getDailyMarketUniverse();
  const SECTOR_NAMES: Record<string, string> = {
    XLK: "Tech",
    XLF: "Financials",
    XLE: "Energy",
    XLV: "Healthcare",
    XLI: "Industrials",
    XLY: "Consumer",
  };
  const sectorLeader = universe?.sectorLeader
    ? `Sector líder: ${SECTOR_NAMES[universe.sectorLeader.etf] ?? universe.sectorLeader.etf} ${universe.sectorLeader.changePct >= 0 ? "+" : ""}${universe.sectorLeader.changePct.toFixed(1)}%`
    : "Sector líder: N/A";

  const spy = macroQuotes.get("SPY");
  const qqq = macroQuotes.get("QQQ");
  const vix = macroQuotes.get("^VIX") ?? macroQuotes.get("VIX");

  const accounts = (acct?.accounts ?? []).map((a) => ({
    accountId: a.accountId,
    cashEur: usdToEur(a.cash),
  }));

  const ctx: PremiumHourlyContext = {
    hourLabel,
    dailyPnlUsd: daily.totalPnl,
    dailyPnlPct: navUsd > 0 ? (daily.totalPnl / navUsd) * 100 : 0,
    ops: todayTrades.length,
    wins: winsToday.length,
    losses: lossesToday.length,
    winRate: todayTrades.length > 0 ? (winsToday.length / todayTrades.length) * 100 : 0,
    riskReward: computeRiskRewardLabel(winPnls, lossPnls),
    best,
    worst,
    open: openLines,
    accounts,
    navEur,
    exposurePct,
    spyChangePct: spy?.changePercentage ?? null,
    nasdaqChangePct: qqq?.changePercentage ?? null,
    vix: vix?.price ?? null,
    sectorLeader,
    ibkrOk,
    scannerOk: scannerOk(),
    cyclesToday: readCycleStatsToday(),
  };

  const text = formatPremiumHourlySummary(ctx);
  await sendTelegramMessage(text, undefined, { plain: true });
}

/**
 * Flush pending hourly summary if any. Call every cycle / monitor tick.
 */
export async function maybeSendHourlyTelegramSummary(): Promise<boolean> {
  let store = rotateIfNeeded(readStore());
  writeStore(store);

  if (!store.pending) return false;
  if (store.lastSentHourKey === store.pending.hourKey) {
    store.pending = null;
    writeStore(store);
    return false;
  }
  if (!canSendTelegramAlert("digest")) {
    console.log("[Telegram] resumen horario aplazado (noche 23:00-08:00)");
    return false;
  }

  const pending = store.pending;
  await sendBucketSummary(pending, store);
  store = readStore();
  store = rotateIfNeeded(store);
  store.lastSentHourKey = pending.hourKey;
  store.pending = null;
  writeStore(store);
  return true;
}

/** Cycle hook: rotate + try flush. No per-cycle spam. */
export async function onTradingCycleTelegramHook(): Promise<void> {
  await maybeSendHourlyTelegramSummary();
}

export async function sendImmediateTradeAlert(text: string): Promise<void> {
  if (!canSendTelegramAlert("trade")) {
    console.log("[Telegram] trade alert silenciada (noche 23:00-08:00)");
    return;
  }
  await sendTelegramMessage(text, undefined, { plain: true });
}

export async function sendCriticalTelegramAlert(text: string): Promise<void> {
  await sendTelegramMessage(text, undefined, { plain: true });
}
