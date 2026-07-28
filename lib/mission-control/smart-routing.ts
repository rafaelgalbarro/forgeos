/** Smart routing to existing factory adapters. */

import type { FactoryRouteResult, IntentionType } from "./types";

const ROUTES: Record<IntentionType, { href: string; label: string }> = {
  VENTURE: { href: "/founder", label: "Founder Zero" },
  WEBSITE: { href: "/website-factory", label: "Website Factory" },
  APPLICATION: { href: "/application-factory", label: "Application Factory" },
  MOBILE: { href: "/mobile-factory", label: "Mobile Factory" },
  DISCOVERY: { href: "/mission-control", label: "Mission Control" },
};

export function resolveFactoryRoute(intention: IntentionType, projectId?: string): FactoryRouteResult {
  const base = ROUTES[intention];
  const href = projectId ? `${base.href}/${projectId}` : base.href;
  return { factory: intention, href, projectId, label: base.label };
}

export async function routeToFactory(
  intention: IntentionType,
  idea: string
): Promise<FactoryRouteResult> {
  switch (intention) {
    case "VENTURE": {
      const { createFounderMission } = await import("./adapters/founder-adapter");
      const result = await createFounderMission(idea);
      return { factory: "VENTURE", href: result.href, label: "Founder Zero" };
    }
    case "WEBSITE": {
      const { createWebsiteMission } = await import("./adapters/website-factory-adapter");
      const result = await createWebsiteMission(idea);
      return resolveFactoryRoute("WEBSITE", result.projectId);
    }
    case "APPLICATION": {
      const { createApplicationMission } = await import("./adapters/application-factory-adapter");
      const result = await createApplicationMission(idea);
      return resolveFactoryRoute("APPLICATION", result.projectId);
    }
    case "MOBILE": {
      const { createMobileMission } = await import("./adapters/mobile-factory-adapter");
      const result = await createMobileMission(idea);
      return resolveFactoryRoute("MOBILE", result.projectId);
    }
    default:
      return resolveFactoryRoute(intention);
  }
}

export function factoryProgressSteps(intention: IntentionType): string[] {
  switch (intention) {
    case "VENTURE":
      return ["CEO analizando", "Research", "CTO", "CMO", "CFO", "Legal"];
    case "WEBSITE":
      return ["CEO analizando", "Research", "CMO", "Brand", "Deploy"];
    case "APPLICATION":
      return ["CEO analizando", "Research", "CTO", "Architecture", "Deploy"];
    case "MOBILE":
      return ["CEO analizando", "Research", "CTO", "UX", "Deploy"];
    case "DISCOVERY":
      return ["CEO analizando", "Research", "CFO", "CMO"];
    default:
      return ["CEO analizando"];
  }
}
