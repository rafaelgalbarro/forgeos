/** Venture Timeline — assemble events from venture data and read-only stores (Epic 7.3). */

import type { VentureProject } from "@/lib/domain/venture";
import { getExecutiveGraphForVenture } from "@/lib/ai-orchestration/decision-graph-writer";
import { getExecutiveRuntimeMemory } from "@/lib/ai-orchestration/executive-memory-writer";
import { getExecutionsForVenture } from "@/lib/ai-orchestration/memory-writer";
import type { ExecutiveNodeType } from "@/lib/ai-orchestration/types";
import { getDecisionsForVenture } from "@/lib/intelligence-layer/decision-engine";
import { getVentureMemory } from "@/lib/intelligence-layer/venture-memory";
import type { TimelineEvent, TimelineEventSource, VentureTimelineSnapshot } from "./types";

function offsetTimestamp(baseIso: string, minutesAgo: number): string {
  const base = new Date(baseIso).getTime();
  return new Date(base - minutesAgo * 60_000).toISOString();
}

function pushEvent(
  events: TimelineEvent[],
  event: Omit<TimelineEvent, "ventureId"> & { ventureId?: string },
  ventureId: string
): void {
  events.push({ ...event, ventureId: event.ventureId ?? ventureId });
}

function mapGraphNodeType(nodeType: ExecutiveNodeType): TimelineEvent["category"] {
  switch (nodeType) {
    case "Decision":
    case "Approved":
    case "Rejected":
    case "Deferred":
      return "Decision Graph";
    case "Risk":
      return "CEO Reviews";
    case "Opportunity":
      return "Capital";
    case "Blocked":
      return "Board Decisions";
    default:
      return "Decision Graph";
  }
}

function buildVentureHeuristicEvents(venture: VentureProject): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const base = venture.updatedAt;
  const id = venture.id;

  pushEvent(events, {
    id: `${id}-created`,
    title: "Venture creado",
    description: venture.ideaText.slice(0, 160) + (venture.ideaText.length > 160 ? "…" : ""),
    timestamp: venture.createdAt,
    department: "product",
    category: "Product",
    source: "venture",
    actor: "founder",
  }, id);

  if (venture.intelligenceReport) {
    pushEvent(events, {
      id: `${id}-intelligence`,
      title: "Análisis de inteligencia completado",
      description: `Startup Score: ${venture.intelligenceReport.startupScore ?? "—"} · ${venture.intelligenceReport.projectName}`,
      timestamp: offsetTimestamp(base, 180),
      department: "research",
      category: "Research",
      source: "heuristic",
      actor: "forgeos",
    }, id);
  }

  if (venture.intelligenceAccepted) {
    pushEvent(events, {
      id: `${id}-intelligence-accepted`,
      title: "Inteligencia aceptada por el fundador",
      description: "El informe de inteligencia fue validado para continuar el venture.",
      timestamp: offsetTimestamp(base, 170),
      department: "executive",
      category: "CEO Reviews",
      source: "venture",
      actor: "founder",
    }, id);
  }

  const discoveryCount = venture.discoveryContext?.answers.length ?? 0;
  if (discoveryCount > 0) {
    pushEvent(events, {
      id: `${id}-discovery`,
      title: "Discovery actualizado",
      description: `${discoveryCount} respuestas registradas en la sesión de discovery.`,
      timestamp: offsetTimestamp(base, 150),
      department: "product",
      category: "Product",
      source: "venture",
      actor: "founder",
    }, id);
  }

  if (venture.ventureSimulatorResult) {
    const s = venture.ventureSimulatorResult;
    pushEvent(events, {
      id: `${id}-simulator`,
      title: "Venture Simulator ejecutado",
      description: `Score ${s.startupScore}/100 — ${s.recommendationLabel ?? s.recommendation}`,
      timestamp: offsetTimestamp(base, 120),
      department: "finance",
      category: "Finance",
      source: "venture",
      actor: "founder",
    }, id);
  }

  if (venture.researchReport) {
    pushEvent(events, {
      id: `${id}-research`,
      title: "Research de mercado completado",
      description: venture.researchMeta?.source === "ai" ? "Generado con IA" : "Research documentado",
      timestamp: offsetTimestamp(base, 90),
      department: "research",
      category: "Research",
      source: "venture",
      actor: "founder",
    }, id);
  }

  if (venture.productPRD) {
    pushEvent(events, {
      id: `${id}-prd`,
      title: "PRD generado",
      description: venture.productPRDSource === "ai" ? "Product requirements generados con IA" : "PRD documentado",
      timestamp: offsetTimestamp(base, 75),
      department: "product",
      category: "Product",
      source: "venture",
      actor: "founder",
    }, id);
  }

  const archSection = venture.sections.find((s) => s.id === "arquitectura" && s.content.trim());
  if (archSection) {
    pushEvent(events, {
      id: `${id}-architecture`,
      title: "Arquitectura definida",
      description: archSection.title,
      timestamp: offsetTimestamp(base, 60),
      department: "engineering",
      category: "Architecture",
      source: "heuristic",
      actor: "engineering",
    }, id);
  }

  const qaSection = venture.sections.find((s) => s.id === "qa" && s.content.trim());
  if (qaSection) {
    pushEvent(events, {
      id: `${id}-qa`,
      title: "QA documentado",
      description: "Plan de calidad y pruebas registrado.",
      timestamp: offsetTimestamp(base, 40),
      department: "qa",
      category: "QA",
      source: "heuristic",
      actor: "qa",
    }, id);
  }

  const landingSection = venture.sections.find((s) => s.id === "landing" && s.content.trim());
  if (landingSection) {
    pushEvent(events, {
      id: `${id}-landing`,
      title: "Landing page definida",
      description: "Estrategia de go-to-market documentada.",
      timestamp: offsetTimestamp(base, 35),
      department: "growth",
      category: "Marketing",
      source: "heuristic",
      actor: "growth",
    }, id);
  }

  const pricingSection = venture.sections.find((s) => s.id === "pricing" && s.content.trim());
  if (pricingSection) {
    pushEvent(events, {
      id: `${id}-pricing`,
      title: "Modelo de pricing definido",
      description: "Estructura de precios documentada.",
      timestamp: offsetTimestamp(base, 30),
      department: "finance",
      category: "Finance",
      source: "heuristic",
      actor: "finance",
    }, id);
  }

  if (venture.status === "building") {
    pushEvent(events, {
      id: `${id}-build-start`,
      title: "Build iniciado",
      description: "Fase de construcción del startup package.",
      timestamp: offsetTimestamp(base, 25),
      department: "build",
      category: "Build",
      source: "heuristic",
      actor: "build",
    }, id);
  }

  if (venture.status === "ready" && venture.sections.length > 0) {
    pushEvent(events, {
      id: `${id}-ready`,
      title: "Paquete startup listo",
      description: `${venture.sections.length} secciones documentadas y listas para exportar.`,
      timestamp: base,
      department: "build",
      category: "Deploy",
      source: "venture",
      actor: "forgeos",
    }, id);

    pushEvent(events, {
      id: `${id}-capital-ready`,
      title: "Investment readiness alcanzado",
      description: "Documentación suficiente para revisión de capital.",
      timestamp: offsetTimestamp(base, -5),
      department: "capital",
      category: "Capital",
      source: "heuristic",
      actor: "capital",
    }, id);
  }

  return events;
}

