import type { VentureProject } from "@/lib/domain/venture";
import { buildFounderActivitySection } from "./activity-section";
import { buildFounderBuildSection } from "./build-section";
import { buildFounderCalendarSection } from "./calendar-section";
import { buildFounderCapitalSection } from "./capital-section";
import { buildFounderCeoSection } from "./ceo-section";
import {
  buildFounderEmpresasSection,
  buildFounderHeader,
} from "./founder-dashboard-data";
import { buildFounderPortfolioSection } from "./portfolio-section";
import { buildFounderPrioritiesSection } from "./priorities-section";
import type { FounderDashboardData } from "./types";

export function buildFounderDashboardData(ventures: VentureProject[]): FounderDashboardData {
  const sorted = [...ventures].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return {
    generatedAt: new Date().toISOString(),
    header: buildFounderHeader(sorted),
    ceo: buildFounderCeoSection(sorted),
    empresas: buildFounderEmpresasSection(sorted),
    prioridades: buildFounderPrioritiesSection(sorted),
    portfolio: buildFounderPortfolioSection(sorted),
    build: buildFounderBuildSection(sorted),
    capital: buildFounderCapitalSection(sorted),
    calendario: buildFounderCalendarSection(sorted),
    actividad: buildFounderActivitySection(sorted),
  };
}

export type { FounderDashboardData } from "./types";
export type {
  FounderActivitySection,
  FounderBuildSection,
  FounderCalendarSection,
  FounderCapitalSection,
  FounderCeoSection,
  FounderEmpresasSection,
  FounderPortfolioSection,
  FounderPrioritiesSection,
} from "./types";

export { buildFounderCeoSection } from "./ceo-section";
export { buildFounderPortfolioSection } from "./portfolio-section";
export { buildFounderPrioritiesSection } from "./priorities-section";
export { buildFounderCalendarSection } from "./calendar-section";
export { buildFounderActivitySection } from "./activity-section";
export { buildFounderBuildSection } from "./build-section";
export { buildFounderCapitalSection } from "./capital-section";
export { buildFounderEmpresasSection, buildFounderHeader } from "./founder-dashboard-data";
