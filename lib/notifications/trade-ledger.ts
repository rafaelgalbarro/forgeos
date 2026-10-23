/**
 * Day ledger of the real buy/sell messages sent to Telegram (one JSON line per message),
 * used by the daily summary. File: .forgeos/telegram-trades/YYYY-MM-DD.jsonl (Madrid day).
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";

export type LedgerRow = { at: string; platform: string | null; text: string };

function dir(): string {
  const d = path.join(process.env.FORGEOS_ROOT || process.cwd(), ".forgeos", "telegram-trades");
  fs.mkdirSync(d, { recursive: true });
  return d;
}

export function madridDay(at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

export function recordTradeMessage(platform: string | null, text: string): void {
  const row: LedgerRow = { at: new Date().toISOString(), platform, text: text.replace(/<[^>]+>/g, "") };
  fs.appendFileSync(path.join(dir(), `${madridDay()}.jsonl`), JSON.stringify(row) + "\n", "utf8");
}

export function readTradeMessages(day: string = madridDay()): LedgerRow[] {
  try {
    return fs
      .readFileSync(path.join(dir(), `${day}.jsonl`), "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as LedgerRow);
  } catch {
    return [];
  }
}