function buildMemoryEvents(ventureId: string): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const memory = getVentureMemory(ventureId);
  if (!memory) return events;

  pushEvent(events, {
    id: `mem-${ventureId}-sync`,
    title: "Memoria del venture sincronizada",
    description: `${memory.decisions.length} decisiones · ${memory.risks.length} riesgos registrados`,
    timestamp: memory.syncedAt,
    department: "memory",
    category: "Memory",
    source: "memory",
    actor: memory.author,
  }, ventureId);

  for (const change of memory.changes.slice(0, 10)) {
    pushEvent(events, {
      id: `mem-${ventureId}-change-${change.updatedAt}`,
      title: "Cambio registrado en memoria",
      description: `Delta de ${change.deltaDays} día(s) desde última actualización`,
      timestamp: change.updatedAt,
      department: "memory",
      category: "Memory",
      source: "memory",
      actor: "forgeos",
    }, ventureId);
  }

  return events;
}

function buildDecisionEvents(ventureId: string): TimelineEvent[] {
  return getDecisionsForVenture(ventureId).map((d) => ({
    id: `dec-${d.id}`,
    ventureId,
    title: d.title,
    description: d.description || d.motive,
    timestamp: d.date,
    department: "executive" as const,
    category: "Decision Graph" as const,
    source: "decision-graph" as const,
    actor: d.takenBy,
    metadata: { status: d.status, expectedImpact: d.expectedImpact },
  }));
}

function buildExecutiveGraphEvents(ventureId: string): TimelineEvent[] {
  return getExecutiveGraphForVenture(ventureId).map((node) => ({
    id: `graph-${node.id}`,
    ventureId,
    title: node.title,
    description: node.rationale || node.impact,
    timestamp: node.createdAt,
    department: "executive" as const,
    category: mapGraphNodeType(node.nodeType),
    source: "decision-graph" as const,
    actor: node.source,
    metadata: { nodeType: node.nodeType, confidence: node.confidence },
  }));
}

