import "server-only";

import fs from "node:fs";
import path from "node:path";
import { forgeosCacheFile } from "@/lib/trading/crypto/forgeos-cache";
import { stocksInPlayRoundTripCostPct } from "@/lib/trading/stocks-in-play/cost-gate";
import type { StocksRunnerShadowSignal } from "@/lib/trading/stocks-in-play/runners/types";

const FILE = () => forgeosCacheFile("stocks-runners-shadow.json");

type ShadowFile = { signals: StocksRunnerShadowSignal[] };

function loadFile(): ShadowFile {
  try {
    const p = FILE();
    if (!fs.existsSync(p)) return { signals: [] };
    return JSON.parse(fs.readFileSync(p, "utf8")) as ShadowFile;
  } catch {
    return { signals: [] };
  }
}

function saveFile(body: ShadowFile): void {
  const p = FILE();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(body, null, 2), "utf8");
}

export function recordRunnerShadowSignal(
  sig: Omit<StocksRunnerShadowSignal, "at"> & { at?: string },
): void {
  const body = loadFile();
  body.signals.push({ ...sig, at: sig.at ?? new Date().toISOString() });
  if (body.signals.length > 800) body.signals = body.signals.slice(-800);
  saveFile(body);
}

export function resolveRunnerShadowMarks(marks: Map<string, number>): number {
  const body = loadFile();
  let n = 0;
  for (const s of body.signals) {
    if (s.closedAt) continue;
    const px = marks.get(s.symbol.trim().toUpperCase());
    if (!(px != null && px > 0)) continue;
    const rt = stocksInPlayRoundTripCostPct({ price: s.entry, qty: 1, spreadPct: s.spreadPct });
    s.closedAt = new Date().toISOString();
    s.exit = px;
    s.netPnlUsd = px - s.entry - s.entry * rt - (s.commissionUsd ?? 0);
    s.exitReason = "runner_shadow_mark";
    n += 1;
  }
  if (n > 0) saveFile(body);
  return n;
}

export function loadRunnerShadowWeeklyStats(sinceMs: number): {
  signals: number;
  closed: number;
  winRate: number;
  meanNetUsd: number;
} {
  const signals = loadFile().signals.filter((s) => Date.parse(s.at) >= sinceMs);
  const closed = signals.filter((s) => s.closedAt && s.netPnlUsd != null);
  const wins = closed.filter((s) => (s.netPnlUsd as number) > 0).length;
  const nets = closed.map((s) => s.netPnlUsd as number);
  return {
    signals: signals.length,
    closed: closed.length,
    winRate: closed.length ? wins / closed.length : 0,
    meanNetUsd: nets.length ? nets.reduce((a, b) => a + b, 0) / nets.length : 0,
  };
}
