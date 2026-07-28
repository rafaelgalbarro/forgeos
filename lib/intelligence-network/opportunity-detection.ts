/** Program 9000 — Opportunity signal detection. */

import { buildOpportunities } from "@/lib/network/opportunity-network";
import type { OpportunitySignal } from "./types";
import type { NetworkContext } from "@/lib/network/types";
import { DEMO_DISCLAIMER } from "@/lib/network/types";

const SIGNAL_TYPES: OpportunitySignal["signalType"][] = [
  "market",
  "pricing",
  "product",
  "expansion",
];

export function detectOpportunities(ctx: NetworkContext): OpportunitySignal[] {
  const base = buildOpportunities(ctx);
  return base.map((opp, i) => ({
    ...opp,
    signalType: SIGNAL_TYPES[i % SIGNAL_TYPES.length],
    disclaimer: DEMO_DISCLAIMER,
  }));
}

export function getTopOpportunity(opportunities: OpportunitySignal[]): OpportunitySignal | null {
  if (opportunities.length === 0) return null;
  return [...opportunities].sort((a, b) => b.matchScore - a.matchScore)[0];
}