function buildExecutiveMemoryEvents(ventureId: string): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const memory = getExecutiveRuntimeMemory();

  for (const review of memory.ceoReviews.filter((r) => r.ventureId === ventureId)) {
    pushEvent(events, {
      id: `ceo-${review.id}`,
      title: review.output.priority || `CEO Review — ${review.taskId}`,
      description: review.output.recommendation || review.output.summary,
      timestamp: review.createdAt,
      department: "executive",
      category: "CEO Reviews",
      source: "executive-memory",
      actor: "CEO",
      metadata: { taskId: review.taskId, confidence: review.output.confidence },
    }, ventureId);
  }

  for (const board of memory.boardReviews.filter((r) => r.ventureId === ventureId)) {
    pushEvent(events, {
      id: `board-${board.id}`,
      title: "Board review session",
      description: `${board.opinions.length} opiniones registradas`,
      timestamp: board.createdAt,
      department: "executive",
      category: "Board Decisions",
      source: "executive-memory",
      actor: "board",
      metadata: { sessionId: board.sessionId },
    }, ventureId);
  }

  for (const consensus of memory.consensusHistory.filter((c) => c.ventureId === ventureId)) {
    pushEvent(events, {
      id: `consensus-${consensus.id}`,
      title: `Consenso ejecutivo — ${consensus.level}`,
      description: consensus.finalDecision,
      timestamp: consensus.createdAt,
      department: "executive",
      category: "Board Decisions",
      source: "executive-memory",
      actor: "executive",
      metadata: { confidence: consensus.confidence },
    }, ventureId);
  }

  for (const decision of memory.executiveDecisions.filter((d) => d.ventureId === ventureId)) {
    pushEvent(events, {
      id: `exec-dec-${decision.id}`,
      title: decision.title,
      description: decision.decision,
      timestamp: decision.createdAt,
      department: "executive",
      category: "CEO Reviews",
      source: "executive-memory",
      actor: "CEO",
      metadata: { confidence: decision.confidence },
    }, ventureId);
  }

  return events;
}

function buildAiExecutionEvents(ventureId: string): TimelineEvent[] {
  return getExecutionsForVenture(ventureId).map((exec) => ({
    id: `ai-${exec.id}`,
    ventureId,
    title: `AI task — ${exec.taskId}`,
    description: `${exec.provider}/${exec.model} · ${exec.latencyMs}ms${exec.fallbackUsed ? " · fallback" : ""}`,
    timestamp: exec.timestamp,
    department: mapTaskToDepartment(exec.taskId),
    category: mapTaskToCategory(exec.taskId),
    source: "ai-orchestration" as const,
    actor: exec.provider,
    metadata: {
      taskId: exec.taskId,
      latencyMs: exec.latencyMs,
      fallbackUsed: exec.fallbackUsed,
    },
  }));
}

function mapTaskToDepartment(taskId: string): TimelineEvent["department"] {
  if (taskId.startsWith("CEO")) return "executive";
  if (taskId.startsWith("BOARD")) return "executive";
  if (taskId.startsWith("BUILD_QA")) return "qa";
  if (taskId.startsWith("BUILD")) return "build";
  return "engineering";
}

function mapTaskToCategory(taskId: string): TimelineEvent["category"] {
  if (taskId.startsWith("CEO")) return "CEO Reviews";
  if (taskId.startsWith("BOARD")) return "Board Decisions";
  if (taskId.includes("ARCHITECTURE")) return "Architecture";
  if (taskId.includes("DEPLOY")) return "Deploy";
  if (taskId.includes("QA")) return "QA";
  if (taskId.startsWith("BUILD")) return "Build";
  return "Build";
}

export function buildVentureTimelineEvents(venture: VentureProject): TimelineEvent[] {
  const ventureId = venture.id;
  const all = [
    ...buildVentureHeuristicEvents(venture),
    ...buildMemoryEvents(ventureId),
    ...buildDecisionEvents(ventureId),
    ...buildExecutiveGraphEvents(ventureId),
    ...buildExecutiveMemoryEvents(ventureId),
    ...buildAiExecutionEvents(ventureId),
  ];

  const seen = new Set<string>();
  const deduped = all.filter((e) => {
    const key = `${e.title}|${e.timestamp.slice(0, 16)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function buildVentureTimelineSnapshot(venture: VentureProject): VentureTimelineSnapshot {
  const events = buildVentureTimelineEvents(venture);
  const sources = [...new Set(events.map((e) => e.source))] as TimelineEventSource[];

  return {
    ventureId: venture.id,
    events,
    builtAt: new Date().toISOString(),
    sources,
  };
}
