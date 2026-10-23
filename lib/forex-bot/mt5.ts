/**
 * MetaTrader 5 connector — talks to services/mt5-bridge (HTTP on 127.0.0.1:8004, inside the
 * MT5 Wine container). Prices, spreads, tick values and executions come from the broker
 * account itself (OANDA TMS).
 */

import "server-only";

import type { FxCandle, FxSide } from "./types";

export function mt5Configured(): boolean {
  return Boolean((process.env.MT5_BRIDGE_KEY ?? "").trim());
}

function bridgeUrl(): string {
  return (process.env.MT5_BRIDGE_URL ?? "http://127.0.0.1:8004").replace(/\/$/, "");
}

async function call<T>(path: string, body?: unknown, timeoutMs = 30_000): Promise<T> {
  const res = await fetch(`${bridgeUrl()}${path}`, {
    method: body ? "POST" : "GET",
    headers: { "X-Bridge-Key": (process.env.MT5_BRIDGE_KEY ?? "").trim(), "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(`MT5 ${path} HTTP ${res.status}: ${json?.error ?? "error"}`);
  return json;
}

export type Mt5Account = {
  login: number;
  server: string;
  currency: string;
  balance: number;
  equity: number;
  margin_free: number;
  leverage: number;
  trade_allowed: boolean;
  trade_expert: boolean;
  terminal_trade_allowed: boolean | null;
  connected: boolean | null;
  demo: boolean;
};

export async function mt5Account(): Promise<Mt5Account> {
  return call<Mt5Account>("/account");
}

const symbolCache = new Map<string, string>();

/** EUR_USD → broker symbol name. */
export async function mt5Symbol(instrument: string): Promise<string> {
  const hit = symbolCache.get(instrument);
  if (hit) return hit;
  const r = await call<{ symbol: string | null }>(`/resolve?base=${encodeURIComponent(instrument)}`);
  if (!r.symbol) throw new Error(`MT5: sin símbolo para ${instrument}`);
  symbolCache.set(instrument, r.symbol);
  return r.symbol;
}

export type Mt5SymbolInfo = {
  symbol: string;
  digits: number;
  point: number;
  contract_size: number;
  volume_min: number;
  volume_step: number;
  volume_max: number;
  tick_size: number;
  tick_value: number;
  tick_value_loss: number;
  stops_level: number;
  currency_profit: string;
  currency_base: string;
  bid: number | null;
  ask: number | null;
  time: number | null;
};

export async function mt5SymbolInfo(instrument: string): Promise<Mt5SymbolInfo> {
  const s = await mt5Symbol(instrument);
  return call<Mt5SymbolInfo>(`/symbol?symbol=${encodeURIComponent(s)}`);
}

export async function mt5Candles(instrument: string, tf: "M5" | "M15" | "H1" | "H4" | "D1", count: number): Promise<FxCandle[]> {
  const s = await mt5Symbol(instrument);
  return call<FxCandle[]>(`/rates?symbol=${encodeURIComponent(s)}&tf=${tf}&count=${count}`, undefined, 120_000);
}

export type Mt5Position = {
  ticket: number;
  symbol: string;
  side: FxSide;
  volume: number;
  price_open: number;
  sl: number;
  tp: number;
  profit: number;
  magic: number;
};

export async function mt5Positions(): Promise<Mt5Position[]> {
  return call<Mt5Position[]>("/positions");
}

export async function mt5Order(args: {
  instrument: string;
  side: FxSide;
  lots: number;
  stop: number;
  takeProfit: number;
  comment: string;
}): Promise<{ ticket: string; price: number; volume: number }> {
  const symbol = await mt5Symbol(args.instrument);
  const r = await call<{ order: number; deal: number; price: number; volume: number }>("/order", {
    symbol,
    side: args.side,
    volume: args.lots,
    sl: args.stop,
    tp: args.takeProfit,
    comment: args.comment,
  });
  return { ticket: String(r.order), price: r.price, volume: r.volume };
}

export async function mt5Close(ticket: string): Promise<{ price: number }> {
  return call<{ price: number }>("/close", { ticket: Number(ticket) });
}

/** MT5 deal reasons: 3 = SO, 4 = SL, 5 = TP. */
export async function mt5Closed(ticket: string): Promise<{ closed: boolean; pnl: number; exitPrice: number | null; reason: number | null }> {
  const r = await call<{ closed: boolean; pnl: number; exit_price: number | null; reason: number | null }>(
    `/closed?ticket=${encodeURIComponent(ticket)}`,
  );
  return { closed: r.closed, pnl: r.pnl, exitPrice: r.exit_price, reason: r.reason };
}

/** Dry-run order check (nothing is sent): can the account really trade right now? */
export async function mt5TradeCheck(): Promise<{ ok: boolean; retcode: number | null; comment: string }> {
  return call<{ ok: boolean; retcode: number | null; comment: string }>("/tradecheck");
}
