/** Intelligence pillar — module capability registry. */

import type { PillarCapability } from "../shared/types";

const capabilities: PillarCapability[] = [
  {
    id: "decision-engine",
    label: "Decision Engine",
    description: "Venture decision tracking and impact.",
    status: "scaffold",
  },
  {
    id: "pattern-engine",
    label: "Pattern Engine",
    description: "Cross-venture pattern detection.",
    status: "scaffold",
  },
  {
    id: "learning-engine",
    label: "Learning Engine",
    description: "Founder and venture learning snapshots.",
    status: "scaffold",
  },
  {
    id: "memory",
    label: "Memory",
    description: "Venture, portfolio and CEO memory.",
    status: "scaffold",
  },
  {
    id: "insights",
    label: "Insights",
    description: "Actionable intelligence insights.",
    status: "scaffold",
  },
  {
    id: "recommendations",
    label: "Recommendations",
    description: "Prioritized venture recommendations.",
    status: "scaffold",
  },
];

export function listIntelligenceCapabilities(): PillarCapability[] {
  return [...capabilities];
}

export function getIntelligenceCapability(id: string): PillarCapability | undefined {
  return capabilities.find((c) => c.id === id);
}
