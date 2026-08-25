/**
 * Position monitor — SL/TP exits for AutoExecute + any open IBKR stock positions.
 * Runs every 60s. Syncs live IBKR positions so monitoring works even if state was empty.
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";

import { publishInvestmentEvent } from "@/lib/notifications/investment-events";
import {
  notifyOrderExecuted,
  notifyPositionClosed,
  notifyStalePosition,
} from "@/lib/notifications/telegram-bot";
import { sendDailyClosePremiumReport } from "@/lib/notifications/cycle-premium-report";
import { maybeSendHourlyTelegramSummary } from "@/lib/notifications/telegram-policy";
import { recordNavSample } from "@/lib/notifications/daily-close-report";
import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { fetchTradingAccountSnapshot, fetchTradingPrice } from "@/lib/trading/ibkr-data";
import { getInvestmentRuntimeFlags } from "@/lib/investment/runtime-flags";
import { submitSupervisedLiveLimitOrder } from "@/lib/investment/ibkr-supervised-submit";
import { TRADING_CONFIG } from "./trading.config";
import { removeMonitoredPosition } from "./auto-approval";
import { loadTradingState, updateTradingState, type MonitoredPosition } from "./trading-state-store";
import { labelMlSignalOutcome } from "@/lib/ml/signal-trainer";
import { recordClosedTradeOutcome } from "./portfolio-optimizer";
import {
  listActiveSellBlacklist,
  listSoldSymbolsToday,
  purgeDuplicateTradesToday,
  purgeExpiredSellBlacklist,
  recordClosedTrade,
  removeSellBlacklistSymbol,
  seedPermanentSellBlacklist,
  upsertSellBlacklist,
} from "@/lib/db/database";
import {
  listPermanentSkipTickers,
  shouldSkipUntradeableTicker,
} from "./untradeable-tickers";

const MONITOR_INTERVAL_MS = 60_000;
const STALE_HOURS = 24;
const TRAILING_STOP_PCT = TRADING_CONFIG.risk.trailingStopPct;
const DEFAULT_SL_PCT = 0.03; // -3%
const DEFAULT_TP_PCT = 0.05; // +5%
const HARD_STOP_LOSS_PCT = -5;
const PROFIT_APPROVAL_PCT = 8;
const MADRID_TZ = "Europe/Madrid";
/** Short lock while a SELL is in flight (cross-process). */
const SELL_LOCK_TTL_MS = 15 * 60 * 1000;
const SELL_LOCK_FILE = path.resolve(process.cwd(), ".forgeos", "cache", "position-sell-locks.json");

/** True IBKR order id — never PAPER_ / empty / n/a. */
function isConfirmedIbkrOrderId(orderId: string | null | undefined): boolean {
  if (orderId == null) return false;
  const s = String(orderId).trim();
  if (!s || s.toLowerCase() === "n/a") return false;
  if (s.toUpperCase().startsWith("PAPER_")) return false;
  return true;
}

/** In-memory SL/TP registry (survives within the Node process). */
type PositionSLTP = {
  sl: number;
  tp: number;
  account?: string;
  qty: number;
  entryPrice: number;
  orderId?: string;
  openedAt: string;
  trailingStopPct?: number;
  highestPrice?: number;
  /** True while a SELL is in flight — skip ticker on later ticks. */
  selling?: boolean;
};

type SellLockFile = Record<string, number>;

const positionSLTP = new Map<string, PositionSLTP>();
/** Symbols blocked from re-SELL — loaded from SQLite on startup, mirrored in memory. */
const sellBlacklist = new Set<string>();

let monitorTimer: ReturnType<typeof setInterval> | null = null;
let running = false;
let lastDailySummaryDate = "";
let startupSynced = false;

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

function readSellLocks(): SellLockFile {
  try {
    if (!fs.existsSync(SELL_LOCK_FILE)) return {};
    const raw = JSON.parse(fs.readFileSync(SELL_LOCK_FILE, "utf8")) as Record<string, number>;
    const now = Date.now();
    const out: SellLockFile = {};
    for (const [k, at] of Object.entries(raw ?? {})) {
      if (typeof at === "number" && now - at < SELL_LOCK_TTL_MS) out[k.toUpperCase()] = at;
    }
    return out;
  } catch {
    return {};
  }
}

