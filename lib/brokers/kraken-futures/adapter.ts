/**
 * Kraken Futures REST v3 adapter — flex (multi-collateral) PF_* perpetuals.
 */

import "server-only";

import {
  isAcceptedSendStatus,
  sizeForNotionalUsd,
  type FuturesSizingResult,
} from "./order-math";

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
  useKrakenFuturesDemoEndpoint,
} from "./sign";
import { chartsCandlesUrl, parseChartsCandles } from "./charts";

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
const KRAKEN_SPOT_PUBLIC = "https://api.kraken.com";
const DEFAULT_EUR_USD = 1.08;

let instrumentCacheAt = 0;
let instrumentCache: Map<string, FuturesInstrumentMeta> | null = null;
let feeCache: FuturesFeeSchedule | null = null;
let eurUsdCache: { rate: number; at: number } | null = null;

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Kraken private REST often returns `{ result: "success", accounts: {...}, serverTime }`
 * with payload siblings of `result`, not inside it.
 */
export function unwrapKrakenFuturesPrivatePayload<T>(
  body: ApiEnvelope<T> & Record<string, unknown>,
): T {
  const result = body.result;
  if (result != null && typeof result === "object" && !Array.isArray(result)) {
    return result as T;
  }
  const payload: Record<string, unknown> = { ...body };
  delete payload.error;
  delete payload.errors;
  delete payload.serverTime;
  if (typeof payload.result === "string" || payload.result == null) {
    delete payload.result;
  }
  return payload as T;
}

/** Kraken /accounts returns `accounts` keyed by name (flex, cash, …), not an array. */
export function parseKrakenFuturesAccountsPayload(
  raw: Record<string, unknown>,
): FuturesAccount {
  const empty: FuturesAccount = {
    currency: "USD",
    balanceValue: 0,
    availableMargin: 0,
    initialMargin: 0,
    maintenanceMargin: 0,
    pnl: 0,
    unrealizedFunding: 0,
    flexAccount: false,
  };

  const accountsRaw = raw.accounts;
  let flex: Record<string, unknown> | undefined;

  if (accountsRaw && typeof accountsRaw === "object" && !Array.isArray(accountsRaw)) {
    const keyed = accountsRaw as Record<string, Record<string, unknown>>;
    flex =
      keyed.flex ??
      Object.values(keyed).find((a) => a?.type === "multiCollateralMarginAccount");
  } else if (Array.isArray(accountsRaw)) {
    flex = accountsRaw.find(
      (a) => (a as Record<string, unknown>).type === "multiCollateralMarginAccount",
    ) as Record<string, unknown> | undefined;
  }

  if (!flex || flex.type !== "multiCollateralMarginAccount") return empty;

  return {
    currency: "USD",
    balanceValue: num(flex.balanceValue ?? flex.portfolioValue ?? flex.collateralValue),
    availableMargin: num(flex.availableMargin),
    initialMargin: num(flex.initialMargin),
    maintenanceMargin: num(flex.maintenanceMargin),
    pnl: num(flex.pnl),
    unrealizedFunding: num(flex.unrealizedFunding),
    flexAccount: true,
  };
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
            Object.entries(params).map(([k, v]) => [k, String(v)]),
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
  if (body.error) {
    throw new Error(`Kraken Futures: ${body.error}`);
  }
  if (body.errors?.length) {
    const msg = body.errors.map((e) => e.message ?? "error").join("; ");
    throw new Error(`Kraken Futures: ${msg}`);
  }
  return unwrapKrakenFuturesPrivatePayload(body);
}

