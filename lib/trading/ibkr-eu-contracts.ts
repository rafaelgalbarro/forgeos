/**
 * European equity IBKR contract cache — resolve once per calendar day.
 * File: .forgeos/cache/ibkr-eu-contracts.json (shared with ibkr-broker Python).
 * Analysis never uses this for prices — only pre-trade verify + order qualify.
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";
import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import {
  EUROPE_EUR_EQUITIES,
  getEuropeanEurEquity,
  type EuEquitySpec,
} from "@/lib/trading/europe-equities";

const CACHE_DIR = path.join(process.cwd(), ".forgeos", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "ibkr-eu-contracts.json");

export type EuContractResolved = {
  symbol: string;
  conId: number;
  exchange: string;
  primaryExchange: string;
  currency: string;
  companyName: string;
  cachedAt: string;
  /** YYYY-MM-DD (UTC) — resolve once per day */
  day: string;
};

export type EuContractCheckRow = {
  symbol: string;
  eodhd: string;
  venue: EuEquitySpec["venue"];
  expectedPrimaryExchange: string;
  expectedCurrency: "EUR";
  ok: boolean;
  contract: EuContractResolved | null;
  error: string | null;
};

type CacheShape = Record<string, EuContractResolved & Record<string, unknown>>;

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function cacheKey(symbol: string, primary: string): string {
  return `${symbol.trim().toUpperCase()}|EUR|${primary || "SMART"}`;
}

function readCache(): CacheShape {
  try {
    if (!fs.existsSync(CACHE_FILE)) return {};
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) as CacheShape;
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

function writeCache(cache: CacheShape): void {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
  } catch (err) {
    console.warn(
      "[EuContracts] cache write failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

function entryFresh(entry: EuContractResolved | null | undefined): entry is EuContractResolved {
  if (!entry?.conId || !(entry.conId > 0)) return false;
  const day = entry.day || (entry.cachedAt ?? "").slice(0, 10);
  return day === todayUtc();
}

function normalizeEntry(
  symbol: string,
  raw: Record<string, unknown>,
): EuContractResolved | null {
  const conId = Number(raw.conId ?? 0);
  if (!(conId > 0)) return null;
  const cachedAt =
    typeof raw.cachedAt === "string" && raw.cachedAt
      ? raw.cachedAt
      : new Date().toISOString();
  return {
    symbol: String(raw.symbol ?? symbol).toUpperCase(),
    conId,
    exchange: String(raw.exchange ?? "SMART"),
    primaryExchange: String(raw.primaryExchange ?? ""),
    currency: String(raw.currency ?? "EUR").toUpperCase(),
    companyName: String(raw.longName ?? raw.companyName ?? "").slice(0, 120),
    cachedAt,
    day: String(raw.day ?? cachedAt.slice(0, 10)),
  };
}

/** Peek today's cached EU contract without network. */
export function peekEuContractCache(symbol: string): EuContractResolved | null {
  const spec = getEuropeanEurEquity(symbol);
  if (!spec) return null;
  const cache = readCache();
  const key = cacheKey(spec.symbol, spec.primaryExchange);
  const entry = normalizeEntry(spec.symbol, (cache[key] ?? {}) as Record<string, unknown>);
  return entryFresh(entry) ? entry : null;
}

/**
 * Resolve + cache EU contract via IBKR reqContractDetails (once per day).
 * Safe to call every cycle — returns disk hit when fresh.
 */
export async function resolveEuContractOncePerDay(
  symbol: string,
): Promise<EuContractResolved> {
  const spec = getEuropeanEurEquity(symbol);
  if (!spec) {
    throw new Error(`${symbol}: no es equity europea EUR del universo`);
  }

  const hit = peekEuContractCache(spec.symbol);
  if (hit) return hit;

  const raw = await ibkrServiceFetch<{
    ok?: boolean;
    symbol?: string;
    conId?: number;
    exchange?: string;
    primaryExchange?: string;
    currency?: string;
    longName?: string;
    companyName?: string;
    cachedAt?: string;
    error?: string;
  }>(
    `/api/ibkr/contract/${encodeURIComponent(spec.symbol)}` +
      `?currency=EUR&primaryExchange=${encodeURIComponent(spec.primaryExchange)}`,
  );

  if (raw?.error || !(Number(raw?.conId) > 0)) {
    throw new Error(
      raw?.error?.trim() ||
        `EU contract resolve failed for ${spec.symbol} EUR/${spec.primaryExchange}`,
    );
  }

  const resolved: EuContractResolved = {
    symbol: spec.symbol,
    conId: Number(raw.conId),
    exchange: String(raw.exchange ?? "SMART"),
    primaryExchange: String(raw.primaryExchange ?? spec.primaryExchange),
    currency: "EUR",
    companyName: String(raw.longName ?? raw.companyName ?? "").slice(0, 120),
    cachedAt: String(raw.cachedAt ?? new Date().toISOString()),
    day: todayUtc(),
  };

  const cache = readCache();
  cache[cacheKey(spec.symbol, spec.primaryExchange)] = {
    ...resolved,
    longName: resolved.companyName,
  };
  writeCache(cache);
  console.log(
    `[EuContracts] ${spec.symbol} conId=${resolved.conId} ` +
      `${resolved.primaryExchange}/${resolved.currency} ${resolved.companyName.slice(0, 40)}`,
  );
  return resolved;
}

/** Pre-trade verification for the full EU universe. */
export async function checkAllEuContracts(opts?: {
  resolveMissing?: boolean;
}): Promise<EuContractCheckRow[]> {
  const resolveMissing = opts?.resolveMissing !== false;
  const rows: EuContractCheckRow[] = [];

  for (const spec of EUROPE_EUR_EQUITIES) {
    const base: EuContractCheckRow = {
      symbol: spec.symbol,
      eodhd: spec.eodhd,
      venue: spec.venue,
      expectedPrimaryExchange: spec.primaryExchange,
      expectedCurrency: "EUR",
      ok: false,
      contract: null,
      error: null,
    };

    try {
      const cached = peekEuContractCache(spec.symbol);
      if (cached) {
        base.ok = true;
        base.contract = cached;
        rows.push(base);
        continue;
      }
      if (!resolveMissing) {
        base.error = "sin cache del día — ejecutar resolve";
        rows.push(base);
        continue;
      }
      const resolved = await resolveEuContractOncePerDay(spec.symbol);
      base.ok = true;
      base.contract = resolved;
      rows.push(base);
    } catch (err) {
      base.error = err instanceof Error ? err.message : String(err);
      rows.push(base);
    }
  }

  return rows;
}