function writeSellLocks(locks: SellLockFile): void {
  fs.mkdirSync(path.dirname(SELL_LOCK_FILE), { recursive: true });
  fs.writeFileSync(SELL_LOCK_FILE, JSON.stringify(locks, null, 2), "utf8");
}

/** Load SQLite sell_blacklist (+ today's sells + permanent seeds) into memory. */
function loadSellBlacklistFromDisk(): void {
  sellBlacklist.clear();
  const today = madridDateKey();
  const account = process.env.IBKR_ACCOUNT_ID?.trim() || null;

  try {
    const seeded = seedPermanentSellBlacklist(listPermanentSkipTickers(), account);
    if (seeded > 0) {
      console.log(`[PositionMonitor] seed permanente sell_blacklist: +${seeded}`);
    }
    const purged = purgeExpiredSellBlacklist(today);
    if (purged > 0) {
      console.log(`[PositionMonitor] sell_blacklist expirados eliminados: ${purged}`);
    }
    for (const row of listActiveSellBlacklist(today)) {
      sellBlacklist.add(String(row.symbol).toUpperCase());
    }
  } catch (err) {
    console.warn(
      "[PositionMonitor] SQLite sell_blacklist load failed:",
      err instanceof Error ? err.message : err,
    );
  }

  try {
    for (const s of listSoldSymbolsToday(today)) sellBlacklist.add(s);
  } catch (err) {
    console.warn(
      "[PositionMonitor] listSoldSymbolsToday failed:",
      err instanceof Error ? err.message : err,
    );
  }

  // Also seed permanent skip tickers into memory even if SQLite failed
  for (const t of listPermanentSkipTickers()) sellBlacklist.add(t);

  console.log(
    `[PositionMonitor] sell_blacklist cargada (${sellBlacklist.size}): ${[...sellBlacklist].sort().join(",") || "(vacía)"}`,
  );
}

function addToSellBlacklist(ticker: string, opts?: { permanent?: boolean }): void {
  const key = ticker.trim().toUpperCase();
  if (!key) return;
  sellBlacklist.add(key);
  try {
    upsertSellBlacklist({
      symbol: key,
      account: process.env.IBKR_ACCOUNT_ID?.trim() || null,
      permanent: opts?.permanent === true,
    });
  } catch (err) {
    console.warn(
      "[PositionMonitor] upsertSellBlacklist failed:",
      err instanceof Error ? err.message : err,
    );
  }
  console.log(`[PositionMonitor] ${key} → sellBlacklist SQLite (no re-SELL)`);
}

function isSellBlacklisted(ticker: string): boolean {
  return sellBlacklist.has(ticker.trim().toUpperCase());
}

/** Cross-process lock: returns false if already locked (another SELL in progress / recent). */
function tryAcquireSellLock(ticker: string): boolean {
  const key = ticker.toUpperCase();
  if (isSellBlacklisted(key)) return false;
  const locks = readSellLocks();
  if (locks[key] != null && Date.now() - locks[key]! < SELL_LOCK_TTL_MS) {
    return false;
  }
  locks[key] = Date.now();
  writeSellLocks(locks);
  return true;
}

function isSellLocked(ticker: string): boolean {
  if (isSellBlacklisted(ticker)) return true;
  const at = readSellLocks()[ticker.toUpperCase()];
  return at != null && Date.now() - at < SELL_LOCK_TTL_MS;
}

function dropFromRegistry(ticker: string): void {
  const key = ticker.toUpperCase();
  positionSLTP.delete(key);
  removeMonitoredPosition(key);
}

function defaultSl(entry: number): number {
  return Number((entry * (1 - DEFAULT_SL_PCT)).toFixed(4));
}

function defaultTp(entry: number): number {
  return Number((entry * (1 + DEFAULT_TP_PCT)).toFixed(4));
}

