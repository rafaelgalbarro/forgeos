/**
 * Per-fast-strategy metrics for daily Telegram (22:00 Madrid).
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";
import {
  FAST_CRYPTO_STRATEGY_IDS,
  type FastCryptoStrategyId,
} from "@/lib/trading/crypto/strategies/types";
import { readCryptoJournal } from "@/lib/trading/crypto/journal-crypto";

function forgeosRoot(): string {
  return process.env.FORGEOS_ROOT?.trim() || process.cwd();
}

function FILE(): string {
  return path.join(forgeosRoot(), ".forgeos", "cache", "kraken-fast-metrics.json");
}

function madridDayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export type FastStrategyMetrics = {
  strategy: FastCryptoStrategyId;
  tradesDay: number;
  wins: number;
  winRate: number;
  meanNetPct: number;
  meanHoldMs: number;
  postOnlyUnfilled: number;
  postOnlyAttempts: number;
  pctPostOnlyUnfilled: number;
};

type Store = {
  dayKey: string;
  byStrategy: Record<
    string,
    {
      unfilled: number;
      attempts: number;
    }
  >;
};

function load(): Store {
  try {
    if (fs.existsSync(FILE())) {
      return JSON.parse(fs.readFileSync(FILE(), "utf8")) as Store;
    }
  } catch {
    /* ignore */
  }
  return { dayKey: "", byStrategy: {} };
}

function save(s: Store): void {
  try {
    fs.mkdirSync(path.dirname(FILE()), { recursive: true });
    fs.writeFileSync(FILE(), JSON.stringify(s, null, 2), "utf8");
  } catch {
    /* ignore */
  }
}

function roll(s: Store): Store {
  const day = madridDayKey();
  if (s.dayKey !== day) {
    s.dayKey = day;
    s.byStrategy = {};
  }
  return s;
}

export function recordFastPostOnlyAttempt(
  strategy: string,
  filled: boolean,
): void {
  const s = roll(load());
  const row = s.byStrategy[strategy] ?? { unfilled: 0, attempts: 0 };
  row.attempts += 1;
  if (!filled) row.unfilled += 1;
  s.byStrategy[strategy] = row;
  save(s);
}

export function computeFastStrategyMetrics(
  now = new Date(),
): FastStrategyMetrics[] {
  const day = madridDayKey(now);
  const store = roll(load());
  const dayStart = Date.parse(`${day}T00:00:00+02:00`); // approx Madrid
  const trades = readCryptoJournal(20_000).filter((t) => {
    if (t.shadow) return false;
    if (!FAST_CRYPTO_STRATEGY_IDS.includes(t.strategy as FastCryptoStrategyId)) {
      return false;
    }
    const at = Date.parse(t.at);
    return Number.isFinite(at) && at >= dayStart - 2 * 3600_000;
  });

  return FAST_CRYPTO_STRATEGY_IDS.map((strategy) => {
    const sells = trades.filter(
      (t) => t.strategy === strategy && t.side === "SELL" && t.netPnlEur != null,
    );
    const wins = sells.filter((t) => (t.netPnlEur ?? 0) > 0).length;
    const nets = sells
      .map((t) => t.netPct)
      .filter((n): n is number => n != null && Number.isFinite(n));
    const holds = sells
      .map((t) => t.durationMs)
      .filter((n): n is number => n != null && Number.isFinite(n));
    const meta = store.byStrategy[strategy] ?? { unfilled: 0, attempts: 0 };
    return {
      strategy,
      tradesDay: sells.length,
      wins,
      winRate: sells.length ? wins / sells.length : 0,
      meanNetPct: nets.length
        ? nets.reduce((a, b) => a + b, 0) / nets.length
        : 0,
      meanHoldMs: holds.length
        ? holds.reduce((a, b) => a + b, 0) / holds.length
        : 0,
      postOnlyUnfilled: meta.unfilled,
      postOnlyAttempts: meta.attempts,
      pctPostOnlyUnfilled:
        meta.attempts > 0 ? meta.unfilled / meta.attempts : 0,
    };
  });
}

export function formatFastMetricsTelegramLines(): string[] {
  const rows = computeFastStrategyMetrics();
  const lines = ["⚡ <b>Fast 1-5m</b>"];
  for (const r of rows) {
    lines.push(
      `${r.strategy}: n=${r.tradesDay} WR=${(r.winRate * 100).toFixed(0)}% ` +
        `net=${r.meanNetPct.toFixed(2)}% hold=${(r.meanHoldMs / 60_000).toFixed(1)}m ` +
        `unfill=${(r.pctPostOnlyUnfilled * 100).toFixed(0)}%`,
    );
  }
  return lines;
}
