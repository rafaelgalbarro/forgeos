/** ForgeOS Analytics Skills — aggregated registry (RC4.6). */

import type { SkillDefinition } from "@/lib/skills/types";
import { dashboardsModule } from "./dashboards";
import { reportsModule } from "./reports";
import { kpisModule } from "./kpis";
import { forecastModule } from "./forecast";
import { predictionsModule } from "./predictions";
import { metricsModule } from "./metrics";
import type { AnalyticsDomain, AnalyticsProviderModule } from "./types";

export const ANALYTICS_PROVIDER_MODULES: AnalyticsProviderModule[] = [
  dashboardsModule,
  reportsModule,
  kpisModule,
  forecastModule,
  predictionsModule,
  metricsModule,
];

export const ANALYTICS_SKILL_REGISTRY: SkillDefinition[] = ANALYTICS_PROVIDER_MODULES.map(
  (m) => m.registry
);

export const ANALYTICS_SKILL_IDS = new Set(ANALYTICS_SKILL_REGISTRY.map((s) => s.id));

export function getAnalyticsModuleById(skillId: string) {
  return ANALYTICS_PROVIDER_MODULES.find(
    (m) => m.def.skillId === skillId || m.registry.id === skillId
  );
}

export function getAnalyticsModuleByDomain(domain: AnalyticsDomain) {
  return ANALYTICS_PROVIDER_MODULES.find((m) => m.def.domain === domain);
}

export function listAnalyticsDomains(): AnalyticsDomain[] {
  return ANALYTICS_PROVIDER_MODULES.map((m) => m.def.domain);
}

export function isAnalyticsSkillId(skillId: string): boolean {
  return ANALYTICS_SKILL_IDS.has(skillId);
}
