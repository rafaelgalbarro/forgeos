/** Strategy pillar — module capability registry. */

import type { PillarCapability } from "../shared/types";

const capabilities: PillarCapability[] = [
  {
    id: "discovery",
    label: "Discovery",
    description: "Idea classification, questions and definition risks.",
    status: "scaffold",
  },
  {
    id: "founder-advisor",
    label: "Founder Advisor",
    description: "Strategic risks, opportunities and founder questions.",
    status: "scaffold",
  },
  {
    id: "research",
    label: "Research",
    description: "Market and competitor research reports.",
    status: "scaffold",
  },
  {
    id: "simulator",
    label: "Venture Simulator",
    description: "Scenario modeling and venture scoring.",
    status: "scaffold",
  },
];

export function listStrategyCapabilities(): PillarCapability[] {
  return [...capabilities];
}

export function getStrategyCapability(id: string): PillarCapability | undefined {
  return capabilities.find((c) => c.id === id);
}
