/** CEO pillar — module capability registry. */

import type { PillarCapability } from "../shared/types";

const capabilities: PillarCapability[] = [
  {
    id: "executive-summary",
    label: "Executive Summary",
    description: "Portfolio-level executive overview.",
    status: "scaffold",
  },
  {
    id: "daily-briefing",
    label: "Daily Briefing",
    description: "CEO morning briefing and priorities.",
    status: "scaffold",
  },
  {
    id: "venture-review",
    label: "Venture Review",
    description: "Per-venture executive review.",
    status: "scaffold",
  },
  {
    id: "risk-analysis",
    label: "Risk Analysis",
    description: "Portfolio risk assessment.",
    status: "scaffold",
  },
  {
    id: "board-session",
    label: "Board Session",
    description: "AI board orchestration (future bridge).",
    status: "scaffold",
  },
];

export function listCeoCapabilities(): PillarCapability[] {
  return [...capabilities];
}

export function getCeoCapability(id: string): PillarCapability | undefined {
  return capabilities.find((c) => c.id === id);
}
