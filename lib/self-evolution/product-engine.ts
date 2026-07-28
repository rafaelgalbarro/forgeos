/** Program 2035 — Product analysis across ForgeOS areas. */

import type { AffectedArea } from "./types";

export type ProductArea =
  | "founder"
  | "ceo"
  | "organization"
  | "live"
  | "factory"
  | "capital"
  | "marketplace"
  | "enterprise";

export interface ProductOpportunity {
  id: string;
  area: ProductArea;
  title: string;
  description: string;
  impact: "low" | "medium" | "high";
  effort: "low" | "medium" | "high";
  roiEstimate: number;
}

const OPPORTUNITIES: ProductOpportunity[] = [
  {
    id: "prod-founder-onboard",
    area: "founder",
    title: "Simplificar onboarding a 3 pasos",
    description: "Reducir fricción en wizard inicial del fundador.",
    impact: "high",
    effort: "medium",
    roiEstimate: 4.2,
  },
  {
    id: "prod-ceo-brief",
    area: "ceo",
    title: "Brief matutino con IA resumida",
    description: "Resumen ejecutivo automático en dashboard CEO.",
    impact: "medium",
    effort: "low",
    roiEstimate: 3.1,
  },
  {
    id: "prod-org-priorities",
    area: "organization",
    title: "Prioridades cross-departamento",
    description: "Vista unificada de OKRs departamentales.",
    impact: "medium",
    effort: "high",
    roiEstimate: 2.8,
  },
  {
    id: "prod-live-alerts",
    area: "live",
    title: "Alertas proactivas en Live",
    description: "Notificaciones de anomalías en tiempo real.",
    impact: "high",
    effort: "medium",
    roiEstimate: 3.9,
  },
  {
    id: "prod-factory-templates",
    area: "factory",
    title: "Templates de factory pre-configurados",
    description: "Acelerar creación de ventures con plantillas.",
    impact: "high",
    effort: "medium",
    roiEstimate: 4.5,
  },
  {
    id: "prod-capital-forecast",
    area: "capital",
    title: "Forecast de runway visual",
    description: "Gráfico interactivo de runway y burn.",
    impact: "medium",
    effort: "low",
    roiEstimate: 3.4,
  },
  {
    id: "prod-marketplace-curate",
    area: "marketplace",
    title: "Curación de skill packs top",
    description: "Sección destacada con packs de alto NPS.",
    impact: "medium",
    effort: "low",
    roiEstimate: 2.9,
  },
  {
    id: "prod-enterprise-sso",
    area: "enterprise",
    title: "SSO wizard guiado",
    description: "Onboarding SSO paso a paso para admins.",
    impact: "high",
    effort: "medium",
    roiEstimate: 3.7,
  },
];

export function analyzeProduct(): ProductOpportunity[] {
  return [...OPPORTUNITIES];
}

export function getOpportunitiesByArea(area: ProductArea): ProductOpportunity[] {
  return OPPORTUNITIES.filter((o) => o.area === area);
}

export function mapProductAreaToAffected(area: ProductArea): AffectedArea {
  return area as AffectedArea;
}