function upsertMemory(params: {
  ticker: string;
  shares: number;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  orderId?: string;
  account?: string;
  trailingStopPct?: number;
}): PositionSLTP {
  const ticker = params.ticker.trim().toUpperCase();
  const entry = params.entryPrice > 0 ? params.entryPrice : 0;
  const prev = positionSLTP.get(ticker);
  const row: PositionSLTP = {
    sl: params.stopLoss && params.stopLoss > 0 ? params.stopLoss : defaultSl(entry),
    tp: params.takeProfit && params.takeProfit > 0 ? params.takeProfit : defaultTp(entry),
    account: params.account ?? (process.env.IBKR_ACCOUNT_ID?.trim() || undefined),
    qty: Math.max(1, Math.floor(params.shares)),
    entryPrice: entry,
    orderId: params.orderId ?? prev?.orderId,
    openedAt: prev?.openedAt ?? new Date().toISOString(),
    trailingStopPct: params.trailingStopPct ?? prev?.trailingStopPct ?? TRAILING_STOP_PCT,
    highestPrice: Math.max(prev?.highestPrice ?? entry, entry),
  };
  positionSLTP.set(ticker, row);
  return row;
}

type IbkrPosRow = {
  symbol?: string;
  position?: number;
  avgCost?: number;
  account?: string;
  secType?: string;
};

