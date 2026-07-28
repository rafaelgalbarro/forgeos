/** RC10 — Opportunity network engine (demo, anonymized). */

import type { NetworkOpportunity, NetworkContext } from "./types";
import { DEMO_DISCLAIMER } from "./types";

export function buildOpportunities(ctx: NetworkContext): NetworkOpportunity[] {
  return [
    {
      id: "opp-pricing-pro",
      title: "Plan Pro a 49 €/mes",
      description:
        "Tu pricing está por debajo del benchmark. Probar un plan Pro podría capturar más valor.",
      sector: ctx.sector,
      matchScore: 8.9,
      estimatedImpactPct: 14,
      disclaimer: DEMO_DISCLAIMER,
    },
    {
      id: "opp-annual-upsell",
      title: "Upsell a facturación anual",
      description:
        "El 28% de ventures similares migraron clientes a anual con +18% LTV.",
      sector: ctx.sector,
      matchScore: 7.6,
      estimatedImpactPct: 18,
      disclaimer: DEMO_DISCLAIMER,
    },
    {
      id: "opp-partner-channel",
      title: "Canal de partners B2B",
      description:
        "Integradores del sector buscan soluciones white-label en tu vertical.",
      sector: ctx.sector,
      matchScore: 6.8,
      estimatedImpactPct: 22,
      disclaimer: DEMO_DISCLAIMER,
    },
    {
      id: "opp-ai-feature",
      title: "Feature IA diferenciadora",
      description:
        "Asistente IA integrado es el diferenciador más citado en el sector.",
      sector: ctx.sector,
      matchScore: 8.2,
      estimatedImpactPct: 11,
      disclaimer: DEMO_DISCLAIMER,
    },
  ];
}

export function getTopOpportunity(
  opportunities: NetworkOpportunity[]
): NetworkOpportunity | null {
  if (opportunities.length === 0) return null;
  return [...opportunities].sort((a, b) => b.matchScore - a.matchScore)[0];
}
