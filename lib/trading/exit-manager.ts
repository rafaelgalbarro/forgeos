/**
 * ExitManager — stop loss / trailing take-profit for crypto (Alpaca) + stocks (IBKR).
 * Shared peak registry: .forgeos/cache/crypto-trailing.json
 */

import "server-only";

import {
  getPositions as getAlpacaPositions,
  placeOrder as placeAlpacaOrder,
  isAlpacaConfigured,
  type AlpacaPosition,
} from "@/lib/brokers/alpaca-client";
import { isAlpacaCryptoTicker, normalizeAlpacaTicker } from "@/lib/brokers/alpaca-pairs";
import {
  getKrakenAdapter,
  isKrakenConfigured,
  type KrakenPosition,
} from "@/lib/brokers/kraken";
import {
  fetchCachedIbkrPositions,
  type IbkrPositionRow,
} from "@/lib/trading/ibkr-data";
import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";
import { getInvestmentRuntimeFlags } from "@/lib/investment/runtime-flags";
import { submitSupervisedLiveLimitOrder } from "@/lib/investment/ibkr-supervised-submit";
import { cancelOpenIbkrSellsForSymbol } from "@/lib/investment/ibkr-cancel-open-sells";
import {
  EXIT_PARTIAL_PCT,
  EXIT_STOP_LOSS_PCT,
  EXIT_TRAIL_ACTIVATE_PCT,
  EXIT_TRAIL_DROP_PCT,
  clearTrailingForOpen,
  getTrailingState,
  recordFullClose,
  upsertTrailingState,
} from "@/lib/trading/trailing-registry";
import {
  filterForgeOsManagedSymbols,
  filterJournalOpenCryptoSymbols,
  isLegacyOrphanTicker,
} from "@/lib/trading/forgeos-owned";
import { appendJournalTrade, readJournalTrades } from "@/lib/trading/journal/trades";
import {
  CRYPTO_MAX_HOLD_MS,
} from "@/lib/trading/crypto/intraday-strategies";
import {
  cryptoIbkrAccountId,
  cryptoSellAggressiveDiscountPct,
  isIbkrCryptoBroker,
  isKrakenCryptoBroker,
} from "@/lib/trading/crypto/config";
import { isIbkrCryptoTicker } from "@/src/core/trading/crypto-ibkr";
import { loadTradingState } from "@/src/core/trading/trading-state-store";

export const DEFAULT_EXIT_STOP_LOSS_PCT = EXIT_STOP_LOSS_PCT;
export const DEFAULT_EXIT_TAKE_PROFIT_PCT = EXIT_TRAIL_ACTIVATE_PCT;
export const MAX_HOLD_DAYS = 5;

export type ExitChannel = "crypto" | "stocks";

export type OpenPositionRow = {
  symbol: string;
  qty: number;
  avgCost: number;
  currentPrice: number;
  unrealizedPlpc?: number;
  account?: string;
  /** ISO open time — crypto force-close at 24h. */
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
  reason: "STOP_LOSS" | "TAKE_PROFIT" | "TRAILING_STOP" | "PARTIAL_TP" | "MAX_HOLD";
  peak?: number;
  partial?: boolean;
  orderId?: string;
  executed?: boolean;
};

export type ExitCheckSummary = {
  channel: ExitChannel;
  reviewed: number;
  closed: number;
  partials: number;
  trailingActive: number;
  actions: ExitAction[];
};

type LegacyRegistry = Map<
  string,
  { entryPrice: number; sl: number; tp: number; qty: number; openedAt?: string }
>;

function fmtPrice(price: number): string {
  if (!(price > 0)) return "0";
  if (price >= 100) return price.toFixed(2);
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  return price.toFixed(6);
}

function fmtQty(qty: number): string {
  if (!(qty > 0)) return "0";
  if (Number.isInteger(qty) || Math.abs(qty - Math.round(qty)) < 1e-9) {
    return String(Math.round(qty));
  }
  if (qty >= 100) return qty.toFixed(1);
  if (qty >= 1) return qty.toFixed(2);
  return qty.toFixed(4).replace(/\.?0+$/, "");
}

function cryptoPositions(rows: AlpacaPosition[]): OpenPositionRow[] {
  const out: OpenPositionRow[] = [];
  for (const p of rows) {
    const symbol = normalizeAlpacaTicker(p.symbol);
    if (!isAlpacaCryptoTicker(symbol)) continue;
    const qty = Math.abs(Number(p.qty ?? 0));
    if (!(qty > 0)) continue;
    const avgCost = Number(p.avgEntryPrice ?? 0);
    const currentPrice = Number(p.currentPrice ?? 0);
    if (!(avgCost > 0) || !(currentPrice > 0)) continue;
    out.push({
      symbol,
      qty,
      avgCost,
      currentPrice,
      unrealizedPlpc: Number(p.unrealizedPlpc ?? NaN),
    });
  }
  return out;
}

