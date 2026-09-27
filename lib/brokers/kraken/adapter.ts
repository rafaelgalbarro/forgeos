/**
 * KrakenAdapter — Spot REST (EUR crypto).
 * Private: HMAC-SHA512 + nonce. Public: Ticker / OHLC / AssetPairs.
 */

import "server-only";

import {
  ensureKrakenAssetPairs,
  getKrakenPairMeta,
  quantizeKrakenPrice,
  quantizeKrakenVolume,
  type KrakenPairMeta,
} from "./asset-pairs";
import {
  KRAKEN_EUR_PAIRS,
  krakenPairBase,
  normalizeKrakenBalanceAsset,
  normalizeKrakenPair,
  pairFromBase,
  type KrakenEurPair,
} from "./pairs";
import {
  isKrakenConfigured,
  krakenAuthHeaders,
  nextKrakenNonce,
  redactKrakenSecrets,
} from "./sign";

const PUBLIC_BASE = "https://api.kraken.com";
const PRIVATE_BASE = "https://api.kraken.com";

export type KrakenAccount = {
  currency: "EUR";
  cashEur: number;
  balances: Record<string, number>;
  equityEurApprox: number;
};

export type KrakenPosition = {
  symbol: KrakenEurPair;
  base: string;
  qty: number;
  avgEntryPrice: number;
  currentPrice: number;
  marketValueEur: number;
  unrealizedPlEur: number;
  unrealizedPlpc: number;
};

export type KrakenQuote = {
  symbol: KrakenEurPair;
  bid: number;
  ask: number;
  last: number;
  mid: number;
  updatedAt: string;
};

export type KrakenBar = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type KrakenOrderResult = {
  orderId: string;
  txids: string[];
  descr: string;
  pair: string;
  side: "buy" | "sell";
  volume: number;
  price: number;
};

type KrakenApiBody = {
  error?: string[];
  result?: unknown;
};

async function publicGet<T>(path: string, query?: Record<string, string>): Promise<T> {
  const qs = query
    ? `?${new URLSearchParams(query).toString()}`
    : "";
  const res = await fetch(`${PUBLIC_BASE}${path}${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Kraken public HTTP ${res.status}`);
  const body = (await res.json()) as KrakenApiBody;
  if (body.error?.length) throw new Error(`Kraken: ${body.error.join("; ")}`);
  return body.result as T;
}

