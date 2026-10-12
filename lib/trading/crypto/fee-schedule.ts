/**
 * Kraken account fee schedule — TradeVolume → .forgeos/cache/kraken-fees.json.
 * Observed 12/10: maker 0.40% / taker 0.80% (30d volume ~$190).
 * Defaults match that tier when TradeVolume is unavailable.
 */

import fs from "node:fs";
import path from "node:path";

/** Account-tier defaults (fraction of notional) when TradeVolume / cache missing. */
export const DEFAULT_KRAKEN_MAKER_FEE = 0.004; // 0.40%
export const DEFAULT_KRAKEN_TAKER_FEE = 0.008; // 0.80%

const REFRESH_INTERVAL_MS = 6 * 60 * 60_000;

export type KrakenFeeSchedule = {
  updatedAt: string;
  source: "trade_volume" | "default" | "cache";
  volume30d?: number;
  currency?: string;
  /** Fraction, e.g. 0.004 = 0.40%. */
  maker: number;
  /** Fraction, e.g. 0.008 = 0.80%. */
  taker: number;
  /** Optional per-pair overrides (normalized pair → fraction). */
  pairs?: Record<string, { maker: number; taker: number }>;
};

function forgeosRoot(): string {
  return process.env.FORGEOS_ROOT?.trim() || process.cwd();
}

function cachePath(): string {
  return path.join(forgeosRoot(), ".forgeos", "cache", "kraken-fees.json");
}

function clampFee(raw: number, fallback: number): number {
  if (!Number.isFinite(raw) || raw < 0 || raw > 0.05) return fallback;
  return raw;
}

/** Kraken returns fee as percent string ("0.40") → fraction 0.004. */
function pctStringToFraction(raw: unknown, fallback: number): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  // Values > 0.05 are almost certainly percent (0.40), not fraction
  if (n > 0.05) return clampFee(n / 100, fallback);
  return clampFee(n, fallback);
}

function defaultSchedule(): KrakenFeeSchedule {
  return {
    updatedAt: new Date(0).toISOString(),
    source: "default",
    maker: DEFAULT_KRAKEN_MAKER_FEE,
    taker: DEFAULT_KRAKEN_TAKER_FEE,
  };
}

let memory: KrakenFeeSchedule | null = null;
let lastRefreshMs = 0;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

export function readCachedFeeSchedule(): KrakenFeeSchedule {
  try {
    const p = cachePath();
    if (!fs.existsSync(p)) return defaultSchedule();
    const raw = JSON.parse(fs.readFileSync(p, "utf8")) as Partial<KrakenFeeSchedule>;
    if (!raw || typeof raw !== "object") return defaultSchedule();
    return {
      updatedAt: String(raw.updatedAt ?? new Date(0).toISOString()),
      source: raw.source === "trade_volume" || raw.source === "cache" ? raw.source : "default",
      volume30d:
        typeof raw.volume30d === "number" && Number.isFinite(raw.volume30d)
          ? raw.volume30d
          : undefined,
      currency: raw.currency,
      maker: clampFee(Number(raw.maker), DEFAULT_KRAKEN_MAKER_FEE),
      taker: clampFee(Number(raw.taker), DEFAULT_KRAKEN_TAKER_FEE),
      pairs: raw.pairs && typeof raw.pairs === "object" ? raw.pairs : undefined,
    };
  } catch {
    return defaultSchedule();
  }
}

