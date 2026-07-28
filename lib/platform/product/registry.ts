/** Product pillar — module capability registry. */

import type { PillarCapability } from "../shared/types";

const capabilities: PillarCapability[] = [
  {
    id: "prd",
    label: "Product PRD",
    description: "Product requirements document generation.",
    status: "scaffold",
  },
  {
    id: "roadmap",
    label: "Roadmap",
    description: "Phased product roadmap from PRD.",
    status: "scaffold",
  },
  {
    id: "ux",
    label: "UX",
    description: "Wireframes, UX patterns and landing structure.",
    status: "scaffold",
  },
  {
    id: "mvp",
    label: "MVP",
    description: "Minimum viable product scope definition.",
    status: "scaffold",
  },
];

export function listProductCapabilities(): PillarCapability[] {
  return [...capabilities];
}

export function getProductCapability(id: string): PillarCapability | undefined {
  return capabilities.find((c) => c.id === id);
}