async function fetchOpenIbkrStockPositions(): Promise<IbkrPosRow[]> {
  try {
    const rows = await ibkrServiceFetch<IbkrPosRow[]>("/api/ibkr/positions");
    if (!Array.isArray(rows)) return [];
    const primary = process.env.IBKR_ACCOUNT_ID?.trim();
    return rows.filter((p) => {
      const qty = Number(p.position ?? 0);
      if (!Number.isFinite(qty) || Math.abs(qty) <= 0) return false;
      const sec = String(p.secType ?? "STK").toUpperCase();
      if (sec && sec !== "STK" && sec !== "STOCK") return false;
      if (primary && p.account && p.account !== primary) return false;
      const symbol = String(p.symbol ?? "").trim();
      if (!symbol || shouldSkipUntradeableTicker(symbol)) return false;
      return true;
    });
  } catch (err) {
    console.warn(
      "[PositionMonitor] IBKR positions fetch failed:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

function toMonitored(ticker: string, row: PositionSLTP): MonitoredPosition {
  return {
    ticker,
    shares: row.qty,
    entryPrice: row.entryPrice,
    stopLoss: row.sl,
    takeProfit: row.tp,
    trailingStopPct: row.trailingStopPct,
    highestPrice: row.highestPrice,
    openedAt: row.openedAt,
    orderId: row.orderId,
  };
}

/** Merge persisted + memory + live IBKR into the in-memory SL/TP map. Only IBKR-open tickers are monitored. */
function syncFromStateAndIbkr(ibkrRows: IbkrPosRow[]): string[] {
  const ibkrOpen = new Set<string>();
  for (const row of ibkrRows) {
    const ticker = String(row.symbol ?? "").trim().toUpperCase();
    if (!ticker || shouldSkipUntradeableTicker(ticker) || isSellBlacklisted(ticker)) continue;
    const qty = Math.abs(Number(row.position ?? 0));
    if (qty > 0) ibkrOpen.add(ticker);
  }

  // Drop registry entries that are no longer open in IBKR, or already sold today
  for (const t of [...positionSLTP.keys()]) {
    if (isSellBlacklisted(t)) {
      dropFromRegistry(t);
      console.log(`[PositionMonitor] ${t} en sellBlacklist — eliminada del registro`);
      continue;
    }
    if (ibkrOpen.has(t)) continue;
    if (positionSLTP.get(t)?.selling) continue;
    dropFromRegistry(t);
    console.log(`[PositionMonitor] ${t} qty=0 en IBKR — eliminada del registro`);
  }

  // Persist: only symbols that exist in IBKR with qty > 0 (never blacklist)
  updateTradingState((state) => ({
    ...state,
    monitoredPositions: state.monitoredPositions.filter((p) => {
      const t = p.ticker.toUpperCase();
      if (shouldSkipUntradeableTicker(t) || isSellBlacklisted(t)) return false;
      return ibkrOpen.has(t);
    }),
  }));

  const { monitoredPositions } = loadTradingState();
  for (const p of monitoredPositions) {
    const t = p.ticker.toUpperCase();
    if (shouldSkipUntradeableTicker(t) || isSellBlacklisted(t)) continue;
    if (!ibkrOpen.has(t)) continue;
    if (!positionSLTP.has(t)) {
      upsertMemory({
        ticker: t,
        shares: p.shares,
        entryPrice: p.entryPrice,
        stopLoss: p.stopLoss,
        takeProfit: p.takeProfit,
        orderId: p.orderId,
        trailingStopPct: p.trailingStopPct,
      });
    }
  }

  const active: string[] = [];
  for (const row of ibkrRows) {
    const ticker = String(row.symbol ?? "").trim().toUpperCase();
    if (!ticker || shouldSkipUntradeableTicker(ticker) || isSellBlacklisted(ticker)) {
      if (ticker && isSellBlacklisted(ticker)) {
        console.log(`[PositionMonitor] ${ticker} sellBlacklist — no re-registrar / no SELL`);
      }
      continue;
    }
    const qty = Math.abs(Number(row.position ?? 0));
    if (!(qty > 0)) continue;
    const avgCost = Number(row.avgCost ?? 0);
    active.push(ticker);
    const existing = positionSLTP.get(ticker);
    if (existing?.selling) {
      console.log(`[PositionMonitor] ${ticker} selling=true — skip sync update`);
      continue;
    }
    if (!existing) {
      const entry = avgCost > 0 ? avgCost : 0;
      if (!(entry > 0)) continue;
      upsertMemory({
        ticker,
        shares: qty,
        entryPrice: entry,
        stopLoss: defaultSl(entry),
        takeProfit: defaultTp(entry),
        account: row.account,
      });
      console.log(
        `[PositionMonitor] ${ticker} sin SL/TP guardado → defaults SL=$${defaultSl(entry).toFixed(2)} TP=$${defaultTp(entry).toFixed(2)} (avgCost)`,
      );
      const mem = positionSLTP.get(ticker)!;
      updateTradingState((state) => ({
        ...state,
        monitoredPositions: [
          toMonitored(ticker, mem),
          ...state.monitoredPositions.filter((p) => p.ticker.toUpperCase() !== ticker),
        ].slice(0, 50),
      }));
    } else {
      existing.qty = Math.max(1, Math.floor(qty));
      if (avgCost > 0 && !(existing.entryPrice > 0)) existing.entryPrice = avgCost;
      if (row.account) existing.account = row.account;
      positionSLTP.set(ticker, existing);
    }
  }

  // Never monitor blacklisted / closed names — IBKR qty>0 only
  return [...new Set(active)].filter(
    (t) => !isSellBlacklisted(t) && !positionSLTP.get(t)?.selling,
  );
}

async function closePosition(
  pos: MonitoredPosition,
  price: number,
  kind: "TP" | "SL",
  ibkrOrderId?: string | null,
): Promise<void> {
  const ticker = pos.ticker.toUpperCase();
  const pnlUSD = (price - pos.entryPrice) * pos.shares;
  const pnlPct = pos.entryPrice > 0 ? ((price - pos.entryPrice) / pos.entryPrice) * 100 : 0;

  console.log(
    `[PositionMonitor] ${ticker} ${kind} tocado @$${price.toFixed(2)} → SELL` +
      ` P&L $${pnlUSD.toFixed(2)}` +
      (isConfirmedIbkrOrderId(ibkrOrderId) ? ` ibkrId=${ibkrOrderId}` : " (sin ibkrId confirmado)"),
  );

  // Always drop + blacklist first so the next tick cannot re-SELL
  addToSellBlacklist(ticker);
  dropFromRegistry(ticker);

  try {
    recordClosedTrade({
      symbol: ticker,
      side: "SELL",
      qty: pos.shares,
      price,
      pnl: pnlUSD,
      account: process.env.IBKR_ACCOUNT_ID?.trim() || null,
      kind,
    });
    console.log(
      `[PositionMonitor] ${ticker} ${kind} tocado → guardar en DB: pnl=${pnlUSD >= 0 ? "+" : ""}$${pnlUSD.toFixed(2)}`,
    );
  } catch (err) {
    console.warn(
      "[PositionMonitor] SQLite recordClosedTrade failed:",
      err instanceof Error ? err.message : err,
    );
  }

  // Telegram solo si IBKR confirmó la orden (ibkrId real)
  if (isConfirmedIbkrOrderId(ibkrOrderId)) {
    let nav = 0;
    try {
      nav = (await fetchTradingAccountSnapshot()).navUSD;
    } catch {
      /* ignore */
    }

    await notifyPositionClosed({
      kind,
      ticker,
      pnlUSD,
      pnlPct,
      navUSD: nav,
      exitPrice: price,
      shares: pos.shares,
      inherited: !pos.orderId,
    });
  } else {
    console.log(
      `[Telegram] ${ticker} ${kind} omitido — sin ibkrId confirmado (no spam)`,
    );
  }

  publishInvestmentEvent({
    type: "position_closed",
    at: new Date().toISOString(),
    payload: { kind, ticker, price, pnlUSD, pnlPct, ibkrOrderId: ibkrOrderId ?? null },
  });

  try {
    recordClosedTradeOutcome({
      ticker,
      pnlUSD,
      pnlPct,
      kind,
      closedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn(
      "[PositionMonitor] recordClosedTradeOutcome failed:",
      err instanceof Error ? err.message : err,
    );
  }

  try {
    labelMlSignalOutcome({
      ticker,
      pnlUSD,
      pnlPct,
      kind,
      closedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn(
      "[PositionMonitor] labelMlSignalOutcome failed:",
      err instanceof Error ? err.message : err,
    );
  }

  if (TRADING_CONFIG.ibkr.paperTrading) {
    console.log(`[PositionMonitor] 📄 PAPER CLOSE ${ticker} ${pos.shares} @ $${price}`);
  }
}

function stillOpenInIbkr(rows: IbkrPosRow[], ticker: string): { open: boolean; qty: number } {
  const key = ticker.toUpperCase();
  let qty = 0;
  for (const r of rows) {
    if (String(r.symbol ?? "").trim().toUpperCase() !== key) continue;
    qty += Math.abs(Number(r.position ?? 0));
  }
  return { open: qty > 0, qty };
}

type ExitSellResult =
  | { status: "sold"; orderId: string | null }
  | { status: "skipped"; reason: string };

/**
 * Single-flight exit: lock → verify IBKR qty>0 → one SELL → drop registry.
 * Never re-SELL if already closed or sell already executed.
 */
async function beginExitSell(
  pos: MonitoredPosition,
  price: number,
  kind: "TP" | "SL",
  rationale: string,
): Promise<ExitSellResult> {
  const ticker = pos.ticker.toUpperCase();
  const mem = positionSLTP.get(ticker);

  if (isSellBlacklisted(ticker)) {
    dropFromRegistry(ticker);
    console.log(`[PositionMonitor] ${ticker} ya vendido hoy (blacklist) — skip SELL`);
    return { status: "skipped", reason: "blacklisted" };
  }

  if (mem?.selling || isSellLocked(ticker)) {
    console.log(`[PositionMonitor] ${ticker} ya en selling/lock — skip SELL duplicado`);
    return { status: "skipped", reason: "already-selling" };
  }

  // 1) Flag + cross-process lock BEFORE any await
  if (!tryAcquireSellLock(ticker)) {
    console.log(`[PositionMonitor] ${ticker} sell-lock ocupado — skip SELL duplicado`);
    return { status: "skipped", reason: "lock-held" };
  }
  if (mem) {
    mem.selling = true;
    positionSLTP.set(ticker, mem);
  }

  // 2) Re-check live IBKR — only SELL if still open with qty > 0
  const liveRows = await fetchOpenIbkrStockPositions();
  const { open, qty } = stillOpenInIbkr(liveRows, ticker);
  if (!open || !(qty > 0)) {
    addToSellBlacklist(ticker);
    dropFromRegistry(ticker);
    console.log(`[PositionMonitor] ${ticker} qty=0 en IBKR — blacklist + eliminada, skip SELL`);
    return { status: "skipped", reason: "already-closed" };
  }

  const sellQty = Math.max(1, Math.floor(qty));
  const flags = getInvestmentRuntimeFlags();
  if (!flags.liveTradingEnabled || flags.ibkrReadOnly) {
    addToSellBlacklist(ticker);
    dropFromRegistry(ticker);
    console.log(`[PositionMonitor] ${ticker} PAPER SELL qty=${sellQty} @$${price.toFixed(2)}`);
    return { status: "sold", orderId: null };
  }

  // 3) Final IBKR re-check immediately before submit
  const recheck = stillOpenInIbkr(await fetchOpenIbkrStockPositions(), ticker);
  if (!recheck.open || !(recheck.qty > 0)) {
    addToSellBlacklist(ticker);
    dropFromRegistry(ticker);
    console.log(`[PositionMonitor] ${ticker} cerrada antes de submit — blacklist, skip SELL`);
    return { status: "skipped", reason: "already-closed" };
  }

  try {
    const res = await submitSupervisedLiveLimitOrder({
      symbol: ticker,
      side: "SELL",
      quantity: Math.max(1, Math.floor(recheck.qty)),
      limitPrice: price,
      rationale,
      outsideRth: true,
      account: mem?.account ?? (process.env.IBKR_ACCOUNT_ID?.trim() || undefined),
    });
    // 4) After successful SELL → blacklist + drop registry (never re-try today)
    addToSellBlacklist(ticker);
    dropFromRegistry(ticker);
    console.log(`[PositionMonitor] ${ticker} SELL enviado ibkrId=${res.ibkrOrderId} (único)`);
    return { status: "sold", orderId: res.ibkrOrderId };
  } catch (err) {
    // Do not blacklist on transport failure — but drop registry so we only retry via IBKR qty>0
    dropFromRegistry(ticker);
    console.warn(
      `[PositionMonitor] live close failed ${ticker}:`,
      err instanceof Error ? err.message : err,
    );
    return { status: "skipped", reason: "submit-failed" };
  }
}

async function closeDayTradingPositions(): Promise<void> {
  const tickers = [...positionSLTP.keys()];
  if (tickers.length === 0) return;
  console.log(`[PositionMonitor] Cierre 22:00 — evaluando ${tickers.length} posiciones para cierre de day-trading`);
  for (const ticker of tickers) {
    const mem = positionSLTP.get(ticker);
    if (!mem || mem.selling) continue;
    try {
      const quote = await fetchTradingPrice(ticker);
      const px = quote.currentPrice;
      if (!(Number.isFinite(px) && px > 0)) continue;
      const pos = toMonitored(ticker, mem);
      const exit = await beginExitSell(pos, px, "TP", `Day-trading close 22:00 ${ticker}`);
      if (exit.status === "sold") {
        await closePosition(pos, px, "TP", exit.orderId);
      }
    } catch (err) {
      console.warn(`[PositionMonitor] closeDayTradingPositions ${ticker}:`, err instanceof Error ? err.message : err);
    }
  }
}

function applyTrailingStop(pos: MonitoredPosition, currentPrice: number): MonitoredPosition {
  if (pos.trailingStopPct == null) return pos;
  const highest = Math.max(pos.highestPrice ?? pos.entryPrice, currentPrice);
  const newSl = highest * (1 - (pos.trailingStopPct ?? TRAILING_STOP_PCT));
  if (newSl > pos.stopLoss) {
    return { ...pos, highestPrice: highest, stopLoss: newSl };
  }
  return { ...pos, highestPrice: highest };
}

async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const ibkrRows = await fetchOpenIbkrStockPositions();
    const tickers = syncFromStateAndIbkr(ibkrRows);

    if (tickers.length === 0) {
      console.log("[PositionMonitor] Monitoreando 0 posiciones");
      return;
    }

    const summary = tickers
      .map((t) => {
        const m = positionSLTP.get(t);
        if (!m) return `${t} SL=? TP=?`;
        return `${t} SL=$${m.sl.toFixed(2)} TP=$${m.tp.toFixed(2)}`;
      })
      .join(" | ");
    console.log(`[PositionMonitor] Monitoreando ${tickers.length} posiciones: ${summary}`);

    for (const ticker of tickers) {
      if (isSellBlacklisted(ticker) || isSellLocked(ticker) || shouldSkipUntradeableTicker(ticker)) {
        continue;
      }
      const mem = positionSLTP.get(ticker);
      if (!mem || mem.selling || !(mem.entryPrice > 0) || !(mem.qty > 0)) continue;

      let pos = toMonitored(ticker, mem);
      try {
        const quote = await fetchTradingPrice(ticker);
        const price = quote.currentPrice;
        if (!Number.isFinite(price) || price <= 0 || shouldSkipUntradeableTicker(ticker, price)) {
          console.warn(`[PositionMonitor] ${ticker}: sin precio — skip tick`);
          continue;
        }

        const beforeSl = pos.stopLoss;
        const beforeHigh = pos.highestPrice;
        pos = applyTrailingStop(pos, price);
        mem.sl = pos.stopLoss;
        mem.tp = pos.takeProfit;
        mem.highestPrice = pos.highestPrice;
        positionSLTP.set(ticker, mem);

        if (pos.stopLoss !== beforeSl || pos.highestPrice !== beforeHigh) {
          updateTradingState((state) => ({
            ...state,
            monitoredPositions: state.monitoredPositions.map((p) =>
              p.ticker.toUpperCase() === ticker ? pos : p,
            ),
          }));
        }

        if (price >= pos.takeProfit) {
          console.log(`[PositionMonitor] ${ticker} TP tocado @$${price.toFixed(2)} → SELL`);
          const exit = await beginExitSell(pos, price, "TP", `Auto take profit for ${ticker}`);
          if (exit.status === "skipped") continue;
          await closePosition(pos, price, "TP", exit.orderId);
          continue;
        }

        if (price <= pos.stopLoss) {
          console.log(`[PositionMonitor] ${ticker} SL tocado @$${price.toFixed(2)} → SELL`);
          const exit = await beginExitSell(pos, price, "SL", `Auto stop loss for ${ticker}`);
          if (exit.status === "skipped") continue;
          await closePosition(pos, price, "SL", exit.orderId);
          continue;
        }

        const pnlPct = pos.entryPrice > 0 ? ((price - pos.entryPrice) / pos.entryPrice) * 100 : 0;
        if (pnlPct <= HARD_STOP_LOSS_PCT) {
          console.log(
            `[PositionMonitor] ${ticker} SL tocado @$${price.toFixed(2)} → SELL (hard ${HARD_STOP_LOSS_PCT}%)`,
          );
          const exit = await beginExitSell(
            pos,
            price,
            "SL",
            `Auto hard stop ${HARD_STOP_LOSS_PCT}% for ${ticker}`,
          );
          if (exit.status === "skipped") continue;
          await closePosition(pos, price, "SL", exit.orderId);
          continue;
        }
        if (pnlPct >= PROFIT_APPROVAL_PCT) {
          // Suggestion only — no Telegram spam (hourly digest)
          console.log(
            `[PositionMonitor] ${ticker} cerca TP +${pnlPct.toFixed(1)}% — sin alert Telegram`,
          );
        }

        const hoursOpen = (Date.now() - new Date(pos.openedAt).getTime()) / 3_600_000;
        if (hoursOpen >= STALE_HOURS) {
          const statePos = loadTradingState().monitoredPositions.find(
            (p) => p.ticker.toUpperCase() === ticker,
          );
          if (statePos && !statePos.staleNotified) {
            await notifyStalePosition(ticker, hoursOpen);
            updateTradingState((state) => ({
              ...state,
              monitoredPositions: state.monitoredPositions.map((p) =>
                p.ticker.toUpperCase() === ticker ? { ...p, staleNotified: true } : p,
              ),
            }));
          }
        }
      } catch (err) {
        console.warn(`[PositionMonitor] ${ticker}:`, err instanceof Error ? err.message : err);
      }
    }

    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: MADRID_TZ,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(now);
    const hh = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    const mm = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    const dateKey = `${parts.find((p) => p.type === "year")?.value}-${parts.find((p) => p.type === "month")?.value}-${parts.find((p) => p.type === "day")?.value}`;
    if (hh === 22 && mm === 0 && lastDailySummaryDate !== dateKey) {
      lastDailySummaryDate = dateKey;
      await closeDayTradingPositions();
      await sendDailyClosePremiumReport();
    }
    await maybeSendHourlyTelegramSummary();
    try {
      const snap = await fetchTradingAccountSnapshot();
      recordNavSample(snap.combinedNav ?? snap.navUSD ?? 0);
    } catch {
      /* ignore NAV sample */
    }
  } finally {
    running = false;
  }
}

/** Starts position monitor loop (60s). Idempotent. Syncs IBKR + purges fake duplicate sells. */
export function startPositionMonitor(): void {
  if (monitorTimer) return;
  console.log("[PositionMonitor] ▶ Monitor cada 60s (IBKR sync + SL/TP + sellBlacklist)");
  if (!startupSynced) {
    startupSynced = true;
    loadSellBlacklistFromDisk();
    try {
      const purged = purgeDuplicateTradesToday();
      if (purged.deleted > 0) {
        console.log(
          `[PositionMonitor] SQLite purge duplicados: deleted=${purged.deleted} date=${purged.date}`,
        );
      }
    } catch (err) {
      console.warn(
        "[PositionMonitor] purgeDuplicateTradesToday failed:",
        err instanceof Error ? err.message : err,
      );
    }
    // Clear persisted monitors that are not live IBKR (or blacklisted)
    updateTradingState((state) => ({
      ...state,
      monitoredPositions: state.monitoredPositions.filter(
        (p) => !isSellBlacklisted(p.ticker) && !shouldSkipUntradeableTicker(p.ticker),
      ),
    }));
    for (const t of [...positionSLTP.keys()]) {
      if (isSellBlacklisted(t)) dropFromRegistry(t);
    }
    console.log(
      `[PositionMonitor] startup blacklist=${[...sellBlacklist].join(",") || "(vacía)"}`,
    );
  }
  void tick();
  monitorTimer = setInterval(() => void tick(), MONITOR_INTERVAL_MS);
}

export function stopPositionMonitor(): void {
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
}

export async function registerExecutedPosition(params: {
  ticker: string;
  shares: number;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  orderId?: string;
  trailingStopPct?: number;
  account?: string;
}): Promise<void> {
  const ticker = params.ticker.trim().toUpperCase();
  const entry = params.entryPrice > 0 ? params.entryPrice : 0;
  const sl =
    params.stopLoss && params.stopLoss > 0
      ? params.stopLoss
      : entry > 0
        ? defaultSl(entry)
        : 0;
  const tp =
    params.takeProfit && params.takeProfit > 0
      ? params.takeProfit
      : entry > 0
        ? defaultTp(entry)
        : 0;

  const mem = upsertMemory({
    ticker,
    shares: params.shares,
    entryPrice: entry,
    stopLoss: sl,
    takeProfit: tp,
    orderId: params.orderId,
    account: params.account,
    trailingStopPct: params.trailingStopPct,
  });

  // New BUY clears prior sell-lock + same-day blacklist for this ticker (not permanent seeds)
  const locks = readSellLocks();
  if (locks[ticker] != null) {
    delete locks[ticker];
    writeSellLocks(locks);
  }
  if (sellBlacklist.has(ticker)) {
    try {
      if (removeSellBlacklistSymbol(ticker)) {
        sellBlacklist.delete(ticker);
        console.log(`[PositionMonitor] ${ticker} BUY — quitado de sellBlacklist SQLite`);
      } else {
        console.log(`[PositionMonitor] ${ticker} BUY — permanece en blacklist permanente`);
      }
    } catch (err) {
      console.warn(
        "[PositionMonitor] removeSellBlacklistSymbol failed:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  const position = toMonitored(ticker, mem);

  updateTradingState((state) => ({
    ...state,
    monitoredPositions: [
      position,
      ...state.monitoredPositions.filter((p) => p.ticker.toUpperCase() !== ticker),
    ].slice(0, 50),
  }));

  console.log(
    `[PositionMonitor] Registrada ${ticker} qty=${mem.qty} entry=$${entry.toFixed(2)} ` +
      `SL=$${mem.sl.toFixed(2)} TP=$${mem.tp.toFixed(2)}`,
  );

  // Ensure monitor loop is running after AutoExecute
  startPositionMonitor();

  // Telegram solo con ibkrId real confirmado (nunca PAPER_ / vacío)
  if (isConfirmedIbkrOrderId(params.orderId)) {
    await notifyOrderExecuted({
      ticker,
      shares: mem.qty,
      price: entry,
      stopLoss: mem.sl,
      takeProfit: mem.tp,
      ibkrOrderId: String(params.orderId),
    });
  } else {
    console.log(
      `[Telegram] ${ticker} BUY omitido — sin ibkrId confirmado (orderId=${params.orderId ?? "n/a"})`,
    );
  }
}
