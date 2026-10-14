/**
 * Kraken Futures REST v3 adapter — flex (multi-collateral) PF_* perpetuals.
 */

import "server-only";

import {
  quantizeFuturesPrice,
  quantizeFuturesSize,
  spotPairToPfSymbol,
  type FuturesInstrumentMeta,
} from "./instruments";
import {
  isKrakenFuturesConfigured,
  krakenFuturesAuthHeaders,
  krakenFuturesRestBase,
  nextKrakenFuturesNonce,
  redactKrakenFuturesSecrets,
} from "./sign";

type ApiEnvelope<T> = {
  result?: T;
  error?: string;
  errors?: Array<{ message?: string }>;
  serverTime?: string;
};

export type FuturesAccount = {
  currency: string;
  balanceValue: number;
  availableMargin: number;
  initialMargin: number;
  maintenanceMargin: number;
  pnl: number;
  unrealizedFunding: number;
  flexAccount: boolean;
};

export type FuturesPosition = {
  symbol: string;
  side: "long" | "short";
  size: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice: number | null;
  unrealizedPnl: number;
  leverage: number;
};

export type FuturesQuote = {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  mid: number;
  mark: number;
  fundingRate: number;
  updatedAt: string;
};

export type FuturesBar = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type FuturesOrderResult = {
  orderId: string;
  symbol: string;
  side: "buy" | "sell";
  size: number;
  price: number;
  orderType: string;
  stopOrderId?: string;
};

export type FuturesFeeSchedule = {
  makerPct: number;
  takerPct: number;
  source: "account" | "default";
};

const DEFAULT_MAKER = 0.0002;
const DEFAULT_TAKER = 0.0005;

let instrumentCache: Map<string, FuturesInstrumentMeta> | null = null;
let feeCache: FuturesFeeSchedule | null = null;

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function apiPath(endpoint: string): string {
  const ep = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return ep.startsWith("/api/") ? ep : `/api/v3${ep}`;
}

async function publicGet<T>(endpoint: string, query?: Record<string, string>): Promise<T> {
  const ep = apiPath(endpoint);
  const qs = query ? `?${new URLSearchParams(query).toString()}` : "";
  const res = await fetch(`${krakenFuturesRestBase()}${ep}${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Kraken Futures public HTTP ${res.status}`);
  const body = (await res.json()) as ApiEnvelope<T> & T;
  if (body.error) throw new Error(`Kraken Futures: ${body.error}`);
  return (body.result ?? body) as T;
}

