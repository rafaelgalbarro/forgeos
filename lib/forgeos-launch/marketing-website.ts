/** Program 7000 — Marketing content sections */

import type { MarketingSection } from "./types";

export const MARKETING_SECTIONS: MarketingSection[] = [
  {
    id: "hero-value",
    title: "De idea a venture operativa",
    description:
      "ForgeOS unifica validación, brand, producto, go-to-market y operaciones en un solo workspace con IA.",
    bullets: [
      "Venture Factory — pipeline completo idea → launch",
      "Founder Journey — recorrido guiado por fases",
      "Live AI Operations — centro de mando en tiempo real",
    ],
    cta: { label: "Explorar demo", href: "/demo" },
  },
  {
    id: "for-founders",
    title: "Diseñado para fundadores",
    description:
      "Interfaz en español, tono profesional y flujos pensados para founders que construyen ventures reales.",
    bullets: [
      "Onboarding multi-paso y workspace unificado",
      "Intelligence scoring y portfolio analytics",
      "Soporte comercial y knowledge base integrados",
    ],
    cta: { label: "Ver precios", href: "/pricing" },
  },
  {
    id: "enterprise-ready",
    title: "Listo para escalar",
    description:
      "Planes Business y Enterprise con API, webhooks, cumplimiento GDPR y roadmap SOC 2.",
    bullets: [
      "API pública y SDK para extensiones",
      "Marketplace y store engine",
      "Security Center y legal hub",
    ],
    cta: { label: "Documentación", href: "/docs" },
  },
];

export function listMarketingSections(): MarketingSection[] {
  return MARKETING_SECTIONS;
}
