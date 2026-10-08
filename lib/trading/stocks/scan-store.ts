/**
 * Persist last stocks opportunity scan for dashboard + Telegram digests.
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), ".forgeos", "cache", "stocks-opportunity-scan.json");

export type OpportunityComponentScores = {
  trend: number;
  levels: number;
  momentum: number;
  patterns: number;
  relativeStrength: number;
};

export type ScoredOpportunity = {
  symbol: string;
  market: "US" | "EU";
  currency: "USD" | "EUR";
  price: number;
  score: number;
  components: OpportunityComponentScores;
  entry: number;
  stop: number;
  target: number;
  riskReward: number;
  expectedMovePct: number;
  roundTripCostPct: number;
  rationale: string[];
  indicators: Record<string, number | string | boolean | null>;
  passedSelection: boolean;
  rejectReason?: string;
  /** Shares sized at 1% account risk, capped by available cash. */
  suggestedShares?: number;
  suggestedNotional?: number;
};

export type StocksOpportunityScan = {
  at: string;
  window: { usOpen: boolean; euOpen: boolean };
  cashUsd: number;
  cashEur: number;
  screened: number;
  prefiltered: number;
  analyzed: number;
  selected: ScoredOpportunity[];
  top10: ScoredOpportunity[];
  allAnalyzed: ScoredOpportunity[];
};

export function saveStocksOpportunityScan(scan: StocksOpportunityScan): void {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(scan, null, 2), "utf8");
  } catch (err) {
    console.warn(
      "[StocksScan] save failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

export function loadStocksOpportunityScan(): StocksOpportunityScan | null {
  try {
    if (!fs.existsSync(FILE)) return null;
    return JSON.parse(fs.readFileSync(FILE, "utf8")) as StocksOpportunityScan;
  } catch {
    return null;
  }
}
