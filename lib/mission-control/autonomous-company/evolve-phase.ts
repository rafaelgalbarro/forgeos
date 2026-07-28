/** EVOLVE phase — continuous improvement loop hooks. */

import type { Mission } from "../types";
import { emitCompanyFeedbackUpdate } from "./company-events";

export function isEvolvePhase(mission: Mission): boolean {
  return mission.phase === "EVOLVE";
}

export function activateEvolvePhase(mission: Mission): Mission {
  const updated: Mission = {
    ...mission,
    status: {
      ...mission.status,
      ceoStatus: "Evolución continua — mejoras guiadas por datos",
      confidence: Math.min(98, mission.status.confidence + 5),
      activeDepartments: [...new Set([...mission.status.activeDepartments, "CTO", "Product", "CS"])],
      recommendations: [
        "Prioriza backlog según feedback de clientes",
        "Revisa propuestas de Self Evolution",
        "Actualiza roadmap trimestral",
        ...mission.status.recommendations.slice(0, 1),
      ],
    },
    updatedAt: new Date().toISOString(),
  };
  return emitCompanyFeedbackUpdate(updated, "Fase EVOLVE — loop de mejora continua activado");
}

export function evolvePhaseLabel(): string {
  return "Evolucionar";
}

export function getEvolvePhaseHooks(): string[] {
  return [
    "Self Evolution propone mejoras técnicas y de producto",
    "Roadmap se actualiza con votos de design partners",
    "KPIs alimentan priorización del backlog",
  ];
}
