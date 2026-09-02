/**
 * Ticker blacklist after 3 consecutive losing closes — 7 calendar days out.
 */

import "server-only";

import { listTrades } from "@/lib/db/database";

const CONSECUTIVE_LOSSES = 3;
const BLACKLIST_DAYS = 7;

function normalize(symbol: string): string {
  return symbol.trim().toUpperCase();
}

/** Returns true when ticker is blocked by loss-streak rule. */
export function isLossStreakBlacklisted(symbol: string): boolean {
  const key = normalize(symbol);
  const trades = listTrades(200).filter((t) => normalize(t.symbol) === key);
  if (trades.length === 0) return false;

  const closed = trades.filter((t) => {
    const side = t.side.toUpperCase();
    const kind = (t.kind ?? "").toUpperCase();
    return side === "SELL" || kind.includes("CLOSE") || kind.includes("SL") || kind.includes("TP");
  });
  if (closed.length === 0) return false;

  let streak = 0;
  let streakEndMs: number | null = null;
  for (const t of closed) {
    const pnl = Number(t.pnl) || 0;
    if (pnl < 0) {
      streak += 1;
      streakEndMs = Date.parse(t.timestamp) || streakEndMs;
      if (streak >= CONSECUTIVE_LOSSES) break;
    } else if (pnl > 0) {
      break;
    }
  }

  if (streak < CONSECUTIVE_LOSSES || streakEndMs == null) return false;
  const expiry = streakEndMs + BLACKLIST_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() < expiry;
}
