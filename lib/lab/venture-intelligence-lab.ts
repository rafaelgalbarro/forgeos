/** RC8 — Venture Intelligence lab harness. */

import {
  buildDemoVentureIntelligenceSnapshot,
  createDemoVentureInputs,
} from "@/lib/venture-intelligence";
import type { VentureIntelligenceSnapshot } from "@/lib/venture-intelligence/types";

export interface VentureIntelligenceLabSnapshot {
  engineCount: number;
  engines: string[];
  demo: VentureIntelligenceSnapshot;
  dryRunOnly: true;
}

const ENGINES = [
  "venture-scoring",
  "valuation-engine",
  "runway-engine",
  "burn-rate-engine",
  "forecast-engine",
  "fundraising-engine",
  "investment-engine",
  "investor-room",
  "due-diligence-engine",
  "growth-score",
  "market-score",
  "execution-score",
  "risk-engine",
  "exit-strategy",
  "ma-engine",
  "benchmark-engine",
];

export function runVentureIntelligenceLab(): VentureIntelligenceLabSnapshot {
  const inputs = createDemoVentureInputs();
  void inputs;
  const demo = buildDemoVentureIntelligenceSnapshot();

  return {
    engineCount: ENGINES.length,
    engines: ENGINES,
    demo,
    dryRunOnly: true,
  };
}
