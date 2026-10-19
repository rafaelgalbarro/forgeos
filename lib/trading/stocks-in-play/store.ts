import "server-only";

import fs from "node:fs";
import path from "node:path";
import { forgeosCacheFile } from "@/lib/trading/crypto/forgeos-cache";
import type { StocksInPlayDayList } from "@/lib/trading/stocks-in-play/types";

const FILE = () => forgeosCacheFile("stocks-in-play.json");

export function madridDayKey(at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const y = parts.find((p) => p.type === "year")?.value ?? "";
  const mo = parts.find((p) => p.type === "month")?.value ?? "";
  const d = parts.find((p) => p.type === "day")?.value ?? "";
  return `${y}-${mo}-${d}`;
}

export function saveStocksInPlayList(list: StocksInPlayDayList): void {
  const p = FILE();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(list, null, 2), "utf8");
}

export function loadStocksInPlayList(): StocksInPlayDayList | null {
  try {
    const p = FILE();
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf8")) as StocksInPlayDayList;
  } catch {
    return null;
  }
}

export function inPlaySymbolSet(at: Date = new Date()): Set<string> {
  const list = loadStocksInPlayList();
  if (!list || list.dayKey !== madridDayKey(at)) return new Set();
  return new Set(list.symbols.map((s) => s.symbol.trim().toUpperCase()));
}

export function isStocksInPlayTicker(symbol: string, at: Date = new Date()): boolean {
  return inPlaySymbolSet(at).has(symbol.trim().toUpperCase());
}
