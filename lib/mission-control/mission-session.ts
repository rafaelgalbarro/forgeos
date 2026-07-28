/** PROGRAM 5150 — Mission session lifecycle (maps Mission ↔ MissionSession). */

import type {
  Mission,
  MissionSession,
  MissionIntent,
  MissionState,
  MissionSessionStatus,
  MissionPhase,
  MissionDecision,
  MissionArtifact,
  MissionEvent,
  MissionMessage,
  IntentionType,
} from "./types";
import { createInitialMission } from "./mission-flow";
import { phaseToSessionStatus, sessionStatusToPhase } from "./mission-runner";

const DEFAULT_WORKSPACE = "ws-default";
const DEFAULT_FOUNDER = "founder-default";

function generateId(): string {
  return `mc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function slugFromIdea(idea?: string): string | undefined {
  if (!idea) return undefined;
  const slug = idea
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join("-");
  return slug || undefined;
}

export function defaultMissionState(phase: MissionPhase = "UNDERSTAND"): MissionState {
  const sessionStatus = phaseToSessionStatus(phase);
  return {
    sessionStatus,
    phase,
    understandingComplete: phase !== "UNDERSTAND",
    planComplete: ["BUILD", "VALIDATE", "DEPLOY", "OPERATE", "EVOLVE"].includes(phase),
    buildComplete: ["VALIDATE", "DEPLOY", "OPERATE", "EVOLVE"].includes(phase),
    validateComplete: ["DEPLOY", "OPERATE", "EVOLVE"].includes(phase),
    deployPrepared: ["OPERATE", "EVOLVE"].includes(phase),
    operatePrepared: phase === "EVOLVE",
    evolvePrepared: false,
  };
}

export function createMissionSession(idea?: string, founderId = DEFAULT_FOUNDER): MissionSession {
  const now = new Date().toISOString();
  const missionId = generateId();
  return {
    missionId,
    workspaceId: DEFAULT_WORKSPACE,
    founderId,
    intent: null,
    currentStage: "UNDERSTAND",
    status: "DRAFT",
    state: defaultMissionState("UNDERSTAND"),
    conversation: [],
    decisions: [],
    artifacts: [],
    events: [],
    pendingApprovals: [],
    activeDepartments: [],
    createdAt: now,
    updatedAt: now,
    ventureSlug: slugFromIdea(idea),
  };
}

function pendingToDecision(p: Mission["pendingDecisions"][0]): MissionDecision {
  return {
    ...p,
    askedAt: new Date().toISOString(),
    resolvedAt: p.resolved ? new Date().toISOString() : undefined,
  };
}

function decisionToPending(d: MissionDecision): Mission["pendingDecisions"][0] {
  return {
    id: d.id,
    category: d.category as Mission["pendingDecisions"][0]["category"],
    title: d.title,
    description: d.description,
    options: d.options,
    resolved: d.resolved,
    selectedOption: d.selectedOption,
    important: d.important,
  };
}

export function missionToSession(mission: Mission): MissionSession {
  const sessionStatus = phaseToSessionStatus(mission.phase);
  const intent: MissionIntent | null = mission.intention
    ? { primary: mission.intention, confidence: 0.8, extractedIdea: mission.idea }
    : null;

  const decisions = (mission.pendingDecisions ?? []).map(pendingToDecision);
  const pendingApprovals = decisions.filter((d) => !d.resolved && d.important);

  return {
    missionId: mission.id,
    workspaceId: DEFAULT_WORKSPACE,
    ventureId: mission.projectId,
    ventureSlug: slugFromIdea(mission.idea),
    founderId: DEFAULT_FOUNDER,
    intent,
    currentStage: mission.phase,
    status: mission.autoPilot.pausedForDecision ? "PAUSED" : sessionStatus,
    state: {
      ...defaultMissionState(mission.phase),
      sessionStatus,
      pausedAt: mission.autoPilot.pausedForDecision ? mission.updatedAt : undefined,
    },
    conversation: mission.messages,
    decisions,
    artifacts: buildArtifactsFromMission(mission),
    events: buildEventsFromTimeline(mission),
    pendingApprovals,
    activeDepartments: mission.status.activeDepartments,
    validationScores: mission.investorSnapshot
      ? {
          venture: mission.status.confidence,
          product: 70,
          technical: 65,
          market: 72,
          risk: 60,
          mvpReadiness: 68,
          launchReadiness: 55,
          investorReadiness: mission.investorSnapshot.readinessScore,
          source: "heuristic",
          generatedAt: mission.investorSnapshot.generatedAt,
        }
      : undefined,
    createdAt: mission.createdAt,
    updatedAt: mission.updatedAt,
  };
}

function buildArtifactsFromMission(mission: Mission): MissionArtifact[] {
  const artifacts: MissionArtifact[] = [];
  const now = mission.updatedAt;

  if (mission.factoryRoute) {
    artifacts.push({
      id: "art-factory",
      type: "build",
      label: "Factory preview",
      phase: "BUILD",
      source: "demo",
      href: mission.factoryRoute,
      createdAt: now,
    });
  }
  if (mission.gtmSnapshot?.generatedAt) {
    artifacts.push({
      id: "art-gtm",
      type: "plan",
      label: "Plan GTM",
      phase: "VALIDATE",
      source: "heuristic",
      summary: `${mission.gtmSnapshot.deliverableCount ?? 8} entregables`,
      createdAt: mission.gtmSnapshot.generatedAt ?? new Date().toISOString(),
    });
  }
  if (mission.investorSnapshot?.generatedAt) {
    artifacts.push({
      id: "art-investor",
      type: "score",
      label: "Investor readiness",
      phase: "VALIDATE",
      source: "heuristic",
      summary: `${mission.investorSnapshot.readinessScore}%`,
      createdAt: mission.investorSnapshot.generatedAt,
    });
  }
  return artifacts;
}

function buildEventsFromTimeline(mission: Mission): MissionEvent[] {
  return (mission.timeline ?? []).map((t) => ({
    id: t.id,
    timestamp: t.timestamp,
    type: "stage" as const,
    label: t.label,
    phase: t.phase,
  }));
}

export function sessionToMission(session: MissionSession): Mission {
  const base = createInitialMission(session.missionId, session.intent?.extractedIdea);
  const phase = sessionStatusToPhase(session.status) ?? session.currentStage;

  return {
    ...base,
    id: session.missionId,
    title: session.intent?.extractedIdea?.slice(0, 60) || base.title,
    intention: session.intent?.primary ?? null,
    phase,
    idea: session.intent?.extractedIdea,
    projectId: session.ventureId,
    messages: session.conversation,
    timeline: session.events.map((e) => ({
      id: e.id,
      timestamp: e.timestamp,
      label: e.label,
      phase: e.phase,
    })),
    pendingDecisions: session.decisions.map(decisionToPending),
    status: {
      ceoStatus: sessionStatusLabel(session.status),
      confidence: session.validationScores?.venture ?? 50,
      nextDecision: session.pendingApprovals[0]?.title,
      activeDepartments: session.activeDepartments,
      risks: [],
      recommendations: [],
    },
    autoPilot: {
      enabled: session.status !== "PAUSED",
      pausedForDecision: session.status === "PAUSED",
    },
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

function sessionStatusLabel(status: MissionSessionStatus): string {
  const labels: Record<MissionSessionStatus, string> = {
    DRAFT: "Borrador — describe tu idea",
    UNDERSTANDING: "Entendiendo tu visión",
    PLANNING: "Planificando la misión",
    BUILDING: "Generando previews de build",
    VALIDATING: "Validando producto y mercado",
    READY_FOR_DEPLOY: "Listo para despliegue (preview)",
    OPERATING: "Preparando operaciones",
    EVOLVING: "Evolución y mejora continua",
    PAUSED: "Misión en pausa",
    BLOCKED: "Misión bloqueada",
    COMPLETED: "Misión completada",
    FAILED: "Misión fallida",
  };
  return labels[status] ?? status;
}

export function updateSessionIntent(session: MissionSession, intent: MissionIntent): MissionSession {
  return {
    ...session,
    intent,
    status: "UNDERSTANDING",
    currentStage: "UNDERSTAND",
    state: { ...session.state, sessionStatus: "UNDERSTANDING" },
    updatedAt: new Date().toISOString(),
  };
}

export function addSessionMessage(
  session: MissionSession,
  role: MissionMessage["role"],
  content: string,
  decisionPrompt = false
): MissionSession {
  const message: MissionMessage = {
    id: `msg-${Date.now().toString(36)}`,
    role,
    content,
    timestamp: new Date().toISOString(),
    decisionPrompt,
  };
  return {
    ...session,
    conversation: [...session.conversation, message],
    updatedAt: new Date().toISOString(),
  };
}

export function pauseSession(session: MissionSession): MissionSession {
  return { ...session, status: "PAUSED", updatedAt: new Date().toISOString() };
}

export function resumeSession(session: MissionSession): MissionSession {
  const status = phaseToSessionStatus(session.currentStage);
  return { ...session, status, updatedAt: new Date().toISOString() };
}

export function attachArtifact(session: MissionSession, artifact: MissionArtifact): MissionSession {
  return {
    ...session,
    artifacts: [...session.artifacts, artifact],
    updatedAt: new Date().toISOString(),
  };
}

export function setSessionPhase(session: MissionSession, phase: MissionPhase): MissionSession {
  const status = phaseToSessionStatus(phase);
  return {
    ...session,
    currentStage: phase,
    status,
    state: { ...defaultMissionState(phase), sessionStatus: status },
    updatedAt: new Date().toISOString(),
  };
}

/** Understanding questions spread across conversation (not a fixed form) */
export const UNDERSTANDING_TOPICS = [
  { id: "target_client", label: "cliente objetivo", prompt: "¿Quién es tu cliente objetivo principal?" },
  { id: "region", label: "región", prompt: "¿En qué región o mercado quieres lanzar primero?" },
  { id: "revenue_model", label: "modelo de ingresos", prompt: "¿Cómo planeas monetizar — suscripción, por uso, licencia?" },
  { id: "user_profile", label: "perfil de usuario", prompt: "¿Quién usará la plataforma día a día — técnicos, managers, clientes?" },
  { id: "critical_problem", label: "problema crítico", prompt: "¿Cuál es el problema más costoso que resuelves hoy?" },
  { id: "priority_integration", label: "integración prioritaria", prompt: "¿Hay alguna integración imprescindible (ERP, facturación, GPS)?" },
  { id: "mvp_goal", label: "objetivo MVP", prompt: "¿Qué debe hacer el MVP en las primeras 8 semanas?" },
] as const;

export function nextUnderstandingTopic(session: MissionSession): (typeof UNDERSTANDING_TOPICS)[number] | null {
  const answered = new Set(
    session.decisions
      .filter((d) => d.resolved && d.category === "UNDERSTANDING")
      .map((d) => d.id)
  );
  return UNDERSTANDING_TOPICS.find((t) => !answered.has(t.id)) ?? null;
}

export function isUnderstandingComplete(session: MissionSession): boolean {
  const answered = session.decisions.filter((d) => d.resolved && d.category === "UNDERSTANDING").length;
  return answered >= 4;
}
