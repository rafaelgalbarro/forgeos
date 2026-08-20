/**
 * Position monitor — SL/TP exits for AutoExecute + any open IBKR stock positions.
 * Runs every 60s. Syncs live IBKR positions so monitoring works even if state was empty.
 */

import "server-only";

import { publishInvestmentEvent } from "@/lib/notifications/investment-events";
import {
  notifyOrderExecuted,
  notifyPositionClosed,
  notifyStalePosition,
  sendTelegramMessage,
} from "@/lib/notifications/telegram-bot";
import { sendDailyClosePremiumReport } from "@/lib/notifications/cycle-premium-report";
import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { fetchTradingAccountSnapshot, fetchTradingPrice } from "@/lib/trading/ibkr-data";
import { getInvestmentRuntimeFlags } from "@/lib/investment/runtime-flags";
import { submitSupervisedLiveLimitOrder } from "@/lib/investment/ibkr-supervised-submit";
import { TRADING_CONFIG } from "./trading.config";
import { removeMonitoredPosition } from "./auto-approval";
import { loadTradingState, updateTradingState, type MonitoredPosition } from "./trading-state-store";
import { labelMlSignalOutcome } from "@/lib/ml/signal-trainer";
import { recordClosedTradeOutcome } from "./portfolio-optimizer";

const MONITOR_INTERVAL_MS = 60_000;
const STALE_HOURS = 24;
const TRAILING_STOP_PCT = TRADING_CONFIG.risk.trailingStopPct;
const DEFAULT_SL_PCT = 0.03; // -3%
const DEFAULT_TP_PCT = 0.05; // +5%
const HARD_STOP_LOSS_PCT = -5;
const PROFIT_APPROVAL_PCT = 8;
const MADRID_TZ = "Europe/Madrid";

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
};

const positionSLTP = new Map<string, PositionSLTP>();

let monitorTimer: ReturnType<typeof setInterval> | null = null;
let running = false;
let lastDailySummaryDate = "";

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
      return Boolean(String(p.symbol ?? "").trim());
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

/** Merge persisted + memory + live IBKR into the in-memory SL/TP map. */
function syncFromStateAndIbkr(ibkrRows: IbkrPosRow[]): string[] {
  const { monitoredPositions } = loadTradingState();
  for (const p of monitoredPositions) {
    const t = p.ticker.toUpperCase();
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
    if (!ticker) continue;
    const qty = Math.abs(Number(row.position ?? 0));
    const avgCost = Number(row.avgCost ?? 0);
    active.push(ticker);
    const existing = positionSLTP.get(ticker);
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
      // Persist so restarts keep defaults
      const mem = positionSLTP.get(ticker)!;
      updateTradingState((state) => ({
        ...state,
        monitoredPositions: [
          toMonitored(ticker, mem),
          ...state.monitoredPositions.filter((p) => p.ticker.toUpperCase() !== ticker),
        ].slice(0, 50),
      }));
    } else if (qty > 0) {
      existing.qty = Math.max(1, Math.floor(qty));
      if (avgCost > 0 && !(existing.entryPrice > 0)) existing.entryPrice = avgCost;
      if (row.account) existing.account = row.account;
      positionSLTP.set(ticker, existing);
    }
  }

  // Prefer live IBKR open set. Fall back to memory/state if IBKR empty (fill lag).
  if (active.length > 0) return [...new Set(active)];
  return [...positionSLTP.keys()];
}

