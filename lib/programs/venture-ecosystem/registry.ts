/** Venture Ecosystem — capability registry. */

import type { ProgramCapability } from "../shared";

const capabilities: ProgramCapability[] = [
  {
    id: "capital",
    label: "Capital",
    description: "Investor pack, data room, cap table y fundraising.",
    status: "scaffold",
  },
  {
    id: "marketplace",
    label: "Marketplace",
    description: "Marketplace de ventures, templates y servicios.",
    status: "scaffold",
  },
];

export function listVentureEcosystemCapabilities(): ProgramCapability[] {
  return [...capabilities];
}
