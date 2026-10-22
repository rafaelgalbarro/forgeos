/**
 * OANDA v20 REST connector (practice / live).
 *   Practice: https://api-fxpractice.oanda.com   Live: https://api-fxtrade.oanda.com
 * Auth: Authorization: Bearer OANDA_API_TOKEN. Every entry carries stopLossOnFill and
 * takeProfitOnFill, so the protection lives on OANDA's servers.
 */

import "server-only";

import { oandaEnv } from "./config";
import type { FxCandle, FxSide } from "./types";

function base(): string {
  return oandaEnv() === "live" ? "https://api-fxtrade.oanda.com" : "https://api-fxpractice.oanda.com";
}

function accountId(): string {
  return (process.env.OANDA_ACCOUNT_ID ?? "").trim();
}

async function call<T>(method: "GET" | "POST" | "PUT", path: string, body?: unknown): Promise<T> {
  const token = (process.env.OANDA_API_TOKEN ?? "").trim();
  if (!token) throw new Error("OANDA no configurado (OANDA_API_TOKEN)");
  const res = await fetch(`${base()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept-Datetime-Format": "UNIX",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    const msg = (json as { errorMessage?: string } | null)?.errorMessage ?? text.slice(0, 200);
    throw new Error(`OANDA HTTP ${res.status}: ${msg}`);
  }
  return json as T;
}

export type OandaAccount = {
  currency: string;
  balance: number;
  nav: number;
  unrealizedPL: number;
  marginAvailable: number;
  openTradeCount: number;
};

export async function oandaAccount(): Promise<OandaAccount> {
  const r = await call<{ account: Record<string, string | number> }>("GET", `/v3/accounts/${accountId()}/summary`);
  const a = r.account;
  return {
    currency: String(a.currency),
    balance: Number(a.balance),
    nav: Number(a.NAV),
    unrealizedPL: Number(a.unrealizedPL),
    marginAvailable: Number(a.marginAvailable),
    openTradeCount: Number(a.openTradeCount),
  };
}

export async function oandaCandles(
  instrument: string,
  granularity: "M5" | "M15" | "H1",
  count = 300,
): Promise<FxCandle[]> {
  const r = await call<{ candles: Array<{ time: string; complete: boolean; volume: number; mid: { o: string; h: string; l: string; c: string } }> }>(
    "GET",
    `/v3/instruments/${instrument}/candles?granularity=${granularity}&count=${count}&price=M`,
  );
  return (r.candles ?? [])
    .filter((c) => c.complete) // closed candles only
    .map((c) => ({
      time: Math.floor(Number(c.time)),
      open: Number(c.mid.o),
      high: Number(c.mid.h),
      low: Number(c.mid.l),
      close: Number(c.mid.c),
      volume: Number(c.volume ?? 0),
    }));
}

export type OandaPrice = {
  instrument: string;
  bid: number;
  ask: number;
  mid: number;
  tradeable: boolean;
  /** quote currency → account currency (for long / short units) */
  quoteHomeLong: number | null;
  quoteHomeShort: number | null;
};

export async function oandaPricing(instruments: readonly string[]): Promise<Map<string, OandaPrice>> {
  const r = await call<{ prices: Array<Record<string, unknown>> }>(
    "GET",
    `/v3/accounts/${accountId()}/pricing?instruments=${instruments.join(",")}&includeHomeConversions=true`,
  );
  const out = new Map<string, OandaPrice>();
  for (const p of r.prices ?? []) {
    const bid = Number((p.bids as Array<{ price: string }>)?.[0]?.price ?? NaN);
    const ask = Number((p.asks as Array<{ price: string }>)?.[0]?.price ?? NaN);
    const q = p.quoteHomeConversionFactors as { positiveUnits?: string; negativeUnits?: string } | undefined;
    out.set(String(p.instrument), {
      instrument: String(p.instrument),
      bid,
      ask,
      mid: (bid + ask) / 2,
      tradeable: p.tradeable !== false,
      quoteHomeLong: q?.positiveUnits ? Number(q.positiveUnits) : null,
      quoteHomeShort: q?.negativeUnits ? Number(q.negativeUnits) : null,
    });
  }
  return out;
}

const precisionCache = new Map<string, number>();

export async function oandaDisplayPrecision(instrument: string): Promise<number> {
  if (precisionCache.has(instrument)) return precisionCache.get(instrument)!;
  try {
    const r = await call<{ instruments: Array<{ name: string; displayPrecision: number }> }>(
      "GET",
      `/v3/accounts/${accountId()}/instruments?instruments=${instrument}`,
    );
    const p = r.instruments?.[0]?.displayPrecision;
    if (Number.isFinite(p)) {
      precisionCache.set(instrument, Number(p));
      return Number(p);
    }
  } catch {
    /* fall back */
  }
  return instrument.endsWith("_JPY") ? 3 : 5;
}

export type OandaFill = { tradeId: string; price: number; units: number };

/** Market entry with server-side stop loss + take profit. Throws with OANDA's reason on reject. */
export async function oandaMarketEntry(args: {
  instrument: string;
  side: FxSide;
  units: number;
  stop: number;
  takeProfit: number;
  clientTag?: string;
}): Promise<OandaFill> {
  const dp = await oandaDisplayPrecision(args.instrument);
  const units = args.side === "long" ? Math.abs(Math.floor(args.units)) : -Math.abs(Math.floor(args.units));
  const body = {
    order: {
      type: "MARKET",
      instrument: args.instrument,
      units: String(units),
      timeInForce: "FOK",
      positionFill: "DEFAULT",
      stopLossOnFill: { price: args.stop.toFixed(dp), timeInForce: "GTC" },
      takeProfitOnFill: { price: args.takeProfit.toFixed(dp), timeInForce: "GTC" },
      clientExtensions: args.clientTag ? { tag: args.clientTag.slice(0, 120) } : undefined,
    },
  };
  const r = await call<{
    orderFillTransaction?: { tradeOpened?: { tradeID: string; price: string; units: string } };
    orderCancelTransaction?: { reason?: string };
  }>("POST", `/v3/accounts/${accountId()}/orders`, body);
  const opened = r.orderFillTransaction?.tradeOpened;
  if (!opened) {
    throw new Error(`OANDA orden no ejecutada: ${r.orderCancelTransaction?.reason ?? "sin tradeOpened"}`);
  }
  return { tradeId: opened.tradeID, price: Number(opened.price), units: Number(opened.units) };
}

export type OandaOpenTrade = {
  id: string;
  instrument: string;
  units: number;
  price: number;
  unrealizedPL: number;
  hasStop: boolean;
  hasTakeProfit: boolean;
};

export async function oandaOpenTrades(): Promise<OandaOpenTrade[]> {
  const r = await call<{ trades: Array<Record<string, unknown>> }>("GET", `/v3/accounts/${accountId()}/openTrades`);
  return (r.trades ?? []).map((t) => ({
    id: String(t.id),
    instrument: String(t.instrument),
    units: Number(t.currentUnits),
    price: Number(t.price),
    unrealizedPL: Number(t.unrealizedPL ?? 0),
    hasStop: Boolean(t.stopLossOrder),
    hasTakeProfit: Boolean(t.takeProfitOrder),
  }));
}

export async function oandaCloseTrade(tradeId: string): Promise<{ price: number; pl: number }> {
  const r = await call<{ orderFillTransaction?: { price?: string; pl?: string } }>(
    "PUT",
    `/v3/accounts/${accountId()}/trades/${tradeId}/close`,
    { units: "ALL" },
  );
  return { price: Number(r.orderFillTransaction?.price ?? NaN), pl: Number(r.orderFillTransaction?.pl ?? 0) };
}

/** Realized P&L of a closed trade (after TP/SL on the server). */
export async function oandaTradeDetails(tradeId: string): Promise<{ state: string; realizedPL: number; averageClosePrice: number | null }> {
  const r = await call<{ trade: Record<string, unknown> }>("GET", `/v3/accounts/${accountId()}/trades/${tradeId}`);
  return {
    state: String(r.trade?.state ?? ""),
    realizedPL: Number(r.trade?.realizedPL ?? 0),
    averageClosePrice: r.trade?.averageClosePrice != null ? Number(r.trade.averageClosePrice) : null,
  };
}