function stockPositions(rows: IbkrPositionRow[]): OpenPositionRow[] {
  const out: OpenPositionRow[] = [];
  for (const p of rows) {
    const sec = String(p.secType ?? "STK").toUpperCase();
    if (sec && sec !== "STK" && sec !== "STOCK") continue;
    const qty = Math.floor(Math.abs(p.qty));
    if (!(qty > 0)) continue;
    if (!(p.avgCost > 0) || !(p.currentPrice > 0)) continue;
    out.push({
      symbol: p.symbol,
      qty,
      avgCost: p.avgCost,
      currentPrice: p.currentPrice,
      account: p.account,
    });
  }
  return out;
}

function decideExit(pos: OpenPositionRow): ExitAction | null {
  const entry = pos.avgCost;
  const price = pos.currentPrice;
  const qty = pos.qty;
  if (!(entry > 0) || !(price > 0) || !(qty > 0)) return null;

  const pnlPct =
    Number.isFinite(pos.unrealizedPlpc) && pos.unrealizedPlpc != null
      ? pos.unrealizedPlpc
      : (price - entry) / entry;
  const pnlUSD = (price - entry) * qty;

  // Crypto: force close after 24h
  if (pos.openedAt) {
    const openedMs = Date.parse(pos.openedAt);
    if (Number.isFinite(openedMs) && Date.now() - openedMs >= CRYPTO_MAX_HOLD_MS) {
      return {
        symbol: pos.symbol,
        side: "SELL",
        qty,
        price,
        entry,
        pnlPct,
        pnlUSD,
        reason: "MAX_HOLD",
      };
    }
  }

  // Hard stop −3%
  if (pnlPct <= -EXIT_STOP_LOSS_PCT) {
    return {
      symbol: pos.symbol,
      side: "SELL",
      qty,
      price,
      entry,
      pnlPct,
      pnlUSD,
      reason: "STOP_LOSS",
    };
  }

  let state = getTrailingState(pos.symbol);
  if (!state || !(state.peak > 0)) {
    state = clearTrailingForOpen(pos.symbol, Math.max(entry, price));
  }

  // Activate trailing at +8%
  let peak = Math.max(state.peak, price, entry);
  let trailingActive = state.trailingActive || pnlPct >= EXIT_TRAIL_ACTIVATE_PCT;
  if (trailingActive && peak < price) peak = price;

  if (trailingActive !== state.trailingActive || peak !== state.peak) {
    upsertTrailingState(pos.symbol, {
      peak,
      trailingActive,
      partialSold: state.partialSold,
    });
  }

  // Trailing: sell all if price drops 4% from peak (before partial so winners lock in)
  if (trailingActive && peak > 0 && price <= peak * (1 - EXIT_TRAIL_DROP_PCT)) {
    return {
      symbol: pos.symbol,
      side: "SELL",
      qty,
      price,
      entry,
      pnlPct,
      pnlUSD,
      reason: "TRAILING_STOP",
      peak,
    };
  }

  // One-time 50% at ≥ +25%
  if (pnlPct >= EXIT_PARTIAL_PCT && !state.partialSold && qty > 0) {
    const rawHalf = qty / 2;
    // Stocks: whole shares only; crypto: fractional OK
    const sellQty = Number.isInteger(qty) || qty >= 1
      ? Math.floor(rawHalf) > 0
        ? Math.floor(rawHalf)
        : rawHalf >= 0.0001
          ? rawHalf
          : 0
      : rawHalf;
    if (sellQty > 0 && sellQty < qty) {
      return {
        symbol: pos.symbol,
        side: "SELL",
        qty: sellQty,
        price,
        entry,
        pnlPct,
        pnlUSD: (price - entry) * sellQty,
        reason: "PARTIAL_TP",
        peak,
        partial: true,
      };
    }
  }

  return null;
}

