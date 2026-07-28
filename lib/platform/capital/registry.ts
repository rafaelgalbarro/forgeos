/** Capital pillar — module capability registry. */

import type { PillarCapability } from "../shared/types";
import type { CapitalModuleId } from "./types";

const MODULE_META: Record<CapitalModuleId, { label: string; description: string }> = {
  "investor-pack": { label: "Investor Pack", description: "Curated materials for investors." },
  "data-room": { label: "Data Room", description: "Due diligence document repository." },
  "cap-table": { label: "Cap Table", description: "Ownership and equity structure." },
  valuation: { label: "Valuation", description: "Valuation models and scenarios." },
  "pitch-deck": { label: "Pitch Deck", description: "Investor presentation slides." },
  exit: { label: "Exit", description: "Exit scenario planning." },
  ipo: { label: "IPO", description: "IPO readiness assessment." },
  fundraising: { label: "Fundraising", description: "Active round tracking." },
};

const capabilities: PillarCapability[] = (
  Object.entries(MODULE_META) as [CapitalModuleId, { label: string; description: string }][]
).map(([id, meta]) => ({
  id,
  label: meta.label,
  description: meta.description,
  status: "scaffold" as const,
}));

export function listCapitalCapabilities(): PillarCapability[] {
  return [...capabilities];
}

export function getCapitalCapability(id: string): PillarCapability | undefined {
  return capabilities.find((c) => c.id === id);
}
