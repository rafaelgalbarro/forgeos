/** RC9 — Creator economy catalog (mock). */

import type { CreatorAssetType, CreatorListing } from "./types";

const CREATOR_CATALOG: CreatorListing[] = [
  {
    id: "creator-skill-hubspot-pro",
    assetType: "skill",
    title: "HubSpot Pro Automation Skill",
    description: "Skill avanzado de automatización HubSpot para ventures B2B.",
    creator: "Ana Martínez",
    priceLabel: "€15/mes",
    revenueSharePct: 70,
    rating: 4.7,
    salesCount: 234,
    status: "active",
    tags: ["hubspot", "automation", "b2b"],
  },
  {
    id: "creator-worker-sdr",
    assetType: "worker",
    title: "SDR Outreach Worker",
    description: "Worker de prospección outbound con playbooks integrados.",
    creator: "Growth Studio",
    priceLabel: "€25/mes",
    revenueSharePct: 65,
    rating: 4.5,
    salesCount: 156,
    status: "active",
    tags: ["sales", "outbound", "sdr"],
  },
  {
    id: "creator-dept-customer-success",
    assetType: "department",
    title: "Customer Success Department",
    description: "Departamento CS completo con workers y knowledge packs.",
    creator: "ForgeOS Partners",
    priceLabel: "€39/mes",
    revenueSharePct: 60,
    rating: 4.8,
    salesCount: 89,
    status: "beta",
    tags: ["cs", "retention", "support"],
  },
  {
    id: "creator-template-saas",
    assetType: "template",
    title: "SaaS MVP Template",
    description: "Template de producto SaaS con auth, billing y dashboard.",
    creator: "Build Labs",
    priceLabel: "€49",
    revenueSharePct: 75,
    rating: 4.6,
    salesCount: 412,
    status: "active",
    tags: ["saas", "template", "mvp"],
  },
  {
    id: "creator-knowledge-fundraising",
    assetType: "knowledge",
    title: "Fundraising Playbook ES",
    description: "Base de conocimiento para fundraising en España.",
    creator: "Venture Academy",
    priceLabel: "€19",
    revenueSharePct: 80,
    rating: 4.9,
    salesCount: 178,
    status: "active",
    tags: ["fundraising", "spain", "playbook"],
  },
  {
    id: "creator-playbook-gtm",
    assetType: "playbook",
    title: "GTM Launch Playbook",
    description: "Playbook de go-to-market para productos B2B SaaS.",
    creator: "GTM Collective",
    priceLabel: "€29",
    revenueSharePct: 70,
    rating: 4.4,
    salesCount: 203,
    status: "active",
    tags: ["gtm", "launch", "b2b"],
  },
  {
    id: "creator-biz-subscription",
    assetType: "business-model",
    title: "Subscription Business Model Pack",
    description: "Modelo de negocio por suscripción con pricing tiers.",
    creator: "BizForge",
    priceLabel: "€35",
    revenueSharePct: 65,
    rating: 4.3,
    salesCount: 67,
    status: "active",
    tags: ["subscription", "pricing", "business-model"],
  },
  {
    id: "creator-plugin-zapier",
    assetType: "plugin",
    title: "Zapier Bridge Plugin",
    description: "Plugin sandbox para conectar Zapier con ForgeOS.",
    creator: "Integrations Co",
    priceLabel: "€12/mes",
    revenueSharePct: 60,
    rating: 4.1,
    salesCount: 45,
    status: "sandbox",
    tags: ["zapier", "integration", "plugin"],
  },
];

export function listCreatorListings(assetType?: CreatorAssetType): CreatorListing[] {
  if (!assetType) return [...CREATOR_CATALOG];
  return CREATOR_CATALOG.filter((c) => c.assetType === assetType);
}

export function getCreatorListing(id: string): CreatorListing | undefined {
  return CREATOR_CATALOG.find((c) => c.id === id);
}

export function getCreatorEconomyStats(): {
  totalListings: number;
  totalSales: number;
  avgRevenueShare: number;
  byAssetType: Record<string, number>;
} {
  const totalSales = CREATOR_CATALOG.reduce((s, c) => s + c.salesCount, 0);
  const avgRevenueShare =
    CREATOR_CATALOG.length > 0
      ? Math.round(
          CREATOR_CATALOG.reduce((s, c) => s + c.revenueSharePct, 0) / CREATOR_CATALOG.length
        )
      : 0;
  const byAssetType: Record<string, number> = {};
  for (const c of CREATOR_CATALOG) {
    byAssetType[c.assetType] = (byAssetType[c.assetType] ?? 0) + 1;
  }
  return {
    totalListings: CREATOR_CATALOG.length,
    totalSales,
    avgRevenueShare,
    byAssetType,
  };
}

export function publishListingDraft(
  draft: Omit<CreatorListing, "id" | "salesCount" | "rating">
): CreatorListing {
  return {
    ...draft,
    id: `creator-draft-${Date.now()}`,
    salesCount: 0,
    rating: 0,
  };
}