function ibkrCryptoPositions(rows: IbkrPositionRow[]): OpenPositionRow[] {
  const out: OpenPositionRow[] = [];
  for (const p of rows) {
    const sec = String(p.secType ?? "").toUpperCase();
    const sym = String(p.symbol ?? "").trim().toUpperCase();
    if (sec !== "CRYPTO" && !isIbkrCryptoTicker(sym)) continue;
    const qty = Math.abs(Number(p.qty ?? 0));
    if (!(qty > 0)) continue;
    if (!(p.avgCost > 0) || !(p.currentPrice > 0)) continue;
    out.push({
      symbol: sym,
      qty,
      avgCost: p.avgCost,
      currentPrice: p.currentPrice,
      account: p.account ?? cryptoIbkrAccountId(),
    });
  }
  return out;
}

async function executeCryptoSell(action: ExitAction): Promise<ExitAction> {
  if (isKrakenCryptoBroker()) {
    if (!isKrakenConfigured()) {
      console.log(
        `[Exit/crypto] KRAKEN not configured — skip SELL ${action.symbol}`,
      );
      return { ...action, executed: false };
    }
    const qty = action.qty;
    if (!(qty > 0)) throw new Error(`crypto sell qty inválida: ${qty}`);
    const discount = cryptoSellAggressiveDiscountPct();
    const adapter = getKrakenAdapter();
    const quote = await adapter.getQuote(action.symbol);
    const limitPrice = Number((quote.mid * (1 - discount)).toFixed(8));
    const res = await adapter.placeOrder({
      symbol: action.symbol,
      side: "sell",
      volume: qty,
      price: limitPrice,
    });
    return {
      ...action,
      qty: res.volume,
      price: res.price,
      orderId: res.orderId,
      executed: true,
    };
  }

  if (isIbkrCryptoBroker()) {
    const flags = getInvestmentRuntimeFlags();
    if (!flags.liveTradingEnabled || flags.ibkrReadOnly) {
      console.log(
        `[Exit/crypto] PAPER IBKR SELL ${action.symbol} qty=${action.qty} @$${fmtPrice(action.price)} (${action.reason})`,
      );
      return { ...action, executed: false };
    }
    // Exact position qty + aggressive limit (price − 0.5%)
    const qty = action.qty;
    if (!(qty > 0)) throw new Error(`crypto sell qty inválida: ${qty}`);
    const discount = cryptoSellAggressiveDiscountPct();
    const limitPrice = Number((action.price * (1 - discount)).toFixed(8));
    const res = await submitSupervisedLiveLimitOrder({
      symbol: action.symbol,
      side: "SELL",
      quantity: qty,
      limitPrice,
      rationale: `ExitManager crypto ${action.reason} aggressive LMT -${(discount * 100).toFixed(1)}%`,
      outsideRth: true,
      account: cryptoIbkrAccountId(),
      tif: "DAY",
    });
    return { ...action, qty, price: limitPrice, orderId: res.ibkrOrderId, executed: true };
  }

  const order = await placeAlpacaOrder({
    symbol: action.symbol,
    side: "sell",
    type: "market",
    qty: action.qty,
  });
  return { ...action, orderId: order.id, executed: true };
}

async function executeStockSell(action: ExitAction, account?: string): Promise<ExitAction> {
  const flags = getInvestmentRuntimeFlags();
  if (!flags.liveTradingEnabled || flags.ibkrReadOnly) {
    console.log(
      `[Exit/stocks] PAPER SELL ${action.symbol} qty=${action.qty} @$${fmtPrice(action.price)} (${action.reason})`,
    );
    return { ...action, executed: false };
  }
  const qty = Math.max(1, Math.floor(action.qty));
  await cancelOpenIbkrSellsForSymbol(action.symbol).catch(() => undefined);
  const res = await submitSupervisedLiveLimitOrder({
    symbol: action.symbol,
    side: "SELL",
    quantity: qty,
    limitPrice: action.price,
    rationale: `ExitManager ${action.reason}`,
    outsideRth: true,
    account: account || process.env.IBKR_ACCOUNT_ID?.trim() || undefined,
  });
  return { ...action, qty, orderId: res.ibkrOrderId, executed: true };
}