async function privateCall<T>(
  method: "GET" | "POST",
  endpoint: string,
  params: Record<string, string | number | boolean> = {},
): Promise<T> {
  if (!isKrakenFuturesConfigured()) {
    throw new Error("Kraken Futures no configurado (KRAKEN_FUTURES_* API keys)");
  }
  const endpointPath = apiPath(endpoint);
  const nonce = nextKrakenFuturesNonce();
  const postData =
    method === "GET"
      ? ""
      : new URLSearchParams(
          Object.fromEntries(
            Object.entries({ nonce, ...params }).map(([k, v]) => [k, String(v)]),
          ),
        ).toString();
  const headers = krakenFuturesAuthHeaders(endpointPath, postData, nonce);
  const qs =
    method === "GET" && Object.keys(params).length
      ? `?${new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))).toString()}`
      : "";
  let res: Response;
  try {
    res = await fetch(`${krakenFuturesRestBase()}${endpointPath}${qs}`, {
      method,
      headers,
      body: method === "POST" ? postData : undefined,
      cache: "no-store",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(redactKrakenFuturesSecrets(`Kraken Futures private fetch failed: ${msg}`));
  }
  const text = await res.text();
  let body: ApiEnvelope<T>;
  try {
    body = JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    throw new Error(`Kraken Futures private HTTP ${res.status}: invalid JSON`);
  }
  if (!res.ok) {
    throw new Error(`Kraken Futures private HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  if (body.error) throw new Error(`Kraken Futures: ${body.error}`);
  if (body.errors?.length) {
    throw new Error(
      `Kraken Futures: ${body.errors.map((e) => e.message ?? "error").join("; ")}`,
    );
  }
  return (body.result ?? body) as T;
}

function parseInstrument(row: Record<string, unknown>): FuturesInstrumentMeta {
  const precision = num(row.contractValueTradePrecision) || 2;
  return {
    symbol: String(row.symbol ?? ""),
    tickSize: num(row.tickSize) || 0.01,
    contractSize: num(row.contractSize) || 1,
    contractValueTradePrecision: precision,
    tradeable: row.tradeable !== false && row.suspended !== true,
    base: String(row.base ?? ""),
    quote: String(row.quote ?? "USD"),
    minSize: 10 ** -precision,
  };
}

export class KrakenFuturesAdapter {
  async loadInstruments(force = false): Promise<Map<string, FuturesInstrumentMeta>> {
    if (instrumentCache && !force) return instrumentCache;
    const raw = await publicGet<{ instruments?: Record<string, unknown>[] }>("/instruments");
    const list = Array.isArray(raw.instruments)
      ? raw.instruments
      : Array.isArray(raw)
        ? (raw as Record<string, unknown>[])
        : [];
    const map = new Map<string, FuturesInstrumentMeta>();
    for (const row of list) {
      const meta = parseInstrument(row as Record<string, unknown>);
      if (meta.symbol.startsWith("PF_")) map.set(meta.symbol, meta);
    }
    instrumentCache = map;
    return map;
  }

  async getInstrument(symbol: string): Promise<FuturesInstrumentMeta | null> {
    const map = await this.loadInstruments();
    return map.get(symbol.toUpperCase()) ?? null;
  }

  async getInstrumentForSpotPair(spotPair: string): Promise<FuturesInstrumentMeta | null> {
    const pf = spotPairToPfSymbol(spotPair);
    if (!pf) return null;
    return this.getInstrument(pf);
  }

  async getQuote(symbol: string): Promise<FuturesQuote> {
    const sym = symbol.toUpperCase();
    const raw = await publicGet<{ tickers?: Record<string, unknown>[] }>("/tickers");
    const tickers = Array.isArray(raw.tickers) ? raw.tickers : [];
    const row = tickers.find(
      (t) => String((t as { symbol?: string }).symbol ?? "").toUpperCase() === sym,
    ) as Record<string, unknown> | undefined;
    if (!row) throw new Error(`No ticker for ${sym}`);
    const bid = num(row.bid);
    const ask = num(row.ask);
    const last = num(row.last ?? row.lastPrice);
    const mark = num(row.markPrice ?? row.mark ?? last);
    return {
      symbol: sym,
      bid,
      ask,
      last,
      mid: bid > 0 && ask > 0 ? (bid + ask) / 2 : last,
      mark,
      fundingRate: num(row.fundingRate ?? row.relativeFundingRate),
      updatedAt: new Date().toISOString(),
    };
  }

  async getCandles(
    symbol: string,
    resolutionMinutes: number,
    fromMs?: number,
  ): Promise<FuturesBar[]> {
    const sym = symbol.toUpperCase();
    const path = `/history/${sym}/${resolutionMinutes}`;
    const query: Record<string, string> = {};
    if (fromMs) query.from = String(Math.floor(fromMs / 1000));
    const raw = await publicGet<{ candles?: unknown[]; history?: unknown[] }>(path, query);
    const candles = (raw.candles ?? raw.history ?? raw) as unknown[];
    if (!Array.isArray(candles)) return [];
    return candles.map((c) => {
      const row = c as Record<string, unknown> | number[];
      if (Array.isArray(row)) {
        const t = num(row[0]);
        return {
          time: new Date(t * 1000).toISOString(),
          open: num(row[1]),
          high: num(row[2]),
          low: num(row[3]),
          close: num(row[4]),
          volume: num(row[5]),
        };
      }
      const ts = num(row.time ?? row.timestamp);
      return {
        time: new Date(ts).toISOString(),
        open: num(row.open),
        high: num(row.high),
        low: num(row.low),
        close: num(row.close),
        volume: num(row.volume),
      };
    });
  }

  async getAccount(): Promise<FuturesAccount> {
    const raw = await privateCall<Record<string, unknown>>("GET", "/accounts");
    const accounts = (raw.accounts as Record<string, unknown>[]) ?? [];
    const flex =
      accounts.find((a) => a.type === "multiCollateralMarginAccount") ??
      accounts.find((a) => String(a.currency ?? "").toUpperCase() === "EUR") ??
      accounts[0];
    if (!flex) {
      return {
        currency: "EUR",
        balanceValue: 0,
        availableMargin: 0,
        initialMargin: 0,
        maintenanceMargin: 0,
        pnl: 0,
        unrealizedFunding: 0,
        flexAccount: true,
      };
    }
    return {
      currency: String(flex.currency ?? "EUR"),
      balanceValue: num(flex.balanceValue ?? flex.portfolioValue ?? flex.collateralValue),
      availableMargin: num(flex.availableMargin ?? flex.availableBalance),
      initialMargin: num(flex.initialMargin),
      maintenanceMargin: num(flex.maintenanceMargin),
      pnl: num(flex.pnl),
      unrealizedFunding: num(flex.unrealizedFunding),
      flexAccount: flex.type === "multiCollateralMarginAccount",
    };
  }

  async getFees(): Promise<FuturesFeeSchedule> {
    if (feeCache) return feeCache;
    try {
      const raw = await privateCall<Record<string, unknown>>("GET", "/feeschedules");
      const schedules = (raw.feeSchedules as Record<string, unknown>[]) ?? [];
      const row = schedules[0] as Record<string, unknown> | undefined;
      if (row) {
        const maker = num(row.makerFee ?? row.maker);
        const taker = num(row.takerFee ?? row.taker);
        if (maker > 0 && taker > 0) {
          feeCache = {
            makerPct: maker > 0.01 ? maker / 100 : maker,
            takerPct: taker > 0.01 ? taker / 100 : taker,
            source: "account",
          };
          return feeCache;
        }
      }
    } catch {
      /* fall through */
    }
    try {
      const raw = await privateCall<Record<string, unknown>>("GET", "/accountlog");
      void raw;
    } catch {
      /* ignore */
    }
    feeCache = { makerPct: DEFAULT_MAKER, takerPct: DEFAULT_TAKER, source: "default" };
    return feeCache;
  }

  async getOpenPositions(): Promise<FuturesPosition[]> {
    const raw = await privateCall<{ openPositions?: Record<string, unknown>[] }>(
      "GET",
      "/openpositions",
    );
    const rows = raw.openPositions ?? (Array.isArray(raw) ? raw : []);
    if (!Array.isArray(rows)) return [];
    return rows.map((p) => {
      const size = num(p.size ?? p.quantity);
      return {
        symbol: String(p.symbol ?? ""),
        side: size >= 0 ? "long" : "short",
        size: Math.abs(size),
        entryPrice: num(p.price ?? p.entryPrice),
        markPrice: num(p.markPrice ?? p.mark),
        liquidationPrice: num(p.liquidationPrice) || null,
        unrealizedPnl: num(p.pnl ?? p.unrealizedPnl),
        leverage: num(p.effectiveLeverage ?? p.leverage) || 1,
      };
    });
  }

  async setLeverage(symbol: string, maxLeverage: number): Promise<void> {
    await privateCall("POST", "/leveragepreferences", {
      symbol: symbol.toUpperCase(),
      maxLeverage,
    });
  }

  async sendOrder(params: {
    symbol: string;
    side: "buy" | "sell";
    size: number;
    orderType: "lmt" | "mkt" | "stp" | "take_profit";
    limitPrice?: number;
    stopPrice?: number;
    reduceOnly?: boolean;
    postOnly?: boolean;
    triggerSignal?: "mark" | "last" | "index";
  }): Promise<FuturesOrderResult> {
    const meta = await this.getInstrument(params.symbol);
    if (!meta) throw new Error(`Unknown instrument ${params.symbol}`);
    let size = quantizeFuturesSize(params.size, meta);
    if (!(size > 0)) throw new Error("Order size below minimum contract");
    const body: Record<string, string | number | boolean> = {
      orderType: params.orderType,
      symbol: params.symbol.toUpperCase(),
      side: params.side,
      size,
    };
    if (params.limitPrice != null && params.orderType === "lmt") {
      body.limitPrice = quantizeFuturesPrice(params.limitPrice, meta.tickSize);
    }
    if (params.stopPrice != null) {
      body.stopPrice = quantizeFuturesPrice(params.stopPrice, meta.tickSize);
    }
    if (params.reduceOnly) body.reduceOnly = true;
    if (params.postOnly) body.postOnly = true;
    if (params.triggerSignal) body.triggerSignal = params.triggerSignal;

    const raw = await privateCall<{ sendStatus?: Record<string, unknown> }>(
      "POST",
      "/sendorder",
      body,
    );
    const st = raw.sendStatus ?? (raw as Record<string, unknown>);
    const orderId = String(st.order_id ?? st.orderId ?? st.id ?? "");
    return {
      orderId,
      symbol: params.symbol.toUpperCase(),
      side: params.side,
      size,
      price: num(st.limitPrice ?? params.limitPrice ?? params.stopPrice),
      orderType: params.orderType,
    };
  }

  /** Entry limit post-only + mandatory exchange stop (stp). Returns both order ids when possible. */
  async enterWithExchangeStop(params: {
    symbol: string;
    side: "buy" | "sell";
    size: number;
    limitPrice: number;
    stopPrice: number;
    postOnly?: boolean;
  }): Promise<FuturesOrderResult> {
    const entry = await this.sendOrder({
      symbol: params.symbol,
      side: params.side,
      size: params.size,
      orderType: "lmt",
      limitPrice: params.limitPrice,
      postOnly: params.postOnly ?? true,
    });
    const stopSide = params.side === "buy" ? "sell" : "buy";
    const stop = await this.sendOrder({
      symbol: params.symbol,
      side: stopSide,
      size: params.size,
      orderType: "stp",
      stopPrice: params.stopPrice,
      reduceOnly: true,
      triggerSignal: "mark",
    });
    return { ...entry, stopOrderId: stop.orderId };
  }

  async cancelOrder(orderId: string): Promise<void> {
    await privateCall("POST", "/cancelorder", { order_id: orderId });
  }

  async cancelAll(symbol?: string): Promise<void> {
    const p: Record<string, string> = {};
    if (symbol) p.symbol = symbol.toUpperCase();
    await privateCall("POST", "/cancelallorders", p);
  }

  /** Size in contracts for target notional (EUR treated ≈ USD for sizing). */
  async sizeForNotionalEur(
    spotOrPf: string,
    notionalEur: number,
    price?: number,
  ): Promise<{ symbol: string; size: number; price: number } | null> {
    const pf =
      spotOrPf.toUpperCase().startsWith("PF_")
        ? spotOrPf.toUpperCase()
        : spotPairToPfSymbol(spotOrPf);
    if (!pf) return null;
    const meta = await this.getInstrument(pf);
    if (!meta?.tradeable) return null;
    const px = price ?? (await this.getQuote(pf)).mid;
    if (!(px > 0)) return null;
    const rawSize = notionalEur / (px * meta.contractSize);
    const size = quantizeFuturesSize(rawSize, meta);
    if (!(size > 0)) return null;
    return { symbol: pf, size, price: px };
  }
}

let singleton: KrakenFuturesAdapter | null = null;

export function getKrakenFuturesAdapter(): KrakenFuturesAdapter {
  if (!singleton) singleton = new KrakenFuturesAdapter();
  return singleton;
}

export function getDefaultFuturesFees(): FuturesFeeSchedule {
  return feeCache ?? { makerPct: DEFAULT_MAKER, takerPct: DEFAULT_TAKER, source: "default" };
}
