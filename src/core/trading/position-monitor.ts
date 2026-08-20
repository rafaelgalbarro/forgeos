import "server-only";

import { publishInvestmentEvent } from "@/lib/notifications/investment-events";
import {
  notifyOrderExecuted,
  notifyPositionClosed,
  notifyStalePosition,
  sendTelegramMessage,
} from "@/lib/notifications/telegram-bot";
import { sendDailyClosePremiumReport } from "@/lib/notifications/cycle-premium-report";
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
const HARD_STOP_LOSS_PCT = -5;
const PROFIT_APPROVAL_PCT = 8;
const MADRID_TZ = "Europe/Madrid";

let monitorTimer: ReturnType<typeof setInterval> | null = null;
let running = false;
let lastDailySummaryDate = "";

function madridHourMinuteNow(): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return { hour: h, minute: m };
}

async function closePosition(pos: MonitoredPosition, price: number, kind: "TP" | "SL"): Promise<void> {
  const pnlUSD = (price - pos.entryPrice) * pos.shares;
  const pnlPct = pos.entryPrice > 0 ? ((price - pos.entryPrice) / pos.entryPrice) * 100 : 0;

  console.log(`[PositionMonitor] ${kind} ${pos.ticker} @ $${price.toFixed(2)} P&L $${pnlUSD.toFixed(2)}`);

  removeMonitoredPosition(pos.ticker);

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

  // Phase G — real closed outcome for Kelly (never invent)
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

  // Phase H — label ML signal outcome for trainer (ANALYSIS_ONLY; never places orders)
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

  // Paper close log — live close would call IBKR sell
  if (TRADING_CONFIG.ibkr.paperTrading) {
    console.log(`[PositionMonitor] 📄 PAPER CLOSE ${pos.ticker} ${pos.shares} @ $${price}`);
  }
}

