import "server-only";

import fs from "node:fs";
import path from "node:path";
import type { EnhancedOpportunity } from "@/lib/market-data/types";

const CACHE_DIR = path.resolve(process.cwd(), ".forgeos", "cache");
const RESULTS_FILE = path.join(CACHE_DIR, "multi-scanner-results.json");

export type MultiScannerPhaseResult = {
  phase: 1 | 2 | 3;
  ticker: string;
  score?: number;
  rsi?: number | null;
  changePct?: number;
  relativeVolume?: number;
  direction?: "BUY" | "SELL" | "HOLD";
  reasoning?: string;
  patternName?: string;
  confidence?: number;
  entry?: number;
  stopLoss?: number;
  takeProfit?: number;
};

export type MultiScannerSnapshot = {
  scannedAt: string;
  scanDurationMs: number;
  universeSize: number;
  phase1Count: number;
  phase2Count: number;
  phase3Count: number;
  opportunities: EnhancedOpportunity[];
  phases: MultiScannerPhaseResult[];
  errors: string[];
};

export function readMultiScannerResults(): MultiScannerSnapshot | null {
  try {
    if (!fs.existsSync(RESULTS_FILE)) return null;
    return JSON.parse(fs.readFileSync(RESULTS_FILE, "utf8")) as MultiScannerSnapshot;
  } catch {
    return null;
  }
}

export function writeMultiScannerResults(snapshot: MultiScannerSnapshot): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(snapshot, null, 2), "utf8");
}
