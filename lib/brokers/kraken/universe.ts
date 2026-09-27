/**
 * Dynamic Kraken EUR universe — hourly refresh, liquid top-N.
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";

const PUBLIC = "https://api.kraken.com";
const CACHE_FILE = path.join(process.cwd(), ".forgeos", "cache", "kraken-universe.json");
const FIRST_SEEN_FILE = path.join(
  process.cwd(),
  ".forgeos",
  "cache",
  "kraken-pair-first-seen.json",
);
const TTL_MS = 60 * 60 * 1000;
const MAX_PAIRS = 40;
const MIN_VOLUME_EUR = 1_000_000;
const MAX_SPREAD_PCT = 0.0015; // 0.15%
const MIN_LISTED_MS = 7 * 24 * 60 * 60 * 1000;

const STABLE_BASES = new Set([
  "USDT", "USDC", "EURC", "DAI", "TUSD", "USDP", "BUSD", "GUSD", "PYUSD", "EUR", "ZEUR",
]);

export type KrakenUniversePair = {
  altname: string;
  wsname: string;
  base: string;
  quote: string;
  volume24hEur: number;
  spreadPct: number;
  pairDecimals: number;
  lotDecimals: number;
  orderMin: number;
};

type CacheShape = {
  fetchedAt: string;
  total: number;
  liquid: number;
  selected: KrakenUniversePair[];
};

let memory: CacheShape | null = null;

function isFresh(c: CacheShape): boolean {
  const t = Date.parse(c.fetchedAt);
  return Number.isFinite(t) && Date.now() - t < TTL_MS && c.selected.length > 0;
}

function writeCache(c: CacheShape): void {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(c, null, 2), "utf8");
  } catch {
    /* ignore */
  }
}

function readCache(): CacheShape | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) as CacheShape;
  } catch {
    return null;
  }
}

function loadFirstSeen(): Record<string, string> {
  try {
    if (!fs.existsSync(FIRST_SEEN_FILE)) return {};
    return JSON.parse(fs.readFileSync(FIRST_SEEN_FILE, "utf8")) as Record<string, string>;
  } catch {
    return {};
  }
}

function saveFirstSeen(m: Record<string, string>): void {
  try {
    fs.mkdirSync(path.dirname(FIRST_SEEN_FILE), { recursive: true });
    fs.writeFileSync(FIRST_SEEN_FILE, JSON.stringify(m, null, 2), "utf8");
  } catch {
    /* ignore */
  }
}

/** Track first sighting; require ≥7 days before eligible (seed unknowns as already aged). */
function isListedLongEnough(
  altname: string,
  firstSeen: Record<string, string>,
  now: number,
): boolean {
  const existing = firstSeen[altname];
  if (!existing) {
    // Bootstrap: treat as listed 8 days ago so liquid pairs aren't all frozen on first deploy
    firstSeen[altname] = new Date(now - MIN_LISTED_MS - 86_400_000).toISOString();
    return true;
  }
  const t = Date.parse(existing);
  if (!Number.isFinite(t)) return false;
  return now - t >= MIN_LISTED_MS;
}

function baseFromRaw(base: string): string {
  const b = base.toUpperCase();
  if (b.startsWith("X") && b.length === 4) return b.slice(1); // XXBT → XBT
  if (b.startsWith("Z") && b.length === 4) return b.slice(1);
  return b;
}