async function closePositionLiveIfEnabled(pos: MonitoredPosition, price: number, rationale: string): Promise<string | null> {
  const flags = getInvestmentRuntimeFlags();
  if (!flags.liveTradingEnabled || flags.ibkrReadOnly) return null;
  try {
    const res = await submitSupervisedLiveLimitOrder({
      symbol: pos.ticker,
      side: "SELL",
      quantity: Math.max(1, Math.floor(pos.shares)),
      limitPrice: price,
      rationale,
      outsideRth: true,
      account: process.env.IBKR_ACCOUNT_ID?.trim() || undefined,
    });
    return res.ibkrOrderId;
  } catch (err) {
    console.warn(`[PositionMonitor] live close failed ${pos.ticker}:`, err instanceof Error ? err.message : err);
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
    const { monitoredPositions } = loadTradingState();
    if (monitoredPositions.length === 0) return;

    for (const raw of monitoredPositions) {
      let pos: MonitoredPosition = {
        ...raw,
        trailingStopPct: raw.trailingStopPct ?? TRAILING_STOP_PCT,
      };
      try {
        const quote = await fetchTradingPrice(pos.ticker);
        const price = quote.currentPrice;
        if (!Number.isFinite(price) || price <= 0) continue;
        // No overnight forced close — only SL/TP exits

        pos = applyTrailingStop(pos, price);
        if (pos.stopLoss !== raw.stopLoss || pos.highestPrice !== raw.highestPrice) {
          updateTradingState((state) => ({
            ...state,
            monitoredPositions: state.monitoredPositions.map((p) =>
              p.ticker === pos.ticker ? pos : p,
            ),
          }));
        }

        if (price >= pos.takeProfit) {
          const liveOrderId = await closePositionLiveIfEnabled(
            pos,
            price,
            `Auto take profit +8% for ${pos.ticker}`,
          );
          const pnlUSD = (price - pos.entryPrice) * pos.shares;
          const sign = pnlUSD >= 0 ? "+" : "";
          await sendTelegramMessage(
            `🎯 TAKE PROFIT AUTO: ${pos.ticker} vendida @$${price.toFixed(2)} | P&L: ${sign}$${pnlUSD.toFixed(2)}${liveOrderId ? ` | IBKR #${liveOrderId}` : ""}`,
          );
          await closePosition(pos, price, "TP");
          continue;
        }
        if (price <= pos.stopLoss) {
          const liveOrderId = await closePositionLiveIfEnabled(
            pos,
            price,
            `Auto stop loss -3% for ${pos.ticker}`,
          );
          const pnlUSD = (price - pos.entryPrice) * pos.shares;
          const sign = pnlUSD >= 0 ? "+" : "";
          await sendTelegramMessage(
            `🛑 STOP LOSS AUTO: ${pos.ticker} vendida @$${price.toFixed(2)} | P&L: ${sign}$${pnlUSD.toFixed(2)}${liveOrderId ? ` | IBKR #${liveOrderId}` : ""}`,
          );
          await closePosition(pos, price, "SL");
          continue;
        }

        const pnlPct = pos.entryPrice > 0 ? ((price - pos.entryPrice) / pos.entryPrice) * 100 : 0;
        if (pnlPct <= HARD_STOP_LOSS_PCT) {
          const liveOrderId = await closePositionLiveIfEnabled(
            pos,
            price,
            `Auto hard stop ${HARD_STOP_LOSS_PCT}% for ${pos.ticker}`,
          );
          const pnlUSD = (price - pos.entryPrice) * pos.shares;
          const sign = pnlUSD >= 0 ? "+" : "";
          await sendTelegramMessage(
            `🛑 STOP LOSS AUTO: ${pos.ticker} vendida @$${price.toFixed(2)} | P&L: ${sign}$${pnlUSD.toFixed(2)}${liveOrderId ? ` | IBKR #${liveOrderId}` : ""}`,
          );
          await closePosition(pos, price, "SL");
          continue;
        }
        if (pnlPct >= PROFIT_APPROVAL_PCT) {
          const pnlUSD = (price - pos.entryPrice) * pos.shares;
          const sign = pnlUSD >= 0 ? "+" : "";
          await sendTelegramMessage(
            `🎯 TAKE PROFIT: ${pos.ticker} +${pnlPct.toFixed(1)}% | P&L: ${sign}$${pnlUSD.toFixed(2)} — aprobar SELL sugerido`,
          );
        }

        const hoursOpen = (Date.now() - new Date(pos.openedAt).getTime()) / 3_600_000;
        if (hoursOpen >= STALE_HOURS && !pos.staleNotified) {
          await notifyStalePosition(pos.ticker, hoursOpen);
          updateTradingState((state) => ({
            ...state,
            monitoredPositions: state.monitoredPositions.map((p) =>
              p.ticker === pos.ticker ? { ...p, staleNotified: true } : p,
            ),
          }));
        }
      } catch (err) {
        console.warn(`[PositionMonitor] ${pos.ticker}:`, err instanceof Error ? err.message : err);
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
  console.log("[PositionMonitor] ▶ Monitor cada 60s");
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
  stopLoss: number;
  takeProfit: number;
  orderId?: string;
  /** Override default trailing % (e.g. ATR×2 / entry from smart-execution). */
  trailingStopPct?: number;
}): Promise<void> {
  const position: MonitoredPosition = {
    ticker: params.ticker,
    shares: params.shares,
    entryPrice: params.entryPrice,
    stopLoss: params.stopLoss,
    takeProfit: params.takeProfit,
    trailingStopPct:
      params.trailingStopPct != null && params.trailingStopPct > 0
        ? params.trailingStopPct
        : TRAILING_STOP_PCT,
    highestPrice: params.entryPrice,
    openedAt: new Date().toISOString(),
    orderId: params.orderId,
  };

  updateTradingState((state) => ({
    ...state,
    monitoredPositions: [
      position,
      ...state.monitoredPositions.filter((p) => p.ticker !== params.ticker),
    ].slice(0, 50),
  }));

  await notifyOrderExecuted({
    ticker: params.ticker,
    shares: params.shares,
    price: params.entryPrice,
    stopLoss: params.stopLoss,
    takeProfit: params.takeProfit,
  });
}
