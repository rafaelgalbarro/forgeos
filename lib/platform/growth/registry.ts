/** Growth pillar — module capability registry. */

import type { PillarCapability } from "../shared/types";
import type { GrowthModuleId } from "./types";

const MODULE_META: Record<GrowthModuleId, { label: string; description: string }> = {
  "growth-engine": { label: "Growth Engine", description: "Orchestration of growth loops." },
  cac: { label: "CAC", description: "Customer acquisition cost by channel." },
  ltv: { label: "LTV", description: "Lifetime value and payback metrics." },
  funnels: { label: "Funnels", description: "Conversion funnel analysis." },
  experiments: { label: "Experiments", description: "A/B tests and hypothesis tracking." },
  crm: { label: "CRM", description: "Contact and pipeline management." },
  retention: { label: "Retention", description: "Cohort retention and churn." },
  referrals: { label: "Referrals", description: "Referral program mechanics." },
  "pricing-optimization": { label: "Pricing", description: "Pricing experiments and tiers." },
};

const capabilities: PillarCapability[] = (
  Object.entries(MODULE_META) as [GrowthModuleId, { label: string; description: string }][]
).map(([id, meta]) => ({
  id,
  label: meta.label,
  description: meta.description,
  status: "scaffold" as const,
}));

export function listGrowthCapabilities(): PillarCapability[] {
  return [...capabilities];
}

export function getGrowthCapability(id: string): PillarCapability | undefined {
  return capabilities.find((c) => c.id === id);
}
