import "server-only";

import fs from "node:fs";
import path from "node:path";
import { forgeosCacheFile } from "@/lib/trading/crypto/forgeos-cache";
import type { StocksInPlayShadowSignal } from "@/lib/trading/stocks-in-play/types";
import { profitFactorFromNet } from "@/lib/trading/stocks-in-play/stats";

const FILE = () => forgeosCacheFile("stocks-in-play-shadow.json");

type ShadowFile = { signals: StocksInPlayShadowSignal[] };

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

export function recordInPlayShadowSignal(
  sig: Omit<StocksInPlayShadowSignal, "at"> & { at?: string },
): void {
  const body = loadFile();
  body.signals.push({ ...sig, at: sig.at ?? new Date().toISOString() });
  if (body.signals.length > 500) body.signals = body.signals.slice(-500);
  saveFile(body);
}

export function resolveInPlayShadowMarks(marks: Map<string, number>): number {
  const body = loadFile();
  let n = 0;
  for (const s of body.signals) {
    if (s.closedAt) continue;
    const px = marks.get(s.symbol.trim().toUpperCase());
    if (!(px != null && px > 0)) continue;
    s.closedAt = new Date().toISOString();
    s.exit = px;
    s.netPnlUsd = px - s.entry;
    s.exitReason = "shadow_mark";
    n += 1;
  }
  if (n > 0) saveFile(body);
  return n;
}

export function loadInPlayShadowStats(): {
  closed: number;
  meanNetUsd: number;
  profitFactor: number;
} {
  const closed = loadFile().signals.filter((s) => s.closedAt && s.netPnlUsd != null);
  const nets = closed.map((s) => s.netPnlUsd as number);
  return {
    closed: closed.length,
    meanNetUsd: nets.length ? nets.reduce((a, b) => a + b, 0) / nets.length : 0,
    profitFactor: profitFactorFromNet(nets),
  };
}
