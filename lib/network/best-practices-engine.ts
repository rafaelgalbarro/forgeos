/** RC10 — Best practices engine (demo, anonymized). */

import type { BestPractice, NetworkContext } from "./types";
import { DEMO_DISCLAIMER } from "./types";

export function buildBestPractices(ctx: NetworkContext): BestPractice[] {
  return [
    {
      id: "bp-pricing-tier",
      title: "Plan Pro como ancla de valor",
      summary:
        "Introducir un plan Pro entre 45–59 €/mes mejora la percepción de valor y reduce churn en tier entry.",
      category: "pricing",
      adoptionRatePct: 62,
      impactScore: 8.4,
      disclaimer: DEMO_DISCLAIMER,
    },
    {
      id: "bp-onboarding",
      title: "Onboarding guiado en 7 días",
      summary:
        "Ventures con activación en la primera semana muestran 2.3× retención a 90 días.",
      category: "product",
      adoptionRatePct: 71,
      impactScore: 9.1,
      disclaimer: DEMO_DISCLAIMER,
    },
    {
      id: "bp-annual-billing",
      title: "Facturación anual con descuento",
      summary:
        "Ofrecer 15–20% de descuento anual reduce churn y mejora cash flow predecible.",
      category: "gtm",
      adoptionRatePct: 54,
      impactScore: 7.8,
      disclaimer: DEMO_DISCLAIMER,
    },
    {
      id: "bp-nps-loop",
      title: "Loop NPS → roadmap",
      summary: `Startups ${ctx.sector} con feedback loop cerrado iteran un 40% más rápido.`,
      category: "product",
      adoptionRatePct: 48,
      impactScore: 7.2,
      disclaimer: DEMO_DISCLAIMER,
    },
  ];
}

export function getTopBestPractice(practices: BestPractice[]): BestPractice | null {
  if (practices.length === 0) return null;
  return [...practices].sort((a, b) => b.impactScore - a.impactScore)[0];
}