export function parseInstrument(row: Record<string, unknown>): FuturesInstrumentMeta {
  // contractValueTradePrecision may legitimately be 0 or negative (whole / tens of contracts).
  const rawPrecision = Number(row.contractValueTradePrecision);
  const precision = Number.isFinite(rawPrecision) ? rawPrecision : 2;
  return {
    symbol: String(row.symbol ?? "").toUpperCase(),
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
    if (
      instrumentCache &&
      instrumentCache.size > 0 &&
      !force &&
      Date.now() - instrumentCacheAt < 6 * 3600_000
    ) {
      return instrumentCache;
    }
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
    if (map.size === 0) {
      // Never cache an empty/invalid response: every later lookup would be "instrument_unknown".
      console.warn(
        `[Kraken/Futures] /instruments sin contratos PF_* (filas=${list.length}) — no se cachea`,
      );
      return instrumentCache ?? map;
    }
    instrumentCache = map;
    instrumentCacheAt = Date.now();
    return map;
  }

  async getInstrument(symbol: string): Promise<FuturesInstrumentMeta | null> {
    const key = symbol.toUpperCase();
    let map = await this.loadInstruments();
    if (!map.has(key)) {
      // Unknown in cache → refresh once (new listing or stale/partial cache).
      map = await this.loadInstruments(true).catch(() => map);
    }
    return map.get(key) ?? null;
  }

  async getInstrumentForSpotPair(spotPair: string): Promise<FuturesInstrumentMeta | null> {
    const pf = spotPairToPfSymbol(spotPair);
    if (!pf) return null;
    return this.getInstrument(pf);
  }

  /** Historical 8h funding rates (public). */
  async getHistoricalFundingRates(
    symbol: string,
  ): Promise<Array<{ time: number; rate: number }>> {
    const sym = symbol.toUpperCase();
    const raw = await publicGet<{ rates?: Record<string, unknown>[] }>(
      "/historical-funding-rates",
      { symbol: sym },
    );
    const rows = raw.rates ?? (Array.isArray(raw) ? raw : []);
    if (!Array.isArray(rows)) return [];
    return rows
      .map((r) => {
        const row = r as Record<string, unknown>;
        const ts = num(row.timestamp ?? row.time);
        const rate = num(row.fundingRate ?? row.relativeFundingRate ?? row.rate);
        return { time: ts > 1e12 ? Math.floor(ts / 1000) : ts, rate };
      })
      .filter((x) => x.time > 0)
      .sort((a, b) => a.time - b.time);
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

  /**
   * OHLC candles via the Charts API (`count` newest candles, default 300).
   * Throws on HTTP errors so callers can log the real cause.
   */
  async getCandles(
    symbol: string,
    resolutionMinutes: number,
    fromMs?: number,
    count = 300,
  ): Promise<FuturesBar[]> {
    const url = chartsCandlesUrl({
      demo: useKrakenFuturesDemoEndpoint(),
      symbol,
      minutes: resolutionMinutes,
      count: fromMs ? undefined : count,
      fromSec: fromMs ? fromMs / 1000 : undefined,
    });
    if (!url) throw new Error(`Kraken charts: unsupported resolution ${resolutionMinutes}m`);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Kraken charts HTTP ${res.status} ${symbol} ${resolutionMinutes}m`);
    return parseChartsCandles(await res.json());
  }


  async getAccount(): Promise<FuturesAccount> {
    const raw = await privateCall<Record<string, unknown>>("GET", "/accounts");
    return parseKrakenFuturesAccountsPayload(raw);
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

  async getMaxLeveragePreference(symbol: string): Promise<number | null> {
    const sym = symbol.toUpperCase();
    const raw = await privateCall<Record<string, unknown>>("GET", "/leveragepreferences", {
      symbol: sym,
    });
    const rows = (raw.leveragePreferences as Record<string, unknown>[]) ?? [];
    const row =
      rows.find((r) => String(r.symbol ?? "").toUpperCase() === sym) ??
      rows[0];
    if (!row) return null;
    const lev = num(row.maxLeverage ?? row.leverage);
    return lev > 0 ? lev : null;
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
    if (!isAcceptedSendStatus(st.status)) {
      // e.g. invalidPrice, insufficientAvailableFunds, postWouldExecute, wouldNotReducePosition
      throw new Error(
        `Kraken sendorder ${params.orderType} ${params.side} ${params.symbol} rejected: status=${String(st.status)}`,
      );
    }
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
    let stop: FuturesOrderResult;
    try {
      stop = await this.sendOrder({
        symbol: params.symbol,
        side: stopSide,
        size: params.size,
        orderType: "stp",
        stopPrice: params.stopPrice,
        reduceOnly: true,
        triggerSignal: "mark",
      });
    } catch (err) {
      // Never leave an unprotected entry resting on the book.
      if (entry.orderId) await this.cancelOrder(entry.orderId).catch(() => undefined);
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`exchange stop failed (entry cancelled): ${msg}`);
    }
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

  /** Spot EUR/USD mid for flex (USD) notional caps. */
  async getEurUsdRate(): Promise<number> {
    if (eurUsdCache && Date.now() - eurUsdCache.at < 60_000) {
      return eurUsdCache.rate;
    }
    const envFx = Number(process.env.STOCKS_EUR_USD_FX ?? NaN);
    let rate = Number.isFinite(envFx) && envFx > 0 ? envFx : DEFAULT_EUR_USD;
    try {
      const res = await fetch(
        `${KRAKEN_SPOT_PUBLIC}/0/public/Ticker?pair=EURUSD`,
        { cache: "no-store" },
      );
      if (res.ok) {
        const json = (await res.json()) as {
          result?: Record<string, { c?: string[]; a?: string[]; b?: string[] }>;
        };
        const row = json.result ? Object.values(json.result)[0] : undefined;
        const bid = row?.b?.[0] ? Number(row.b[0]) : NaN;
        const ask = row?.a?.[0] ? Number(row.a[0]) : NaN;
        const last = row?.c?.[0] ? Number(row.c[0]) : NaN;
        const mid =
          bid > 0 && ask > 0 ? (bid + ask) / 2 : last > 0 ? last : bid > 0 ? bid : ask;
        if (mid > 0) rate = mid;
      }
    } catch {
      /* keep env/default */
    }
    eurUsdCache = { rate, at: Date.now() };
    return rate;
  }

  /** Like sizeForNotionalEur but explains why sizing failed (logged by the engine). */
  async sizeForNotionalEurDetailed(
    spotOrPf: string,
    notionalEur: number,
    priceUsd?: number,
  ): Promise<FuturesSizingResult> {
    const eurUsd = await this.getEurUsdRate();
    const pf =
      spotOrPf.toUpperCase().startsWith("PF_")
        ? spotOrPf.toUpperCase()
        : spotPairToPfSymbol(spotOrPf);
    if (!pf) return { ok: false, reason: "no_pf_symbol" };
    let instrumentError = "";
    const meta = await this.getInstrument(pf).catch((err: unknown) => {
      instrumentError = err instanceof Error ? err.message : String(err);
      return null;
    });
    if (!meta && instrumentError) {
      return { ok: false, reason: `instrument_error(${instrumentError.slice(0, 120)})` };
    }
    let px = priceUsd ?? 0;
    if (!(px > 0)) {
      px = await this.getQuote(pf).then((q) => q.mid).catch(() => 0);
    }
    return sizeForNotionalUsd({
      symbol: pf,
      meta,
      notionalUsd: notionalEur * eurUsd,
      price: px,
      eurUsd,
    });
  }

  /** Size in contracts for EUR notional cap (converted to USD at spot EUR/USD). */
  async sizeForNotionalEur(
    spotOrPf: string,
    notionalEur: number,
    price?: number,
  ): Promise<{ symbol: string; size: number; price: number } | null> {
    const notionalUsd = notionalEur * (await this.getEurUsdRate());
    const pf =
      spotOrPf.toUpperCase().startsWith("PF_")
        ? spotOrPf.toUpperCase()
        : spotPairToPfSymbol(spotOrPf);
    if (!pf) return null;
    const meta = await this.getInstrument(pf);
    if (!meta?.tradeable) return null;
    const px = price ?? (await this.getQuote(pf)).mid;
    if (!(px > 0)) return null;
    const rawSize = notionalUsd / (px * meta.contractSize);
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
