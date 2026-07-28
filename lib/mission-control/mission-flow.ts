/** Mission flow state machine — UNDERSTAND → … → EVOLVE. */

import type { IntentionType, Mission, MissionPhase, MissionStatusSummary } from "./types";
import { DEFAULT_SNAPSHOT_ITEMS } from "./mission-snapshots";
import { activateOperatePhase } from "./autonomous-company/operate-phase";
import { activateEvolvePhase } from "./autonomous-company/evolve-phase";

export const MISSION_PHASE_ORDER: MissionPhase[] = [
  "UNDERSTAND",
  "PLAN",
  "BUILD",
  "VALIDATE",
  "DEPLOY",
  "OPERATE",
  "EVOLVE",
];

export function getNextPhase(current: MissionPhase): MissionPhase | null {
  const idx = MISSION_PHASE_ORDER.indexOf(current);
  if (idx < 0 || idx >= MISSION_PHASE_ORDER.length - 1) return null;
  return MISSION_PHASE_ORDER[idx + 1];
}

export function phaseLabelEs(phase: MissionPhase): string {
  const labels: Record<MissionPhase, string> = {
    UNDERSTAND: "Entender",
    PLAN: "Planificar",
    BUILD: "Construir",
    VALIDATE: "Validar",
    DEPLOY: "Desplegar",
    OPERATE: "Operar",
    EVOLVE: "Evolucionar",
  };
  return labels[phase];
}

function defaultStatus(): MissionStatusSummary {
  return {
    ceoStatus: "Esperando tu primera idea",
    confidence: 40,
    activeDepartments: [],
    risks: [],
    recommendations: ["Describe qué quieres construir hoy"],
  };
}

export function createInitialMission(id: string, idea?: string): Mission {
  const now = new Date().toISOString();
  return {
    id,
    title: idea?.slice(0, 60) || "Nueva misión",
    intention: null,
    phase: "UNDERSTAND",
    createdAt: now,
    updatedAt: now,
    idea,
    messages: [],
    timeline: [],
    liveExecution: { active: false, steps: [] },
    pendingDecisions: [],
    autoPilot: { enabled: true, pausedForDecision: false },
    snapshots: [...DEFAULT_SNAPSHOT_ITEMS],
    status: defaultStatus(),
  };
}

export function advancePhase(mission: Mission): Mission {
  const next = getNextPhase(mission.phase);
  if (!next) return mission;
  let updated: Mission = { ...mission, phase: next, updatedAt: new Date().toISOString() };
  if (next === "OPERATE") updated = activateOperatePhase(updated);
  if (next === "EVOLVE") updated = activateEvolvePhase(updated);
  return updated;
}

export function setIntention(mission: Mission, intention: IntentionType, idea?: string): Mission {
  const titles: Record<IntentionType, string> = {
    VENTURE: "Crear Empresa",
    WEBSITE: "Crear Sitio Web",
    APPLICATION: "Crear Aplicación",
    MOBILE: "Crear App Móvil",
    DISCOVERY: "Descubrir Oportunidad",
  };
  return {
    ...mission,
    intention,
    title: idea?.slice(0, 60) || titles[intention],
    idea: idea ?? mission.idea,
    phase: intention === "DISCOVERY" ? "UNDERSTAND" : "PLAN",
    status: {
      ...mission.status,
      ceoStatus: `Misión activa: ${titles[intention]}`,
      confidence: 55,
      recommendations: ["Responde con una sola decisión cuando te lo pida"],
    },
    updatedAt: new Date().toISOString(),
  };
}

export function updateCeoStatus(mission: Mission, status: Partial<MissionStatusSummary>): Mission {
  return {
    ...mission,
    status: { ...mission.status, ...status },
    updatedAt: new Date().toISOString(),
  };
}

/** PROGRAM 5700 — GTM activates post-BUILD in VALIDATE/DEPLOY/OPERATE. */
export const GTM_TRIGGER_PHASES: MissionPhase[] = ["VALIDATE", "DEPLOY", "OPERATE"];

export function isGTMPhase(phase: MissionPhase): boolean {
  return GTM_TRIGGER_PHASES.includes(phase);
}

export function gtmSubStepLabel(): string {
  return "Lanzamiento (GTM)";
}

export function shouldAutoTriggerGTM(phase: MissionPhase): boolean {
  return isGTMPhase(phase);
}

export function snapshotsForIntention(intention: IntentionType): string[] {
  switch (intention) {
    case "VENTURE":
      return ["research", "businessModel", "brand", "marketing", "financials", "investorReadiness", "gtm"];
    case "WEBSITE":
      return ["research", "brand", "website", "marketing", "deployment"];
    case "APPLICATION":
      return ["research", "prd", "architecture", "application", "deployment"];
    case "MOBILE":
      return ["research", "prd", "architecture", "mobile", "deployment"];
    case "DISCOVERY":
      return ["research", "businessModel", "financials"];
    default:
      return [];
  }
}
