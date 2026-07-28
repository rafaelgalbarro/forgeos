/** OPERATE phase — activate post-deploy company management. */

import type { Mission } from "../types";
import { shouldShowCompanyWorkspaces } from "./operate-phase-shared";
import { emitCompanyKpiUpdate } from "./company-events";

export { shouldShowCompanyWorkspaces } from "./operate-phase-shared";

export function isOperatePhase(mission: Mission): boolean {
  return mission.phase === "OPERATE";
}

export function activateOperatePhase(mission: Mission): Mission {
  const updated: Mission = {
    ...mission,
    status: {
      ...mission.status,
      ceoStatus: "Empresa en operación — gestión autónoma activa",
      confidence: Math.min(95, mission.status.confidence + 10),
      activeDepartments: [...new Set([...mission.status.activeDepartments, "CMO", "CS", "Ops"])],
      recommendations: [
        "Revisa KPIs y feedback de clientes en Gestión Empresa",
        "Monitoriza incidentes de producción",
        ...mission.status.recommendations.slice(0, 2),
      ],
    },
    updatedAt: new Date().toISOString(),
  };
  return emitCompanyKpiUpdate(updated, "Fase OPERATE — workspaces de gestión activados");
}

export function operatePhaseLabel(): string {
  return "Operar";
}

export function getOperatePhaseHints(): string[] {
  return [
    "Marketing y SEO disponibles en Gestión Empresa",
    "Feedback y NPS sincronizados desde Customer Success",
    "Incidentes monitorizados desde Production Readiness",
  ];
}