async function closePosition(pos: MonitoredPosition, price: number, kind: "TP" | "SL"): Promise<void> {
  const pnlUSD = (price - pos.entryPrice) * pos.shares;
  const pnlPct = pos.entryPrice > 0 ? ((price - pos.entryPrice) / pos.entryPrice) * 100 : 0;

  console.log(
    `[PositionMonitor] ${pos.ticker} ${kind} tocado @$${price.toFixed(2)} → SELL` +
      ` P&L $${pnlUSD.toFixed(2)}`,
  );

  removeMonitoredPosition(pos.ticker);
  positionSLTP.delete(pos.ticker.toUpperCase());

  let nav = 0;
  try {
    nav = (await fetchTradingAccountSnapshot()).navUSD;
  } catch {
    /* ignore */
  }

  await notifyPositionClosed({ kind, ticker: pos.ticker, pnlUSD, pnlPct, navUSD: nav });
  publishInvestmentEvent({
    type: "position_closed",
    at: new Date().toISOString(),
    payload: { kind, ticker: pos.ticker, price, pnlUSD, pnlPct },
  });

  try {
    recordClosedTradeOutcome({
      ticker: pos.ticker,
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
      ticker: pos.ticker,
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
    console.log(`[PositionMonitor] 📄 PAPER CLOSE ${pos.ticker} ${pos.shares} @ $${price}`);
  }
}

async function closePositionLiveIfEnabled(
  pos: MonitoredPosition,
  price: number,
  rationale: string,
): Promise<string | null> {
  const flags = getInvestmentRuntimeFlags();
  if (!flags.liveTradingEnabled || flags.ibkrReadOnly) return null;
  try {
    const mem = positionSLTP.get(pos.ticker.toUpperCase());
    const res = await submitSupervisedLiveLimitOrder({
      symbol: pos.ticker,
      side: "SELL",
      quantity: Math.max(1, Math.floor(pos.shares)),
      limitPrice: price,
      rationale,
      outsideRth: true,
      account: mem?.account ?? (process.env.IBKR_ACCOUNT_ID?.trim() || undefined),
    });
    return res.ibkrOrderId;
  } catch (err) {
    console.warn(
      `[PositionMonitor] live close failed ${pos.ticker}:`,
      err instanceof Error ? err.message : err,
    );
    return null;
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
      const mem = positionSLTP.get(ticker);
      if (!mem || !(mem.entryPrice > 0) || !(mem.qty > 0)) continue;

      let pos = toMonitored(ticker, mem);
      try {
        const quote = await fetchTradingPrice(ticker);
        const price = quote.currentPrice;
        if (!Number.isFinite(price) || price <= 0) {
          console.warn(`[PositionMonitor] ${ticker}: sin precio — skip tick`);
          continue;
        }

        const beforeSl = pos.stopLoss
        const beforeHigh = pos.highestPrice
        pos = applyTrailingStop(pos, price)
        mem.sl = pos.stopLoss
        mem.tp = pos.takeProfit
        mem.highestPrice = pos.highestPrice
        positionSLTP.set(ticker, mem)

        if (pos.stopLoss !== beforeSl || pos.highestPrice !== beforeHigh) {
          updateTradingState((state) => ({
            ...state,
            monitoredPositions: state.monitoredPositions.map((p) =>
              p.ticker.toUpperCase() === ticker ? pos : p,
            ),
          }))
        }

        if (price >= pos.takeProfit) {
          console.log(`[PositionMonitor] ${ticker} TP tocado @$${price.toFixed(2)} → SELL`);
          const liveOrderId = await closePositionLiveIfEnabled(
            pos,
            price,
            `Auto take profit for ${ticker}`,
          );
          const pnlUSD = (price - pos.entryPrice) * pos.shares;
          const sign = pnlUSD >= 0 ? "+" : "";
          await sendTelegramMessage(
            `🎯 TAKE PROFIT AUTO: ${ticker} vendida @$${price.toFixed(2)} | P&L: ${sign}$${pnlUSD.toFixed(2)}${liveOrderId ? ` | IBKR #${liveOrderId}` : ""}`,
          );
          await closePosition(pos, price, "TP");
          continue;
        }

        if (price <= pos.stopLoss) {
          console.log(`[PositionMonitor] ${ticker} SL tocado @$${price.toFixed(2)} → SELL`);
          const liveOrderId = await closePositionLiveIfEnabled(
            pos,
            price,
            `Auto stop loss for ${ticker}`,
          );
          const pnlUSD = (price - pos.entryPrice) * pos.shares;
          const sign = pnlUSD >= 0 ? "+" : "";
          await sendTelegramMessage(
            `🛑 STOP LOSS AUTO: ${ticker} vendida @$${price.toFixed(2)} | P&L: ${sign}$${pnlUSD.toFixed(2)}${liveOrderId ? ` | IBKR #${liveOrderId}` : ""}`,
          );
          await closePosition(pos, price, "SL");
          continue;
        }

        const pnlPct = pos.entryPrice > 0 ? ((price - pos.entryPrice) / pos.entryPrice) * 100 : 0;
        if (pnlPct <= HARD_STOP_LOSS_PCT) {
          console.log(
            `[PositionMonitor] ${ticker} SL tocado @$${price.toFixed(2)} → SELL (hard ${HARD_STOP_LOSS_PCT}%)`,
          );
          const liveOrderId = await closePositionLiveIfEnabled(
            pos,
            price,
            `Auto hard stop ${HARD_STOP_LOSS_PCT}% for ${ticker}`,
          );
          const pnlUSD = (price - pos.entryPrice) * pos.shares;
          const sign = pnlUSD >= 0 ? "+" : "";
          await sendTelegramMessage(
            `🛑 STOP LOSS AUTO: ${ticker} vendida @$${price.toFixed(2)} | P&L: ${sign}$${pnlUSD.toFixed(2)}${liveOrderId ? ` | IBKR #${liveOrderId}` : ""}`,
          );
          await closePosition(pos, price, "SL");
          continue;
        }
        if (pnlPct >= PROFIT_APPROVAL_PCT) {
          const pnlUSD = (price - pos.entryPrice) * pos.shares;
          const sign = pnlUSD >= 0 ? "+" : "";
          await sendTelegramMessage(
            `🎯 TAKE PROFIT: ${ticker} +${pnlPct.toFixed(1)}% | P&L: ${sign}$${pnlUSD.toFixed(2)} — aprobar SELL sugerido`,
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
      await sendDailyClosePremiumReport();
    }
  } finally {
    running = false;
  }
}

/** Starts position monitor loop (60s). Idempotent. */
export function startPositionMonitor(): void {
  if (monitorTimer) return;
  console.log("[PositionMonitor] ▶ Monitor cada 60s (IBKR sync + SL/TP)");
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

  await notifyOrderExecuted({
    ticker,
    shares: mem.qty,
    price: entry,
    stopLoss: mem.sl,
    takeProfit: mem.tp,
  });
}
