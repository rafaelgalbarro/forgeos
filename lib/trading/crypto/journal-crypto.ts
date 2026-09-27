/**
 * Crypto trade journal — .forgeos/journal/crypto-trades.jsonl
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";
import type { CryptoStrategyId } from "@/lib/trading/crypto/strategies/types";
import type { MarketRegime } from "@/lib/trading/crypto/regime";

const DIR = path.join(process.cwd(), ".forgeos", "journal");
const FILE = path.join(DIR, "crypto-trades.jsonl");
const DISABLED = path.join(DIR, "crypto-disabled-strategies.json");

export type CryptoJournalTrade = {
  at: string;
  strategy: CryptoStrategyId | string;
  pair: string;
  regime: MarketRegime | string;
  side: "BUY" | "SELL";
  entry: number;
  exit: number | null;
  exitReason: string | null;
  grossPnlEur: number | null;
  feesEur: number;
  netPnlEur: number | null;
  durationMs: number | null;
  mfePct: number | null;
  maePct: number | null;
  shadow: boolean;
  open?: boolean;
  rMultiple?: number | null;
};

export type StrategyPerf = {
  strategy: string;
  trades: number;
  wins: number;
  winRate: number;
  avgR: number | null;
  profitFactor: number | null;
  netPnlEur: number;
  maxDrawdownEur: number;
  shadowTrades: number;
  shadowNetPnlEur: number;
  live: boolean;
};

function ensure(): void {
  fs.mkdirSync(DIR, { recursive: true });
}

export function appendCryptoJournal(trade: CryptoJournalTrade): void {
  try {
    ensure();
    fs.appendFileSync(FILE, `${JSON.stringify(trade)}\n`, "utf8");
  } catch (err) {
    console.warn("[CryptoJournal]", err instanceof Error ? err.message : err);
  }
}

export function readCryptoJournal(limit = 8000): CryptoJournalTrade[] {
  try {
    if (!fs.existsSync(FILE)) return [];
    const lines = fs.readFileSync(FILE, "utf8").split("\n").filter(Boolean);
    return lines.slice(-limit).map((l) => JSON.parse(l) as CryptoJournalTrade);
  } catch {
    return [];
  }
}

type DisabledMap = Record<string, { disabledAt: string; reason: string }>;

function loadDisabled(): DisabledMap {
  try {
    if (!fs.existsSync(DISABLED)) return {};
    return JSON.parse(fs.readFileSync(DISABLED, "utf8")) as DisabledMap;
  } catch {
    return {};
  }
}

function saveDisabled(m: DisabledMap): void {
  ensure();
  fs.writeFileSync(DISABLED, JSON.stringify(m, null, 2), "utf8");
}

export function isCryptoStrategyLiveDisabled(strategy: string): boolean {
  return Boolean(loadDisabled()[strategy]);
}

export function computeCryptoStrategyPerf(
  trades: readonly CryptoJournalTrade[] = readCryptoJournal(),
): StrategyPerf[] {
  const map = new Map<string, StrategyPerf & { grossWin: number; grossLoss: number; equity: number; peak: number }>();
  for (const t of trades) {
    if (t.side !== "SELL" || t.netPnlEur == null) continue;
    let row = map.get(t.strategy);
    if (!row) {
      row = {
        strategy: t.strategy,
        trades: 0,
        wins: 0,
        winRate: 0,
        avgR: null,
        profitFactor: null,
        netPnlEur: 0,
        maxDrawdownEur: 0,
        shadowTrades: 0,
        shadowNetPnlEur: 0,
        live: !isCryptoStrategyLiveDisabled(t.strategy),
        grossWin: 0,
        grossLoss: 0,
        equity: 0,
        peak: 0,
      };
      map.set(t.strategy, row);
    }
    if (t.shadow) {
      row.shadowTrades += 1;
      row.shadowNetPnlEur += t.netPnlEur;
      continue;
    }
    row.trades += 1;
    row.netPnlEur += t.netPnlEur;
    if (t.netPnlEur > 0) {
      row.wins += 1;
      row.grossWin += t.netPnlEur;
    } else {
      row.grossLoss += Math.abs(t.netPnlEur);
    }
    if (t.rMultiple != null) {
      row.avgR =
        row.avgR == null
          ? t.rMultiple
          : (row.avgR * (row.trades - 1) + t.rMultiple) / row.trades;
    }
    row.equity += t.netPnlEur;
    row.peak = Math.max(row.peak, row.equity);
    row.maxDrawdownEur = Math.max(row.maxDrawdownEur, row.peak - row.equity);
  }
  const out: StrategyPerf[] = [];
  for (const row of map.values()) {
    row.winRate = row.trades > 0 ? row.wins / row.trades : 0;
    row.profitFactor =
      row.grossLoss > 0 ? row.grossWin / row.grossLoss : row.grossWin > 0 ? Infinity : null;
    row.live = !isCryptoStrategyLiveDisabled(row.strategy);
    const { grossWin: _g, grossLoss: _l, equity: _e, peak: _p, ...rest } = row;
    void _g;
    void _l;
    void _e;
    void _p;
    out.push(rest);
  }
  return out.sort((a, b) => b.netPnlEur - a.netPnlEur);
}

/** Reliability score for ranking (1 = neutral). */
export function strategyReliabilityMap(): Partial<Record<string, number>> {
  const perfs = computeCryptoStrategyPerf();
  const map: Record<string, number> = {};
  for (const p of perfs) {
    if (p.trades < 5) {
      map[p.strategy] = 1;
      continue;
    }
    const pf = p.profitFactor == null || !Number.isFinite(p.profitFactor) ? 1 : p.profitFactor;
    map[p.strategy] = Math.max(0.2, Math.min(2, pf));
    if (isCryptoStrategyLiveDisabled(p.strategy)) map[p.strategy] = -1; // force shadow
  }
  return map;
}

export function autoTuneCryptoStrategies(): string[] {
  const msgs: string[] = [];
  const disabled = loadDisabled();
  for (const p of computeCryptoStrategyPerf()) {
    if (p.trades >= 20 && (p.netPnlEur < 0 || (p.profitFactor != null && p.profitFactor < 1))) {
      if (!disabled[p.strategy]) {
        disabled[p.strategy] = {
          disabledAt: new Date().toISOString(),
          reason: `PF=${p.profitFactor?.toFixed(2) ?? "n/a"} net=€${p.netPnlEur.toFixed(2)} n=${p.trades}`,
        };
        msgs.push(`⚠️ Estrategia ${p.strategy} → shadow (${disabled[p.strategy].reason})`);
      }
    }
    // Reactivate if shadow profitable with 30+ shadow trades
    if (disabled[p.strategy] && p.shadowTrades >= 30 && p.shadowNetPnlEur > 0) {
      delete disabled[p.strategy];
      msgs.push(`✅ Estrategia ${p.strategy} reactivada (shadow +€${p.shadowNetPnlEur.toFixed(2)})`);
    }
  }
  saveDisabled(disabled);
  return msgs;
}

export function journalOpenCryptoPairs(): Set<string> {
  const open = new Set<string>();
  for (const t of readCryptoJournal()) {
    if (t.shadow) continue;
    const p = t.pair.toUpperCase();
    if (t.side === "BUY") open.add(p);
    if (t.side === "SELL") open.delete(p);
  }
  return open;
}
