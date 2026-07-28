import type { VentureProject } from "@/lib/domain/venture";
import type { Decision, DecisionStatus } from "../types";
import { STORAGE_KEYS } from "../memory/types";
import {
  filterListByVenture,
  findInList,
  readStorage,
  updateInList,
  writeStorage,
} from "../memory/storage";

export type RegisterDecisionInput = Omit<Decision, "id"> & { id?: string };

function readDecisions(): Decision[] {
  return readStorage<Decision[]>(STORAGE_KEYS.decisions, []);
}

function writeDecisions(decisions: Decision[]): void {
  writeStorage(STORAGE_KEYS.decisions, decisions);
}

export function registerDecision(input: RegisterDecisionInput): Decision {
  const decisions = readDecisions();
  const existing = input.id ? decisions.find((d) => d.id === input.id) : undefined;
  if (existing) return existing;

  const decision: Decision = {
    id: input.id ?? crypto.randomUUID(),
    ventureId: input.ventureId,
    title: input.title,
    description: input.description,
    motive: input.motive,
    takenBy: input.takenBy,
    date: input.date,
    expectedImpact: input.expectedImpact,
    actualImpact: input.actualImpact,
    reversible: input.reversible,
    dependencies: input.dependencies,
    status: input.status,
  };
  decisions.push(decision);
  writeDecisions(decisions);
  return decision;
}

export function getDecisionsForVenture(ventureId: string): Decision[] {
  return filterListByVenture<Decision>(STORAGE_KEYS.decisions, ventureId);
}

export function getDecisionById(id: string): Decision | undefined {
  return findInList<Decision>(STORAGE_KEYS.decisions, id);
}

export function updateDecision(
  id: string,
  patch: Partial<Pick<Decision, "status" | "actualImpact" | "description" | "expectedImpact">>
): Decision | undefined {
  return updateInList<Decision>(STORAGE_KEYS.decisions, id, (d) => ({ ...d, ...patch }));
}

function milestoneExists(ventureId: string, title: string): boolean {
  return getDecisionsForVenture(ventureId).some((d) => d.title === title);
}

function registerMilestone(
  venture: VentureProject,
  title: string,
  description: string,
  motive: string,
  expectedImpact: string,
  status: DecisionStatus = "completed"
): string | null {
  if (milestoneExists(venture.id, title)) return null;
  const d = registerDecision({
    ventureId: venture.id,
    title,
    description,
    motive,
    takenBy: "founder",
    date: venture.updatedAt,
    expectedImpact,
    reversible: false,
    dependencies: [],
    status,
  });
  return d.id;
}

/** Heuristic auto-registration of key venture milestones. */
export function autoRegisterMilestoneDecisions(venture: VentureProject): string[] {
  const ids: string[] = [];

  const ideaId = registerMilestone(
    venture,
    "Idea registrada",
    venture.ideaText.slice(0, 200),
    "Inicio del venture en ForgeOS",
    "Base del proyecto",
    "completed"
  );
  if (ideaId) ids.push(ideaId);

  if (venture.intelligenceAccepted) {
    const id = registerMilestone(
      venture,
      "Inteligencia aceptada",
      "El fundador aceptó el reporte de inteligencia inicial",
      "Validación de la idea por el fundador",
      "Habilita discovery y research",
      "completed"
    );
    if (id) ids.push(id);
  }

  const discoveryCount = venture.discoveryContext?.answers.length ?? 0;
  if (discoveryCount > 0) {
    const id = registerMilestone(
      venture,
      "Discovery completado",
      `${discoveryCount} decisiones aclaradas`,
      "Proceso de discovery finalizado",
      "Mejora precisión del simulador",
      discoveryCount >= 3 ? "completed" : "active"
    );
    if (id) ids.push(id);
  }

  if (venture.researchReport) {
    const id = registerMilestone(
      venture,
      "Research generado",
      "Reporte de investigación de mercado disponible",
      "Análisis de mercado y competencia",
      "Informa decisiones de producto",
      "completed"
    );
    if (id) ids.push(id);
  }

  if (venture.ventureSimulatorResult) {
    const s = venture.ventureSimulatorResult;
    const id = registerMilestone(
      venture,
      "Simulador ejecutado",
      `Score: ${s.startupScore}/100 — ${s.recommendationLabel}`,
      "Evaluación financiera y de viabilidad",
      s.recommendation,
      "completed"
    );
    if (id) ids.push(id);
  }

  if (venture.productPRD) {
    const id = registerMilestone(
      venture,
      "PRD generado",
      venture.name,
      "Definición de producto completada",
      "Base para build plan",
      "completed"
    );
    if (id) ids.push(id);
  }

  const hasBuild = venture.sections.some(
    (s) => ["arquitectura", "backend", "frontend", "build-plan"].includes(s.id) && s.content.trim()
  );
  if (hasBuild) {
    const id = registerMilestone(
      venture,
      "Build plan iniciado",
      "Secciones de ingeniería con contenido",
      "Transición a fase de construcción",
      "Acelera time-to-market",
      "active"
    );
    if (id) ids.push(id);
  }

  return ids;
}

export function getAllDecisions(): Decision[] {
  return readDecisions();
}