export async function refreshKrakenUniverse(force = false): Promise<CacheShape> {
  if (!force && memory && isFresh(memory)) return memory;
  if (!force) {
    const disk = readCache();
    if (disk && isFresh(disk)) {
      memory = disk;
      return disk;
    }
  }

  const pairsRes = await fetch(`${PUBLIC}/0/public/AssetPairs`, { cache: "no-store" });
  if (!pairsRes.ok) throw new Error(`AssetPairs HTTP ${pairsRes.status}`);
  const pairsBody = (await pairsRes.json()) as {
    error?: string[];
    result?: Record<string, Record<string, unknown>>;
  };
  if (pairsBody.error?.length) throw new Error(pairsBody.error.join("; "));

  const eurCandidates: Array<{
    key: string;
    altname: string;
    wsname: string;
    base: string;
    quote: string;
    pairDecimals: number;
    lotDecimals: number;
    orderMin: number;
    status?: string;
  }> = [];

  for (const [key, raw] of Object.entries(pairsBody.result ?? {})) {
    const quote = String(raw.quote ?? "").toUpperCase();
    if (quote !== "ZEUR" && quote !== "EUR") continue;
    const base = baseFromRaw(String(raw.base ?? ""));
    if (STABLE_BASES.has(base) || STABLE_BASES.has(base.replace(/^X/, ""))) continue;
    const status = String(raw.status ?? "online").toLowerCase();
    if (status.includes("cancel_only") || status.includes("limit_only") || status === "offline") {
      continue;
    }
    const altname = String(raw.altname ?? key).toUpperCase();
    const wsname = String(raw.wsname ?? "").trim() || `${base}/EUR`;
    eurCandidates.push({
      key,
      altname,
      wsname: wsname.includes("/") ? wsname : `${base}/EUR`,
      base,
      quote: "EUR",
      pairDecimals: Number(raw.pair_decimals ?? 2),
      lotDecimals: Number(raw.lot_decimals ?? 8),
      orderMin: Number(raw.ordermin ?? 0),
      status,
    });
  }

  const total = eurCandidates.length;
  // Batch ticker — Kraken accepts comma-separated pairs
  const pairList = eurCandidates.map((c) => c.altname).join(",");
  const tickRes = await fetch(
    `${PUBLIC}/0/public/Ticker?pair=${encodeURIComponent(pairList)}`,
    { cache: "no-store" },
  );
  if (!tickRes.ok) throw new Error(`Ticker HTTP ${tickRes.status}`);
  const tickBody = (await tickRes.json()) as {
    error?: string[];
    result?: Record<string, Record<string, unknown>>;
  };
  if (tickBody.error?.length) throw new Error(tickBody.error.join("; "));

  const liquid: KrakenUniversePair[] = [];
  const firstSeen = loadFirstSeen();
  const now = Date.now();
  let firstSeenDirty = false;
  for (const c of eurCandidates) {
    const row =
      tickBody.result?.[c.key] ??
      tickBody.result?.[c.altname] ??
      Object.entries(tickBody.result ?? {}).find(
        ([k, v]) => k === c.altname || String((v as { a?: unknown }).a) === c.altname,
      )?.[1];
    if (!row || typeof row !== "object") continue;
    const askArr = Array.isArray(row.a) ? row.a : [];
    const bidArr = Array.isArray(row.b) ? row.b : [];
    const volArr = Array.isArray(row.v) ? row.v : [];
    const vwapArr = Array.isArray(row.p) ? row.p : [];
    const ask = Number(askArr[0] ?? 0);
    const bid = Number(bidArr[0] ?? 0);
    if (!(ask > 0) || !(bid > 0)) continue;
    const spreadPct = (ask - bid) / ((ask + bid) / 2);
    if (spreadPct >= MAX_SPREAD_PCT) continue;
    const volBase = Number(volArr[1] ?? volArr[0] ?? 0); // 24h volume in base
    const vwap = Number(vwapArr[1] ?? vwapArr[0] ?? 0);
    const last = Number(Array.isArray(row.c) ? row.c[0] : 0);
    const px = vwap > 0 ? vwap : last > 0 ? last : (ask + bid) / 2;
    const volume24hEur = volBase * px;
    if (!(volume24hEur > MIN_VOLUME_EUR)) continue;
    const before = firstSeen[c.altname];
    if (!isListedLongEnough(c.altname, firstSeen, now)) continue;
    if (firstSeen[c.altname] !== before) firstSeenDirty = true;
    liquid.push({
      altname: c.altname,
      wsname: c.wsname,
      base: c.base,
      quote: c.quote,
      volume24hEur,
      spreadPct,
      pairDecimals: c.pairDecimals,
      lotDecimals: c.lotDecimals,
      orderMin: c.orderMin,
    });
  }
  if (firstSeenDirty || Object.keys(firstSeen).length) saveFirstSeen(firstSeen);

  liquid.sort((a, b) => b.volume24hEur - a.volume24hEur);
  const selected = liquid.slice(0, MAX_PAIRS);
  const cache: CacheShape = {
    fetchedAt: new Date().toISOString(),
    total,
    liquid: liquid.length,
    selected,
  };
  memory = cache;
  writeCache(cache);
  console.log(
    `[Kraken/Universe] total=${total} líquidos=${liquid.length} seleccionados=${selected.length}`,
  );
  return cache;
}

export async function getKrakenUniversePairs(): Promise<string[]> {
  const u = await refreshKrakenUniverse();
  return u.selected.map((p) => p.altname);
}

export function peekKrakenUniverse(): CacheShape | null {
  return memory ?? readCache();
}
