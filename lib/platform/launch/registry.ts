/** Launch pillar — module capability registry. */

import type { PillarCapability } from "../shared/types";
import type { LaunchModuleId } from "./types";

const MODULE_LABELS: Record<LaunchModuleId, { label: string; description: string }> = {
  branding: { label: "Branding", description: "Logo, palette, typography and voice." },
  landing: { label: "Landing", description: "Landing page structure and CTA." },
  seo: { label: "SEO", description: "Search engine optimization plan." },
  aso: { label: "ASO", description: "App store optimization." },
  marketing: { label: "Marketing", description: "Channel planning and campaigns." },
  email: { label: "Email", description: "Email sequences and newsletters." },
  social: { label: "Social", description: "Social media content plan." },
  analytics: { label: "Analytics", description: "Event tracking and dashboards." },
  store: { label: "Store", description: "App store listings." },
  docs: { label: "Docs", description: "User and API documentation." },
};

const capabilities: PillarCapability[] = (
  Object.entries(MODULE_LABELS) as [LaunchModuleId, { label: string; description: string }][]
).map(([id, meta]) => ({
  id,
  label: meta.label,
  description: meta.description,
  status: "scaffold" as const,
}));

export function listLaunchCapabilities(): PillarCapability[] {
  return [...capabilities];
}

export function getLaunchCapability(id: string): PillarCapability | undefined {
  return capabilities.find((c) => c.id === id);
}
