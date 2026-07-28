/** Program 7000 — Launch hub aggregator */

import { CHANGELOG, PUBLIC_ROADMAP } from "@/lib/launch";
import { isLaunchMode, FORGEOS_LAUNCH_VERSION } from "./config";
import { listMarketingSections } from "./marketing-website";
import { getLaunchPricingSummary } from "./pricing-final";
import { getPublicDocsStats } from "./public-docs";
import { listPublicSdkLinks } from "./public-sdk";
import { listPublicApiDocs, getPublicApiVersion } from "./public-api-docs";
import { listMarketplacePreview } from "./marketplace-public";
import { listLaunchKnowledgeBase } from "./knowledge-base";
import { listVideoTutorials } from "./video-tutorials";
import { PRODUCT_TOUR_STEPS } from "./product-tour";
import { DEMO_MODE_CONFIG, listDemoScenarios } from "./interactive-demo";
import { listCaseStudies } from "./case-studies";
import { listCommunityChannels } from "./community";
import { getLegalHubLinks } from "./legal-hub";
import type { LaunchHubData, LaunchHubLink } from "./types";

export const PRIMARY_LAUNCH_LINKS: LaunchHubLink[] = [
  {
    id: "landing",
    label: "Landing RC12",
    href: "/landing",
    description: "Página de marketing original de la beta privada.",
    badge: "RC12",
  },
  {
    id: "pricing",
    label: "Precios",
    href: "/pricing",
    description: "Planes Starter, Pro, Business y Enterprise.",
  },
  {
    id: "docs",
    label: "Documentación",
    href: "/docs",
    description: "Guías, quickstart y referencia de producto.",
  },
  {
    id: "demo",
    label: "Demo interactiva",
    href: "/demo",
    description: "Tour de producto y escenarios de exploración.",
    badge: "Nuevo",
  },
  {
    id: "community",
    label: "Comunidad",
    href: "/community",
    description: "Foro, soporte y canales comunitarios.",
  },
  {
    id: "changelog",
    label: "Changelog",
    href: "/changelog",
    description: "Historial de versiones y novedades.",
  },
  {
    id: "status",
    label: "Estado del sistema",
    href: "/status",
    description: "Monitorización de servicios ForgeOS.",
  },
  {
    id: "support",
    label: "Soporte",
    href: "/support",
    description: "Centro de ayuda, waitlist e invitaciones.",
  },
];

export function getLaunchHubData(): LaunchHubData {
  const pricing = getLaunchPricingSummary();
  const docsStats = getPublicDocsStats();

  return {
    version: FORGEOS_LAUNCH_VERSION,
    title: "ForgeOS 1.0 — Launch Hub",
    tagline: "Superficies públicas de producto, marketing y documentación para el lanzamiento oficial.",
    launchMode: isLaunchMode(),
    primaryLinks: PRIMARY_LAUNCH_LINKS,
    marketingSections: listMarketingSections(),
    stats: [
      { label: "Versión", value: FORGEOS_LAUNCH_VERSION },
      { label: "Planes", value: String(pricing.planCount) },
      { label: "Desde", value: pricing.startingPrice },
      { label: "Artículos docs", value: String(docsStats.articles) },
    ],
  };
}

export function getFullLaunchSnapshot() {
  return {
    hub: getLaunchHubData(),
    changelog: CHANGELOG,
    roadmap: PUBLIC_ROADMAP,
    pricing: getLaunchPricingSummary(),
    docs: getPublicDocsStats(),
    sdk: listPublicSdkLinks(),
    api: { version: getPublicApiVersion(), endpoints: listPublicApiDocs() },
    marketplace: listMarketplacePreview(),
    knowledgeBase: listLaunchKnowledgeBase(),
    videos: listVideoTutorials(),
    tour: PRODUCT_TOUR_STEPS,
    demo: { config: DEMO_MODE_CONFIG, scenarios: listDemoScenarios() },
    caseStudies: listCaseStudies(),
    community: listCommunityChannels(),
    legal: getLegalHubLinks(),
  };
}
