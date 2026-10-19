import "server-only";

import fs from "node:fs";
import path from "node:path";
import { forgeosCacheFile } from "@/lib/trading/crypto/forgeos-cache";
import { madridDayKey } from "@/lib/trading/stocks-in-play/store";
import type { StocksRunnersDayList } from "@/lib/trading/stocks-in-play/runners/types";

const FILE = () => forgeosCacheFile("stocks-runners.json");

export function saveStocksRunnersList(list: StocksRunnersDayList): void {
  const p = FILE();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(list, null, 2), "utf8");
}

export function loadStocksRunnersList(): StocksRunnersDayList | null {
  try {
    const p = FILE();
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf8")) as StocksRunnersDayList;
  } catch {
    return null;
  }
}

export function runnersSymbolSet(at: Date = new Date()): Set<string> {
  const list = loadStocksRunnersList();
  if (!list || list.dayKey !== madridDayKey(at)) return new Set();
  return new Set(list.symbols.map((s) => s.symbol.trim().toUpperCase()));
}

export function isStocksRunnerTicker(symbol: string, at: Date = new Date()): boolean {
  return runnersSymbolSet(at).has(symbol.trim().toUpperCase());
}
