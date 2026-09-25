/**
 * Automatic exit manager — stop loss / take profit / max hold days.
 * Complements position-monitor with cycle-triggered checks + Telegram.
 */

import "server-only";

import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { fetchTradingPrice } from "@/lib/trading/ibkr-data";
import { getCurrentTradingPhase, type ForgeTradingPhase } from "@/lib/trading/cycle-schedule";
import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";
import { phaseLabelForTelegram } from "@/lib/trading/agents";

export const DEFAULT_EXIT_STOP_LOSS_PCT = 0.03;
export const DEFAULT_EXIT_TAKE_PROFIT_PCT = 0.08;
export const MAX_HOLD_DAYS = 5;

export type OpenPositionRow = {
  symbol: string;
  qty: number;
  avgCost: number;
  account?: string;
  stopLossPct?: number;
  takeProfitPct?: number;
  openedAt?: string;
};

export type ExitAction = {
  symbol: string;
  side: "SELL";
  qty: number;
  price: number;
  entry: number;
  pnlPct: number;
  pnlUSD: number;
  reason: "STOP_LOSS" | "TAKE_PROFIT" | "MAX_HOLD";
};

type IbkrPos = {
  symbol?: string;
  position?: number;
  avgCost?: number;
  account?: string;
  secType?: string;
};

async function loadOpenStocks(): Promise<OpenPositionRow[]> {
  const rows = await ibkrServiceFetch<IbkrPos[]>("/api/ibkr/positions").catch(() => []);
  const primary = (process.env.IBKR_ACCOUNT_ID ?? "").trim();
  const out: OpenPositionRow[] = [];
  for (const p of Array.isArray(rows) ? rows : []) {
    if (primary && p.account && p.account !== primary) continue;
    const sec = String(p.secType ?? "STK").toUpperCase();
    if (sec && sec !== "STK" && sec !== "STOCK") continue;
    const qty = Math.abs(Number(p.position ?? 0));
    if (!(qty > 0)) continue;
    const symbol = String(p.symbol ?? "").trim().toUpperCase();
    if (!symbol) continue;
    out.push({
      symbol,
      qty: Math.floor(qty),
      avgCost: Number(p.avgCost ?? 0),
      account: p.account,
    });
  }
  return out;
}

export class ExitManager {
  stopLossPct: number;
  takeProfitPct: number;
  maxHoldDays: number;

  constructor(opts?: {
    stopLossPct?: number;
    takeProfitPct?: number;
    maxHoldDays?: number;
  }) {
    this.stopLossPct = opts?.stopLossPct ?? DEFAULT_EXIT_STOP_LOSS_PCT;
    this.takeProfitPct = opts?.takeProfitPct ?? DEFAULT_EXIT_TAKE_PROFIT_PCT;
    this.maxHoldDays = opts?.maxHoldDays ?? MAX_HOLD_DAYS;
  }

  /** Evaluate all open positions — returns SELL actions (does not place orders). */
  async checkPositions(
    registry?: Map<
      string,
      { entryPrice: number; sl: number; tp: number; qty: number; openedAt?: string }
    >,
  ): Promise<ExitAction[]> {
    const positions = await loadOpenStocks();
    const actions: ExitAction[] = [];

    for (const pos of positions) {
      const reg = registry?.get(pos.symbol);
      const entry = reg?.entryPrice && reg.entryPrice > 0 ? reg.entryPrice : pos.avgCost;
      const qty = reg?.qty && reg.qty > 0 ? reg.qty : pos.qty;
      if (!(entry > 0) || !(qty > 0)) continue;

      let price = 0;
      try {
        price = (await fetchTradingPrice(pos.symbol)).currentPrice;
      } catch {
        continue;
      }
      if (!(price > 0)) continue;

      const pnlPct = (price - entry) / entry;
      const pnlUSD = (price - entry) * qty;

      const slPct =
        reg?.sl && reg.sl > 0 && entry > 0
          ? Math.max(this.stopLossPct, (entry - reg.sl) / entry)
          : this.stopLossPct;
      const tpPct =
        reg?.tp && reg.tp > entry
          ? Math.max(this.takeProfitPct, (reg.tp - entry) / entry)
          : this.takeProfitPct;

      if (pnlPct <= -slPct) {
        actions.push({
          symbol: pos.symbol,
          side: "SELL",
          qty,
          price,
          entry,
          pnlPct,
          pnlUSD,
          reason: "STOP_LOSS",
        });
        continue;
      }
      if (pnlPct >= tpPct) {
        actions.push({
          symbol: pos.symbol,
          side: "SELL",
          qty,
          price,
          entry,
          pnlPct,
          pnlUSD,
          reason: "TAKE_PROFIT",
        });
        continue;
      }

      const openedAt = reg?.openedAt ? Date.parse(reg.openedAt) : NaN;
      if (Number.isFinite(openedAt)) {
        const days = (Date.now() - openedAt) / (24 * 60 * 60 * 1000);
        if (days >= this.maxHoldDays && pnlPct < 0.01) {
          actions.push({
            symbol: pos.symbol,
            side: "SELL",
            qty,
            price,
            entry,
            pnlPct,
            pnlUSD,
            reason: "MAX_HOLD",
          });
        }
      }
    }

    return actions;
  }

  async notifyExit(action: ExitAction, phase?: ForgeTradingPhase): Promise<void> {
    const label = phaseLabelForTelegram(phase ?? getCurrentTradingPhase());
    const isSl = action.reason === "STOP_LOSS";
    const isTp = action.reason === "TAKE_PROFIT";
    const emoji = isSl ? "🔴" : isTp ? "🟢" : "⏳";
    const title = isSl ? "STOP LOSS" : isTp ? "TAKE PROFIT" : "MAX HOLD";
    const pnlSign = action.pnlUSD >= 0 ? "+" : "";
    const lines = [
      `${emoji} <b>${title}</b> [${label.replace(/^[^\s]+\s/, "")}]`,
      `SELL ${action.symbol} × ${action.qty} @ $${action.price.toFixed(2)}`,
      `P&L: ${(action.pnlPct * 100).toFixed(1)}% (${pnlSign}$${action.pnlUSD.toFixed(2)})`,
    ];
    await sendTelegramMessage(lines.join("\n"));
  }
}

let singleton: ExitManager | null = null;

export function getExitManager(): ExitManager {
  if (!singleton) singleton = new ExitManager();
  return singleton;
}
