/** PROGRAM 5800 — Funding plan generator. */

import type { FundingPlan, VentureIntelligenceContext } from "./types";
import { HEURISTIC_DISCLAIMER } from "@/lib/venture-intelligence";

const TARGET_INVESTORS = [
  "Fondos pre-seed/seed España",
  "Business angels sector vertical",
  "Corporate venture (sector target)",
  "Aceleradoras europeas",
  "Family offices tech-friendly",
];

export function generateFundingPlan(ctx: VentureIntelligenceContext): FundingPlan {
  const roundSizeEur = ctx.fundraisingEur;
  const stage = roundSizeEur < 500_000 ? "Pre-seed" : roundSizeEur < 2_000_000 ? "Seed" : "Series A";

  return {
    roundSizeEur,
    targetRound: stage,
    useOfFunds: [
      { label: "Equipo clave", pct: 40 },
      { label: "Go-to-market", pct: 30 },
      { label: "Producto y tecnología", pct: 20 },
      { label: "Reserva operativa", pct: 10 },
    ],
    timelineMonths: Math.min(6, Math.max(3, Math.round(12 - ctx.runwayMonths))),
    targetInvestors: TARGET_INVESTORS,
    milestones: [
      "Cerrar data room completo",
      "Pitch deck final + one-pager",
      "Outreach a 20 inversores target",
      "5 reuniones cualificadas",
      "Term sheet objetivo",
    ],
    disclaimer: HEURISTIC_DISCLAIMER,
  };
}
