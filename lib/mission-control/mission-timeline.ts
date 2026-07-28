/** Mission timeline events with timestamps — wired to live-mission event-emitter. */

import type { Mission, MissionPhase, TimelineEvent } from "./types";
import { phaseLabelEs } from "./mission-flow";
import { emitMissionEvent, ensureLiveMission } from "./live-mission/event-emitter";
import type { MissionEventType } from "./live-mission/types";

function nowTime(): string {
  const d = new Date();
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function eventId(): string {
  return `tl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function timelineEventType(label: string): MissionEventType {
  if (label.includes("Idea registrada")) return "intention_classified";
  if (label.includes("Fase:")) return "phase_advance";
  if (label.includes("completado")) return "factory_step";
  if (label.includes("Decisión")) return "decision_resolved";
  if (label.includes("Perfil:") || label.includes("Oportunidad")) return "discovery";
  if (label.includes("riesgo")) return "risk_detected";
  return "system";
}

export function appendTimelineEvent(
  mission: Mission,
  label: string,
  phase?: MissionPhase,
  icon?: string
): Mission {
  const event: TimelineEvent = {
    id: eventId(),
    timestamp: nowTime(),
    label,
    phase,
    icon,
  };
  let updated: Mission = {
    ...ensureLiveMission(mission),
    timeline: [event, ...mission.timeline].slice(0, 50),
    updatedAt: new Date().toISOString(),
  };
  updated = emitMissionEvent(updated, timelineEventType(label), label, { phase, icon });
  return updated;
}

export function timelineForPhaseAdvance(mission: Mission, newPhase: MissionPhase): Mission {
  return appendTimelineEvent(mission, `Fase: ${phaseLabelEs(newPhase)}`, newPhase, "→");
}

export function timelineForIdeaRegistered(mission: Mission, idea: string): Mission {
  return appendTimelineEvent(mission, `Idea registrada: ${idea.slice(0, 40)}…`, "UNDERSTAND", "💡");
}

export function timelineForFactoryStep(mission: Mission, stepLabel: string): Mission {
  return appendTimelineEvent(mission, `${stepLabel} completado`, mission.phase, "✅");
}

export function timelineForDecision(mission: Mission, title: string): Mission {
  return appendTimelineEvent(mission, `Decisión: ${title}`, mission.phase, "⚖️");
}

export function timelineForDiscovery(mission: Mission, label: string): Mission {
  return appendTimelineEvent(mission, label, "UNDERSTAND", "🔍");
}

export function timelineForBoardReviewStart(mission: Mission, triggerLabel: string): Mission {
  return appendTimelineEvent(
    mission,
    `Consejo Ejecutivo evaluando: ${triggerLabel}`,
    mission.phase,
    "🏛️"
  );
}

export function timelineForBoardSummaryReady(mission: Mission, confidence: number): Mission {
  return appendTimelineEvent(
    mission,
    `Resumen ejecutivo listo (${confidence}% confianza)`,
    mission.phase,
    "📋"
  );
}

export function timelineForRisk(mission: Mission, risk: string): Mission {
  return appendTimelineEvent(mission, `Riesgo detectado: ${risk}`, mission.phase, "⚠️");
}

export function timelineForUserMessage(mission: Mission, text: string): Mission {
  return emitMissionEvent(mission, "user_message", `Usuario: ${text.slice(0, 50)}`, {
    phase: mission.phase,
    icon: "👤",
  });
}

export function timelineForCeoResponse(mission: Mission, text: string): Mission {
  return emitMissionEvent(mission, "ceo_response", `CEO: ${text.slice(0, 50)}`, {
    phase: mission.phase,
    icon: "🎯",
  });
}

export function timelineForDeployStub(mission: Mission, label: string): Mission {
  return appendTimelineEvent(mission, `Deploy: ${label}`, "DEPLOY", "☁️");
}