function writeCachedFeeSchedule(schedule: KrakenFeeSchedule): void {
  try {
    const dir = path.dirname(cachePath());
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(cachePath(), JSON.stringify(schedule, null, 2), "utf8");
  } catch (err) {
    console.warn(
      "[Kraken/Fees] cache write failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

function load(): KrakenFeeSchedule {
  if (memory) return memory;
  memory = readCachedFeeSchedule();
  if (memory.source === "default" && memory.updatedAt === new Date(0).toISOString()) {
    // Persist defaults so offline backtests see the account-tier rates
    const seeded: KrakenFeeSchedule = {
      ...memory,
      updatedAt: new Date().toISOString(),
      source: "default",
    };
    writeCachedFeeSchedule(seeded);
    memory = seeded;
  }
  return memory;
}

export function getFeeSchedule(): KrakenFeeSchedule {
  return load();
}

function normPair(pair?: string): string | null {
  if (!pair) return null;
  return pair.trim().toUpperCase().replace("/", "") || null;
}

/** Maker fee as fraction of notional. */
export function getMakerFeePct(pair?: string): number {
  const s = load();
  const key = normPair(pair);
  if (key && s.pairs?.[key]?.maker != null) {
    return clampFee(s.pairs[key]!.maker, s.maker);
  }
  return s.maker;
}

/** Taker fee as fraction of notional. */
export function getTakerFeePct(pair?: string): number {
  const s = load();
  const key = normPair(pair);
  if (key && s.pairs?.[key]?.taker != null) {
    return clampFee(s.pairs[key]!.taker, s.taker);
  }
  return s.taker;
}

type TradeVolumeFeeRow = {
  fee?: string | number;
  minfee?: string | number;
  maxfee?: string | number;
};

type TradeVolumeResult = {
  currency?: string;
  volume?: string | number;
  fees?: Record<string, TradeVolumeFeeRow>;
  fees_maker?: Record<string, TradeVolumeFeeRow>;
};

function pickFeeFromMap(
  map: Record<string, TradeVolumeFeeRow> | undefined,
  fallback: number,
): number {
  if (!map) return fallback;
  const rows = Object.values(map);
  if (!rows.length) return fallback;
  // Prefer the highest fee row (conservative / matches low-volume tier)
  let max = 0;
  for (const row of rows) {
    const f = pctStringToFraction(row.fee, 0);
    if (f > max) max = f;
  }
  return max > 0 ? max : fallback;
}

function perPairFromMaps(
  fees: Record<string, TradeVolumeFeeRow> | undefined,
  feesMaker: Record<string, TradeVolumeFeeRow> | undefined,
): Record<string, { maker: number; taker: number }> {
  const out: Record<string, { maker: number; taker: number }> = {};
  const keys = new Set([
    ...Object.keys(fees ?? {}),
    ...Object.keys(feesMaker ?? {}),
  ]);
  for (const k of keys) {
    const maker = pctStringToFraction(
      feesMaker?.[k]?.fee,
      DEFAULT_KRAKEN_MAKER_FEE,
    );
    const taker = pctStringToFraction(fees?.[k]?.fee, DEFAULT_KRAKEN_TAKER_FEE);
    const norm = k.replace(/\//g, "").toUpperCase();
    out[norm] = { maker, taker };
  }
  return out;
}

/**
 * Fetch /0/private/TradeVolume (fee-info=true) and persist.
 * Safe to call when Kraken is not configured — keeps defaults / cache.
 */
export async function refreshKrakenFeeSchedule(): Promise<KrakenFeeSchedule> {
  try {
    const { isKrakenConfigured } = await import("@/lib/brokers/kraken/sign");
    if (!isKrakenConfigured()) {
      const cached = readCachedFeeSchedule();
      memory = cached.source === "default" ? load() : cached;
      return memory;
    }
    const { getKrakenAdapter } = await import("@/lib/brokers/kraken");
    const raw = await getKrakenAdapter().getTradeVolume();
    const maker = pickFeeFromMap(raw.fees_maker, DEFAULT_KRAKEN_MAKER_FEE);
    const taker = pickFeeFromMap(raw.fees, DEFAULT_KRAKEN_TAKER_FEE);
    const schedule: KrakenFeeSchedule = {
      updatedAt: new Date().toISOString(),
      source: "trade_volume",
      volume30d: Number(raw.volume) || undefined,
      currency: raw.currency,
      maker,
      taker,
      pairs: perPairFromMaps(raw.fees, raw.fees_maker),
    };
    writeCachedFeeSchedule(schedule);
    memory = schedule;
    lastRefreshMs = Date.now();
    console.log(
      `[Kraken/Fees] TradeVolume maker=${(maker * 100).toFixed(2)}% ` +
        `taker=${(taker * 100).toFixed(2)}% vol=${raw.volume ?? "n/a"}`,
    );
    return schedule;
  } catch (err) {
    console.warn(
      "[Kraken/Fees] TradeVolume refresh failed — using cache/defaults:",
      err instanceof Error ? err.message : err,
    );
    memory = readCachedFeeSchedule();
    if (memory.source === "default") memory = load();
    return memory;
  }
}

/** Start-of-engine: refresh now + every 6h. Idempotent. */
export function startKrakenFeeScheduleRefresh(): void {
  void refreshKrakenFeeSchedule().catch(() => undefined);
  if (refreshTimer) return;
  refreshTimer = setInterval(() => {
    void refreshKrakenFeeSchedule().catch(() => undefined);
  }, REFRESH_INTERVAL_MS);
  refreshTimer.unref?.();
}

/** Test helper. */
export function __setFeeScheduleForTests(schedule: Partial<KrakenFeeSchedule> | null): void {
  if (schedule == null) {
    memory = null;
    lastRefreshMs = 0;
    return;
  }
  memory = {
    updatedAt: new Date().toISOString(),
    source: schedule.source ?? "cache",
    maker: clampFee(Number(schedule.maker ?? DEFAULT_KRAKEN_MAKER_FEE), DEFAULT_KRAKEN_MAKER_FEE),
    taker: clampFee(Number(schedule.taker ?? DEFAULT_KRAKEN_TAKER_FEE), DEFAULT_KRAKEN_TAKER_FEE),
    volume30d: schedule.volume30d,
    currency: schedule.currency,
    pairs: schedule.pairs,
  };
}

export type { TradeVolumeResult };
