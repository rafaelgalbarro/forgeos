/** Program 7000 — Case study content (generic, no hardcoded logic) */

import type { CaseStudy } from "./types";

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: "vandl",
    title: "VANDL — De concepto a venture digital",
    industry: "Consumer / Lifestyle",
    summary:
      "Estudio genérico de cómo un fundador usa ForgeOS para validar, construir brand y lanzar una venture de consumo.",
    outcomes: [
      "Validación de mercado en 2 semanas con Venture Intelligence",
      "Brand kit y landing generados en Venture Factory",
      "Operaciones centralizadas en Live AI Ops",
    ],
    generic: true,
  },
  {
    id: "saas-studio",
    title: "Studio B2B SaaS",
    industry: "B2B SaaS",
    summary:
      "Equipo de 5 personas escala un portfolio de 12 ventures con plan Business.",
    outcomes: [
      "25 asientos y ventures ilimitadas",
      "API keys para integraciones CRM",
      "Account manager y soporte prioritario",
    ],
    generic: true,
  },
  {
    id: "enterprise-innovation",
    title: "Innovación corporativa",
    industry: "Enterprise",
    summary:
      "Corporación usa ForgeOS Enterprise para incubadoras internas con SSO y cumplimiento.",
    outcomes: [
      "SSO / SCIM y Security Center",
      "GDPR + roadmap SOC 2",
      "SLA y soporte dedicado",
    ],
    generic: true,
    href: "/enterprise",
  },
];

export function listCaseStudies(): CaseStudy[] {
  return CASE_STUDIES;
}

export function getCaseStudy(id: string): CaseStudy | undefined {
  return CASE_STUDIES.find((c) => c.id === id);
}