async function privatePost<T>(
  path: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  if (!isKrakenConfigured()) {
    throw new Error("Kraken no configurado (KRAKEN_API_KEY / KRAKEN_API_SECRET)");
  }
  const nonce = nextKrakenNonce();
  const bodyParams: Record<string, string> = { nonce };
  for (const [k, v] of Object.entries(params)) {
    bodyParams[k] = String(v);
  }
  const postData = new URLSearchParams(bodyParams).toString();
  const headers = krakenAuthHeaders(path, postData, nonce);
  let res: Response;
  try {
    res = await fetch(`${PRIVATE_BASE}${path}`, {
      method: "POST",
      headers,
      body: postData,
      cache: "no-store",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(redactKrakenSecrets(`Kraken private fetch failed: ${msg}`));
  }
  const text = await res.text();
  let body: KrakenApiBody;
  try {
    body = JSON.parse(text) as KrakenApiBody;
  } catch {
    throw new Error(`Kraken private HTTP ${res.status}: invalid JSON`);
  }
  if (!res.ok) {
    throw new Error(`Kraken private HTTP ${res.status}`);
  }
  if (body.error?.length) {
    throw new Error(`Kraken: ${body.error.join("; ")}`);
  }
  return body.result as T;
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pickTickerRow(row: Record<string, unknown>): {
  bid: number;
  ask: number;
  last: number;
} {
  const a = Array.isArray(row.a) ? row.a : [];
  const b = Array.isArray(row.b) ? row.b : [];
  const c = Array.isArray(row.c) ? row.c : [];
  return {
    ask: num(a[0]),
    bid: num(b[0]),
    last: num(c[0]),
  };
}

/** Weighted avg entry from trades history (buys − sells FIFO cost). */
function avgEntryFromTrades(
  trades: Array<{ type: string; price: number; vol: number }>,
): number | null {
  let qty = 0;
  let cost = 0;
  for (const t of trades) {
    const vol = t.vol;
    const px = t.price;
    if (!(vol > 0) || !(px > 0)) continue;
    if (t.type === "buy") {
      cost += vol * px;
      qty += vol;
    } else if (t.type === "sell" && qty > 0) {
      const sell = Math.min(vol, qty);
      const avg = cost / qty;
      cost -= sell * avg;
      qty -= sell;
    }
  }
  if (!(qty > 1e-12) || !(cost > 0)) return null;
  return cost / qty;
}

export class KrakenAdapter {
  /** Warm AssetPairs cache (call at cycle start). */
  async warmPairMeta(): Promise<void> {
    await ensureKrakenAssetPairs();
  }

  async getAccount(): Promise<KrakenAccount> {
    const bal = await privatePost<Record<string, string>>("/0/private/Balance");
    const balances: Record<string, number> = {};
    let cashEur = 0;
    for (const [asset, raw] of Object.entries(bal ?? {})) {
      const amount = num(raw);
      if (!(amount > 0)) continue;
      const norm = normalizeKrakenBalanceAsset(asset) ?? asset;
      balances[norm] = (balances[norm] ?? 0) + amount;
      if (norm === "EUR") cashEur += amount;
    }
    return {
      currency: "EUR",
      cashEur,
      balances,
      equityEurApprox: cashEur,
    };
  }

  async getQuote(symbol: string): Promise<KrakenQuote> {
    const pair = normalizeKrakenPair(symbol);
    if (!pair) throw new Error(`Par Kraken desconocido: ${symbol}`);
    const result = await publicGet<Record<string, Record<string, unknown>>>(
      "/0/public/Ticker",
      { pair },
    );
    const row = Object.values(result ?? {})[0];
    if (!row) throw new Error(`Sin ticker Kraken para ${pair}`);
    const { bid, ask, last } = pickTickerRow(row);
    const mid =
      bid > 0 && ask > 0 ? (bid + ask) / 2 : last > 0 ? last : bid > 0 ? bid : ask;
    if (!(mid > 0)) throw new Error(`Precio Kraken inválido para ${pair}`);
    return {
      symbol: pair,
      bid,
      ask,
      last: last > 0 ? last : mid,
      mid,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * OHLC bars — interval minutes (15 or 60).
   */
  async getBars(symbol: string, intervalMin: 15 | 60, count = 96): Promise<KrakenBar[]> {
    const pair = normalizeKrakenPair(symbol);
    if (!pair) throw new Error(`Par Kraken desconocido: ${symbol}`);
    const result = await publicGet<{
      [k: string]: unknown;
    }>("/0/public/OHLC", {
      pair,
      interval: String(intervalMin),
    });
    const series = Object.entries(result ?? {}).find(([k]) => k !== "last")?.[1];
    if (!Array.isArray(series)) return [];
    const bars: KrakenBar[] = [];
    for (const row of series) {
      if (!Array.isArray(row) || row.length < 7) continue;
      const ts = Number(row[0]);
      bars.push({
        time: new Date(ts * 1000).toISOString(),
        open: num(row[1]),
        high: num(row[2]),
        low: num(row[3]),
        close: num(row[4]),
        volume: num(row[6]),
      });
    }
    return bars.slice(-Math.max(1, count));
  }

  async getPositions(): Promise<KrakenPosition[]> {
    const account = await this.getAccount();
    const tradesRaw = await privatePost<{
      trades?: Record<
        string,
        { pair?: string; type?: string; price?: string; vol?: string; time?: number }
      >;
    }>("/0/private/TradesHistory", { type: "all" }).catch(() => ({ trades: {} }));

    const tradesByPair = new Map<string, Array<{ type: string; price: number; vol: number; time: number }>>();
    for (const t of Object.values(tradesRaw.trades ?? {})) {
      const pair = normalizeKrakenPair(String(t.pair ?? ""));
      if (!pair) continue;
      const list = tradesByPair.get(pair) ?? [];
      list.push({
        type: String(t.type ?? "").toLowerCase(),
        price: num(t.price),
        vol: num(t.vol),
        time: Number(t.time ?? 0),
      });
      tradesByPair.set(pair, list);
    }
    for (const list of tradesByPair.values()) {
      list.sort((a, b) => a.time - b.time);
    }

    const out: KrakenPosition[] = [];
    for (const [base, qty] of Object.entries(account.balances)) {
      if (base === "EUR" || !(qty > 1e-8)) continue;
      const pair = pairFromBase(base);
      if (!pair || !KRAKEN_EUR_PAIRS.includes(pair)) continue;
      let quote: KrakenQuote;
      try {
        quote = await this.getQuote(pair);
      } catch {
        continue;
      }
      const trades = tradesByPair.get(pair) ?? [];
      const avg = avgEntryFromTrades(trades) ?? quote.mid;
      const marketValueEur = qty * quote.mid;
      const unrealizedPlEur = (quote.mid - avg) * qty;
      out.push({
        symbol: pair,
        base: krakenPairBase(pair),
        qty,
        avgEntryPrice: avg,
        currentPrice: quote.mid,
        marketValueEur,
        unrealizedPlEur,
        unrealizedPlpc: avg > 0 ? (quote.mid - avg) / avg : 0,
      });
    }
    return out;
  }

  async placeOrder(args: {
    symbol: string;
    side: "buy" | "sell";
    volume: number;
    price: number;
    /** Client order userref (optional int). */
    userref?: number;
  }): Promise<KrakenOrderResult> {
    const pair = normalizeKrakenPair(args.symbol);
    if (!pair) throw new Error(`Par Kraken desconocido: ${args.symbol}`);
    const meta = (await getKrakenPairMeta(pair)) as KrakenPairMeta;
    if (!meta) throw new Error(`Sin meta AssetPairs para ${pair}`);
    const volume = quantizeKrakenVolume(args.volume, meta);
    const price = quantizeKrakenPrice(args.price, meta);
    if (!(volume > 0)) {
      throw new Error(
        `Volumen ${args.volume} bajo mínimo/precisión Kraken (${meta.orderMin} lot=${meta.lotDecimals})`,
      );
    }
    if (!(price > 0)) throw new Error(`Precio inválido para ${pair}`);

    const result = await privatePost<{
      descr?: { order?: string };
      txid?: string[];
    }>("/0/private/AddOrder", {
      pair,
      type: args.side,
      ordertype: "limit",
      price,
      volume,
      ...(args.userref != null ? { userref: args.userref } : {}),
    });

    const txids = Array.isArray(result.txid) ? result.txid : [];
    return {
      orderId: txids[0] ?? "",
      txids,
      descr: result.descr?.order ?? `${args.side} ${volume} ${pair} @ ${price}`,
      pair,
      side: args.side,
      volume,
      price,
    };
  }

  async cancelOrder(txid: string): Promise<{ count: number }> {
    const id = txid.trim();
    if (!id) throw new Error("txid vacío");
    const result = await privatePost<{ count?: number }>("/0/private/CancelOrder", {
      txid: id,
    });
    return { count: Number(result.count ?? 0) };
  }

  /** Aggressive limit sell of full position qty (price × (1 − discount)). */
  async closePosition(args: {
    symbol: string;
    qty?: number;
    discountPct?: number;
  }): Promise<KrakenOrderResult> {
    const pair = normalizeKrakenPair(args.symbol);
    if (!pair) throw new Error(`Par Kraken desconocido: ${args.symbol}`);
    const positions = await this.getPositions();
    const pos = positions.find((p) => p.symbol === pair);
    const qty = args.qty ?? pos?.qty ?? 0;
    if (!(qty > 0)) throw new Error(`Sin posición Kraken para cerrar ${pair}`);
    const quote = await this.getQuote(pair);
    const discount = args.discountPct ?? 0.005;
    const limit = quote.mid * (1 - discount);
    return this.placeOrder({
      symbol: pair,
      side: "sell",
      volume: qty,
      price: limit,
    });
  }
}

let singleton: KrakenAdapter | null = null;

export function getKrakenAdapter(): KrakenAdapter {
  if (!singleton) singleton = new KrakenAdapter();
  return singleton;
}