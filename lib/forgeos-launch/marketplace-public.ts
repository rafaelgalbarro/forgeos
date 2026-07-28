/** Program 7000 — Public marketplace preview */

import type { MarketplacePreviewItem } from "./types";

export const MARKETPLACE_PREVIEW_ITEMS: MarketplacePreviewItem[] = [
  {
    id: "venture-templates",
    name: "Venture Templates Pack",
    category: "Templates",
    summary: "Plantillas preconfiguradas para SaaS, marketplace y servicios.",
    author: "ForgeOS",
    href: "/marketplace",
  },
  {
    id: "brand-engine",
    name: "Brand Engine Pro",
    category: "Skills",
    summary: "Generación de identidad visual y copy de marca.",
    author: "Forge Labs",
    href: "/marketplace",
  },
  {
    id: "analytics-dashboard",
    name: "Portfolio Analytics",
    category: "Analytics",
    summary: "Dashboards ejecutivos para portfolios de ventures.",
    author: "Community",
    href: "/store",
  },
  {
    id: "capital-lab",
    name: "Forge Capital Connector",
    category: "Capital",
    summary: "Integración con flujos de fundraising y métricas.",
    author: "ForgeOS",
    href: "/marketplace",
  },
];

export function listMarketplacePreview(): MarketplacePreviewItem[] {
  return MARKETPLACE_PREVIEW_ITEMS;
}
