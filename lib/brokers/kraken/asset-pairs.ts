/**
 * Kraken AssetPairs — ordermin + price/qty decimals, cached 24h.
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";
import { normalizeKrakenPair } from "./pairs";

const CACHE_DIR = path.join(process.cwd(), ".forgeos", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "kraken-asset-pairs.json");
const TTL_MS = 24 * 60 * 60 * 1000;
const PUBLIC_BASE = "https://api.kraken.com";

export type KrakenPairMeta = {
  pair: string;
  /** Kraken internal pair key (e.g. XXBTZEUR). */
  wsname?: string;
  altname: string;
  base: string;
  quote: string;
  pairDecimals: number;
  lotDecimals: number;
  orderMin: number;
  tickSize?: string;
};

type CacheShape = {
  fetchedAt: string;
  byAltname: Record<string, KrakenPairMeta>;
};

let memory: CacheShape | null = null;

function empty(): CacheShape {
  return { fetchedAt: "", byAltname: {} };
}

function readDisk(): CacheShape {
  try {
    if (!fs.existsSync(CACHE_FILE)) return empty();
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) as CacheShape;
  } catch {
    return empty();
  }
}

function writeDisk(cache: CacheShape): void {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
  } catch (err) {
    console.warn(
      "[Kraken/AssetPairs] cache write failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

function isFresh(cache: CacheShape): boolean {
  if (!cache.fetchedAt || !Object.keys(cache.byAltname).length) return false;
  const t = Date.parse(cache.fetchedAt);
  return Number.isFinite(t) && Date.now() - t < TTL_MS;
}

function parsePairRow(alt: string, raw: Record<string, unknown>): KrakenPairMeta | null {
  const altname = String(raw.altname ?? alt).toUpperCase();
  if (!altname.endsWith("EUR") && String(raw.quote ?? "").toUpperCase() !== "ZEUR") {
    return null;
  }
  const pairDecimals = Number(raw.pair_decimals ?? 2);
  const lotDecimals = Number(raw.lot_decimals ?? 8);
  const orderMin = Number(raw.ordermin ?? 0);
  return {
    pair: altname,
    altname,
    wsname: typeof raw.wsname === "string" ? raw.wsname : undefined,
    base: String(raw.base ?? ""),
    quote: String(raw.quote ?? ""),
    pairDecimals: Number.isFinite(pairDecimals) ? pairDecimals : 2,
    lotDecimals: Number.isFinite(lotDecimals) ? lotDecimals : 8,
    orderMin: Number.isFinite(orderMin) && orderMin > 0 ? orderMin : 0,
    tickSize: typeof raw.tick_size === "string" ? raw.tick_size : undefined,
  };
}

async function fetchAssetPairs(): Promise<CacheShape> {
  const url = `${PUBLIC_BASE}/0/public/AssetPairs`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Kraken AssetPairs HTTP ${res.status}`);
  const body = (await res.json()) as {
    error?: string[];
    result?: Record<string, Record<string, unknown>>;
  };
  if (body.error?.length) throw new Error(`Kraken AssetPairs: ${body.error.join("; ")}`);
  const byAltname: Record<string, KrakenPairMeta> = {};
  for (const [key, raw] of Object.entries(body.result ?? {})) {
    const meta = parsePairRow(key, raw);
    if (!meta) continue;
    byAltname[meta.pair] = meta;
    byAltname[meta.altname.toUpperCase()] = meta;
    byAltname[key.toUpperCase()] = meta;
  }
  const cache: CacheShape = { fetchedAt: new Date().toISOString(), byAltname };
  memory = cache;
  writeDisk(cache);
  console.log(
    `[Kraken/AssetPairs] cached ${Object.keys(byAltname).length} keys @ ${cache.fetchedAt}`,
  );
  return cache;
}

export async function ensureKrakenAssetPairs(): Promise<CacheShape> {
  if (memory && isFresh(memory)) return memory;
  const disk = readDisk();
  if (isFresh(disk)) {
    memory = disk;
    return disk;
  }
  return fetchAssetPairs();
}

export async function getKrakenPairMeta(pairOrSymbol: string): Promise<KrakenPairMeta | null> {
  const key = pairOrSymbol.trim().toUpperCase().replace("/", "");
  if (!key) return null;
  const cache = await ensureKrakenAssetPairs();
  return (
    cache.byAltname[key] ??
    cache.byAltname[normalizeKrakenPair(key) ?? ""] ??
    null
  );
}

/** Round volume down to lot decimals; enforce ordermin. */
export function quantizeKrakenVolume(qty: number, meta: KrakenPairMeta): number {
  if (!(qty > 0)) return 0;
  const factor = 10 ** meta.lotDecimals;
  const rounded = Math.floor(qty * factor + 1e-12) / factor;
  if (!(rounded > 0)) return 0;
  if (meta.orderMin > 0 && rounded < meta.orderMin) return 0;
  return rounded;
}

/** Round price to pair decimals. */
export function quantizeKrakenPrice(price: number, meta: KrakenPairMeta): number {
  if (!(price > 0)) return 0;
  const factor = 10 ** meta.pairDecimals;
  return Math.round(price * factor) / factor;
}
