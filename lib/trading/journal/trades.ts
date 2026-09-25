/**
 * Trade journal — real + shadow fills for strategy auto-tuning.
 * Path: .forgeos/journal/trades.jsonl
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";
import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";

const JOURNAL_DIR = path.join(process.cwd(), ".forgeos", "journal");
const JOURNAL_FILE = path.join(JOURNAL_DIR, "trades.jsonl");
const DISABLED_FILE = path.join(JOURNAL_DIR, "disabled-strategies.json");

export type JournalMarket = "stocks" | "crypto" | "forex";

export type JournalTrade = {
  at: string;
  market: JournalMarket;
  strategy: string;
  ticker: string;
  side: "BUY" | "SELL";
  entry: number;
  exit: number | null;
  exitReason: string | null;
  grossPnlUsd: number | null;
  costsUsd: number;
  netPnlUsd: number | null;
  rMultiple: number | null;
  durationMs: number | null;
  shadow: boolean;
  open?: boolean;
};

type DisabledMap = Record<string, { disabledAt: string; reason: string; trades: number; netPnl: number }>;

function ensureDir(): void {
  fs.mkdirSync(JOURNAL_DIR, { recursive: true });
}

export function appendJournalTrade(trade: JournalTrade): void {
  try {
    ensureDir();
    fs.appendFileSync(JOURNAL_FILE, `${JSON.stringify(trade)}\n`, "utf8");
  } catch (err) {
    console.warn("[Journal] append failed:", err instanceof Error ? err.message : err);
  }
}

export function readJournalTrades(limit = 5000): JournalTrade[] {
  try {
    if (!fs.existsSync(JOURNAL_FILE)) return [];
    const lines = fs.readFileSync(JOURNAL_FILE, "utf8").split("\n").filter(Boolean);
    const slice = lines.slice(-limit);
    const out: JournalTrade[] = [];
    for (const line of slice) {
      try {
        out.push(JSON.parse(line) as JournalTrade);
      } catch {
        /* skip */
      }
    }
    return out;
  } catch {
    return [];
  }
}

function loadDisabled(): DisabledMap {
  try {
    if (!fs.existsSync(DISABLED_FILE)) return {};
    return JSON.parse(fs.readFileSync(DISABLED_FILE, "utf8")) as DisabledMap;
  } catch {
    return {};
  }
}

function saveDisabled(map: DisabledMap): void {
  ensureDir();
  fs.writeFileSync(DISABLED_FILE, JSON.stringify(map, null, 2), "utf8");
}

export function isStrategyDisabled(market: JournalMarket, strategy: string): boolean {
  const key = `${market}:${strategy}`;
  return Boolean(loadDisabled()[key]);
}

export type StrategyStats = {
  market: JournalMarket;
  strategy: string;
  trades: number;
  wins: number;
  winRate: number;
  avgR: number | null;
  netPnlUsd: number;
};

export function computeStrategyStats(trades: readonly JournalTrade[] = readJournalTrades()): StrategyStats[] {
  const map = new Map<string, StrategyStats>();
  for (const t of trades) {
    if (t.open || t.exit == null || t.netPnlUsd == null) continue;
    const key = `${t.market}:${t.strategy}`;
    let row = map.get(key);
    if (!row) {
      row = {
        market: t.market,
        strategy: t.strategy,
        trades: 0,
        wins: 0,
        winRate: 0,
        avgR: null,
        netPnlUsd: 0,
      };
      map.set(key, row);
    }
    row.trades += 1;
    if (t.netPnlUsd > 0) row.wins += 1;
    row.netPnlUsd += t.netPnlUsd;
    if (t.rMultiple != null) {
      row.avgR = row.avgR == null ? t.rMultiple : (row.avgR * (row.trades - 1) + t.rMultiple) / row.trades;
    }
  }
  for (const row of map.values()) {
    row.winRate = row.trades > 0 ? row.wins / row.trades : 0;
  }
  return [...map.values()].sort((a, b) => b.netPnlUsd - a.netPnlUsd);
}

/** Disable strategies with ≥20 closed trades and negative net P&L. */
export async function autoDisableLosingStrategies(): Promise<StrategyStats[]> {
  const stats = computeStrategyStats();
  const disabled = loadDisabled();
  const newly: StrategyStats[] = [];
  for (const s of stats) {
    if (s.trades < 20 || !(s.netPnlUsd < 0)) continue;
    const key = `${s.market}:${s.strategy}`;
    if (disabled[key]) continue;
    disabled[key] = {
      disabledAt: new Date().toISOString(),
      reason: `P&L neto $${s.netPnlUsd.toFixed(2)} en ${s.trades} ops`,
      trades: s.trades,
      netPnl: s.netPnlUsd,
    };
    newly.push(s);
    void sendTelegramMessage(
      `⚠️ Estrategia desactivada: ${s.market}/${s.strategy} — ${s.trades} ops, P&L neto $${s.netPnlUsd.toFixed(2)}`,
    ).catch(() => undefined);
  }
  if (newly.length) saveDisabled(disabled);
  return newly;
}

export async function sendDailyStrategyTelegramReport(): Promise<void> {
  const stats = computeStrategyStats();
  const lines = [
    "📊 <b>Resumen estrategias (diario)</b>",
    ...stats.slice(0, 20).map(
      (s) =>
        `${s.market}/${s.strategy}: n=${s.trades} WR=${(s.winRate * 100).toFixed(0)}% ` +
        `avgR=${s.avgR != null ? s.avgR.toFixed(2) : "n/a"} net=$${s.netPnlUsd.toFixed(2)}`,
    ),
  ];
  if (stats.length === 0) lines.push("Sin operaciones cerradas en journal.");
  await sendTelegramMessage(lines.join("\n"));
  await autoDisableLosingStrategies();
}

let dailyReportTimer: ReturnType<typeof setInterval> | null = null;
let lastDailyReportDay = "";

/** Fire Telegram summary around 22:15 Europe/Madrid once per day. */
export function startDailyStrategyReportScheduler(): void {
  if (dailyReportTimer) return;
  const tick = () => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const y = parts.find((p) => p.type === "year")?.value;
    const mo = parts.find((p) => p.type === "month")?.value;
    const d = parts.find((p) => p.type === "day")?.value;
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
    const mi = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    const dayKey = `${y}-${mo}-${d}`;
    if (h === 22 && mi >= 15 && mi < 20 && lastDailyReportDay !== dayKey) {
      lastDailyReportDay = dayKey;
      void sendDailyStrategyTelegramReport().catch((err) => {
        console.warn("[Journal] daily report failed:", err instanceof Error ? err.message : err);
      });
    }
  };
  tick();
  dailyReportTimer = setInterval(tick, 60_000);
  if (typeof dailyReportTimer === "object" && "unref" in dailyReportTimer) {
    dailyReportTimer.unref?.();
  }
}