function telegramLine(channel: ExitChannel, action: ExitAction): string {
  const isSl = action.reason === "STOP_LOSS";
  const isMax = action.reason === "MAX_HOLD";
  const emoji = isSl ? "🔴" : isMax ? "⏰" : "🟢";
  const title = isSl
    ? "STOP LOSS"
    : isMax
      ? "MAX HOLD 24h"
      : action.reason === "TRAILING_STOP"
        ? "TRAILING STOP"
        : action.reason === "PARTIAL_TP"
          ? "PARTIAL TP"
          : "TAKE PROFIT";
  const kraken = channel === "crypto" && isKrakenCryptoBroker();
  const asset = channel === "crypto" ? (kraken ? "₿ KRAKEN" : "₿") : "🇺🇸";
  const ccy = kraken ? "€" : "$";
  const pnlSign = action.pnlUSD >= 0 ? "+" : "";
  const pct = `${pnlSign}${(action.pnlPct * 100).toFixed(1)}%`;
  const usd = `${pnlSign}${ccy}${Math.abs(action.pnlUSD).toFixed(2)}`;
  let line =
    `${emoji} ${title} ${asset} SELL ${action.symbol} ${fmtQty(action.qty)} ` +
    `@ ${ccy}${fmtPrice(action.price)} | ${pct} (${usd})`;
  if (action.reason === "TRAILING_STOP" && action.peak && action.peak > 0) {
    line += ` | trailing desde máx ${ccy}${fmtPrice(action.peak)}`;
  } else if (action.reason === "PARTIAL_TP") {
    line += ` | parcial 50% (≥+25%)`;
  }
  return line;
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

  /**
   * Evaluate + execute exits for a channel.
   * Crypto: Alpaca market sells. Stocks: IBKR supervised LMT using shared positions cache.
   */
  async checkPositions(
    channelOrRegistry?: ExitChannel | LegacyRegistry,
    maybeRegistry?: LegacyRegistry,
  ): Promise<ExitAction[]> {
    const channel: ExitChannel =
      channelOrRegistry === "crypto" || channelOrRegistry === "stocks"
        ? channelOrRegistry
        : "stocks";
    // Legacy registry arg kept for call-site compatibility; trailing file is source of truth.
    void (typeof channelOrRegistry === "object" ? channelOrRegistry : maybeRegistry);

    const summary = await this.runChannel(channel);
    return summary.actions;
  }

  async runChannel(channel: ExitChannel): Promise<ExitCheckSummary> {
    const positions =
      channel === "crypto" ? await this.loadCrypto() : await this.loadStocks();

    const actions: ExitAction[] = [];
    let closed = 0;
    let partials = 0;

    for (const pos of positions) {
      const decision = decideExit(pos);
      if (!decision) continue;

      try {
        const executed =
          channel === "crypto"
            ? await executeCryptoSell(decision)
            : await executeStockSell(decision, pos.account);

        // Paper/read-only: evaluate + log only (no registry close / Telegram)
        if (executed.executed === false) {
          actions.push(executed);
          console.log(
            `[Exit/${channel}] candidato ${executed.symbol}:${executed.reason} ` +
              `pnl=${(executed.pnlPct * 100).toFixed(1)}% (no live submit)`,
          );
          continue;
        }

        if (executed.reason === "PARTIAL_TP") {
          upsertTrailingState(pos.symbol, {
            peak: Math.max(getTrailingState(pos.symbol)?.peak ?? pos.currentPrice, pos.currentPrice),
            trailingActive: true,
            partialSold: true,
          });
          partials += 1;
        } else {
          recordFullClose(pos.symbol);
          closed += 1;
        }

        actions.push(executed);
        const line = telegramLine(channel, executed);
        console.log(`[Exit/${channel}] ${line}`);
        appendJournalTrade({
          at: new Date().toISOString(),
          market: channel === "crypto" ? "crypto" : "stocks",
          strategy: executed.reason,
          ticker: executed.symbol,
          side: "SELL",
          entry: executed.entry,
          exit: executed.price,
          exitReason: executed.reason,
          grossPnlUsd: executed.pnlUSD,
          costsUsd: 0,
          netPnlUsd: executed.pnlUSD,
          rMultiple: null,
          durationMs: null,
          shadow: false,
        });
        void sendTelegramMessage(line).catch((err) =>
          console.warn(
            `[Exit/${channel}] Telegram:`,
            err instanceof Error ? err.message : err,
          ),
        );
      } catch (err) {
        console.warn(
          `[Exit/${channel}] sell failed ${pos.symbol}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    // Trailing count among still-open positions that remain after this pass
    const closedSymbols = new Set(
      actions.filter((a) => !a.partial).map((a) => a.symbol),
    );
    let trailingActive = 0;
    for (const pos of positions) {
      if (closedSymbols.has(pos.symbol)) continue;
      const st = getTrailingState(pos.symbol);
      if (st?.trailingActive) trailingActive += 1;
    }

    console.log(
      `[Exit/${channel}] revisadas=${positions.length} cerradas=${closed} parciales=${partials} trailing_activos=${trailingActive}`,
    );

    return {
      channel,
      reviewed: positions.length,
      closed,
      partials,
      trailingActive,
      actions,
    };
  }

  private async loadCrypto(): Promise<OpenPositionRow[]> {
    const monitored = loadTradingState().monitoredPositions;
    const journalBuys = readJournalTrades(8000).filter(
      (t) => t.market === "crypto" && t.side === "BUY" && !t.shadow,
    );
    const openedAtOf = (symbol: string): string | undefined => {
      const sym = symbol.toUpperCase().replace("/", "");
      const hit = monitored.find(
        (p) =>
          p.ticker.toUpperCase().replace("/", "") === sym ||
          p.ticker.toUpperCase().replace(/EUR$/, "") ===
            sym.replace(/EUR$/, "").replace(/^XBT$/, "BTC"),
      );
      if (hit?.openedAt) return hit.openedAt;
      // Latest matching journal BUY
      for (let i = journalBuys.length - 1; i >= 0; i -= 1) {
        const t = journalBuys[i]!;
        const jt = t.ticker.toUpperCase().replace("/", "");
        if (jt === sym || jt.replace(/EUR$/, "") === sym.replace(/EUR$/, "")) {
          return t.at;
        }
      }
      return undefined;
    };

    if (isKrakenCryptoBroker()) {
      if (!isKrakenConfigured()) {
        console.warn("[Exit/crypto] Kraken not configured — skip");
        return [];
      }
      const rows = await getKrakenAdapter()
        .getPositions()
        .catch((err) => {
          console.warn(
            "[Exit/crypto] Kraken positions failed:",
            err instanceof Error ? err.message : err,
          );
          return [] as KrakenPosition[];
        });
      const mapped: OpenPositionRow[] = rows.map((p) => ({
        symbol: p.symbol,
        qty: p.qty,
        avgCost: p.avgEntryPrice,
        currentPrice: p.currentPrice,
        unrealizedPlpc: p.unrealizedPlpc,
        openedAt: openedAtOf(p.symbol),
      }));
      // Only ForgeOS journal opens — never other Kraken balances
      const managed = filterJournalOpenCryptoSymbols(mapped);
      console.log(
        `[Exit/crypto] Kraken positions=${mapped.length} forgeos=${managed.length}`,
      );
      return managed;
    }

    if (isIbkrCryptoBroker()) {
      const rows = await fetchCachedIbkrPositions().catch((err) => {
        console.warn(
          "[Exit/crypto] IBKR positions failed:",
          err instanceof Error ? err.message : err,
        );
        return [] as IbkrPositionRow[];
      });
      const all = ibkrCryptoPositions(rows)
        .filter((p) => !isLegacyOrphanTicker(p.symbol))
        .map((p) => ({ ...p, openedAt: openedAtOf(p.symbol) }));
      console.log(`[Exit/crypto] IBKR/PAXOS positions=${all.length}`);
      return all;
    }
    if (!isAlpacaConfigured()) {
      console.warn("[Exit/crypto] Alpaca not configured — skip");
      return [];
    }
    const rows = await getAlpacaPositions().catch((err) => {
      console.warn(
        "[Exit/crypto] getPositions failed:",
        err instanceof Error ? err.message : err,
      );
      return [] as AlpacaPosition[];
    });
    // Alpaca paper crypto account is ForgeOS-owned — exclude only legacy orphan symbols.
    return cryptoPositions(rows)
      .filter((p) => !isLegacyOrphanTicker(p.symbol))
      .map((p) => ({ ...p, openedAt: openedAtOf(p.symbol) }));
  }

  private async loadStocks(): Promise<OpenPositionRow[]> {
    const rows = await fetchCachedIbkrPositions().catch((err) => {
      console.warn(
        "[Exit/stocks] positions cache failed:",
        err instanceof Error ? err.message : err,
      );
      return [] as IbkrPositionRow[];
    });
    const all = stockPositions(rows);
    const managed = filterForgeOsManagedSymbols(all);
    const skipped = all.length - managed.length;
    if (skipped > 0) {
      console.log(
        `[Exit/stocks] omitidas ${skipped} posiciones huérfanas (no ForgeOS): ` +
          all
            .filter((p) => !managed.some((m) => m.symbol === p.symbol))
            .map((p) => p.symbol)
            .slice(0, 12)
            .join(","),
      );
    }
    return managed;
  }

  async notifyExit(action: ExitAction, _phase?: unknown): Promise<void> {
    const channel: ExitChannel = isAlpacaCryptoTicker(action.symbol) ? "crypto" : "stocks";
    await sendTelegramMessage(telegramLine(channel, action));
  }
}

let singleton: ExitManager | null = null;

export function getExitManager(): ExitManager {
  if (!singleton) singleton = new ExitManager();
  return singleton;
}
