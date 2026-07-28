/** Studio pillar — module capability registry. */

import type { PillarCapability } from "../shared/types";

const capabilities: PillarCapability[] = [
  {
    id: "portfolio",
    label: "Portfolio",
    description: "Multi-venture portfolio dashboard data.",
    status: "scaffold",
  },
  {
    id: "knowledge",
    label: "Knowledge",
    description: "Forge knowledge catalogs and worker scope.",
    status: "scaffold",
  },
  {
    id: "venture-studio",
    label: "Venture Studio",
    description: "Studio flow and venture lifecycle.",
    status: "scaffold",
  },
];

export function listStudioCapabilities(): PillarCapability[] {
  return [...capabilities];
}

export function getStudioCapability(id: string): PillarCapability | undefined {
  return capabilities.find((c) => c.id === id);
}
