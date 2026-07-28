/** Program 9000 — Federated knowledge stub (no raw data cross-org). */

import type { FederatedKnowledgeRef } from "./types";
import type { NetworkContext } from "@/lib/network/types";
import { DEMO_DISCLAIMER } from "@/lib/network/types";

export function buildFederatedKnowledgeRefs(ctx: NetworkContext): FederatedKnowledgeRef[] {
  return [
    {
      id: "fk-pricing-framework",
      topic: "Marco de pricing SaaS B2B",
      category: "strategy",
      aggregateViews: 1240,
      relevanceScore: 0.89,
      disclaimer: DEMO_DISCLAIMER,
    },
    {
      id: "fk-gtm-playbook",
      topic: "Go-to-market para ventures early-stage",
      category: "gtm",
      aggregateViews: 980,
      relevanceScore: 0.82,
      disclaimer: DEMO_DISCLAIMER,
    },
    {
      id: "fk-product-discovery",
      topic: "Discovery de producto con founders",
      category: "product",
      aggregateViews: 756,
      relevanceScore: 0.78,
      disclaimer: DEMO_DISCLAIMER,
    },
    {
      id: `fk-sector-${ctx.sector}`,
      topic: `Patrones de conocimiento sector ${ctx.sector}`,
      category: "sector",
      aggregateViews: 432,
      relevanceScore: 0.91,
      disclaimer: DEMO_DISCLAIMER,
    },
  ];
}

export function getTopKnowledgeRef(
  refs: FederatedKnowledgeRef[]
): FederatedKnowledgeRef | null {
  if (refs.length === 0) return null;
  return [...refs].sort((a, b) => b.relevanceScore - a.relevanceScore)[0];
}
