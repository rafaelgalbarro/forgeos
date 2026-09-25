/**
 * Shared IBKR account/positions reads — 30s TTL + in-flight dedupe + call metrics.
 * All ForgeOS consumers should go through ibkrServiceFetch (which routes GET account/positions here).
 */

import "server-only";

import { getOrSetCached, invalidateCacheByPrefix } from "@/lib/market-data/cache";

export const IBKR_ACCOUNT_POSITIONS_TTL_MS = 30_000;

const ACCOUNT_CACHE_KEY = "IBKR:SHARED:ACCOUNT";
const POSITIONS_CACHE_KEY = "IBKR:SHARED:POSITIONS";

type CallCounters = {
  minuteKey: string;
  positions: number;
  account: number;
  connect: number;
};

let counters: CallCounters = {
  minuteKey: "",
  positions: 0,
  account: 0,
  connect: 0,
};

function minuteBucket(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
}

function bump(kind: "positions" | "account" | "connect"): void {
  const key = minuteBucket();
  if (counters.minuteKey !== key) {
    if (counters.minuteKey) {
      console.log(
        `[BrokerCalls] positions=${counters.positions} account=${counters.account} connect=${counters.connect}`,
      );
    }
    counters = { minuteKey: key, positions: 0, account: 0, connect: 0 };
  }
  counters[kind] += 1;
}

/** Flush metrics if the minute rolled (also callable from timers). */
export function flushBrokerCallMetricsIfNeeded(): void {
  const key = minuteBucket();
  if (counters.minuteKey && counters.minuteKey !== key) {
    console.log(
      `[BrokerCalls] positions=${counters.positions} account=${counters.account} connect=${counters.connect}`,
    );
    counters = { minuteKey: key, positions: 0, account: 0, connect: 0 };
  }
}

export function recordBrokerConnectCall(): void {
  bump("connect");
}

export function invalidateIbkrAccountPositionsCache(): void {
  invalidateCacheByPrefix("IBKR:SHARED:");
}

/**
 * Cached GET /api/ibkr/account — shared by capital, engine, dashboard, etc.
 * `loader` performs the real HTTP call (counted once per miss).
 */
export async function getCachedIbkrAccount<T>(loader: () => Promise<T>): Promise<T> {
  flushBrokerCallMetricsIfNeeded();
  return getOrSetCached(ACCOUNT_CACHE_KEY, IBKR_ACCOUNT_POSITIONS_TTL_MS, async () => {
    bump("account");
    return loader();
  });
}

/** Cached GET /api/ibkr/positions — shared by all consumers. */
export async function getCachedIbkrPositions<T>(loader: () => Promise<T>): Promise<T> {
  flushBrokerCallMetricsIfNeeded();
  return getOrSetCached(POSITIONS_CACHE_KEY, IBKR_ACCOUNT_POSITIONS_TTL_MS, async () => {
    bump("positions");
    return loader();
  });
}

let metricsTimer: ReturnType<typeof setInterval> | null = null;

/** Start periodic BrokerCalls log (idempotent). */
export function startBrokerCallMetricsLogger(): void {
  if (metricsTimer) return;
  metricsTimer = setInterval(() => flushBrokerCallMetricsIfNeeded(), 15_000);
  if (typeof metricsTimer === "object" && "unref" in metricsTimer) {
    metricsTimer.unref?.();
  }
}
