import type { VentureProject } from "@/lib/domain/venture";
import {
  runVentureSimulator,
  ventureToSimulatorInput,
} from "@/lib/venture-simulator";
import { sectionHasContent } from "./venture-status";

export type NextActionPriority = "alta" | "media" | "baja";

const PRIORITY_RANK: Record<NextActionPriority, number> = {
  alta: 0,
  media: 1,
  baja: 2,
};

export interface NextAction {
  label: string;
  description: string;
  href: string;
  impact: string;
  priority: NextActionPriority;
  ventureId: string;
  ventureName: string;
}

function shortName(name: string): string {
  return name.length > 48 ? `${name.slice(0, 45)}…` : name;
}

function workspaceHref(venture: VentureProject): string {
  if (venture.status === "ready") return `/venture/${venture.id}`;
  if (venture.status === "building") return `/build/${venture.id}`;
  return `/intelligence/${venture.id}`;
}

function hasDiscoveryPending(venture: VentureProject): boolean {
  const remaining = venture.discoveryContext?.remainingQuestions?.length ?? 0;
  const answered = venture.discoveryContext?.answers.length ?? 0;
  return remaining > 0 || answered < 2;
}

function hasBuildPlanReady(venture: VentureProject): boolean {
  return (
    !!venture.productPRD &&
    venture.intelligenceAccepted === true &&
    !sectionHasContent(venture, "frontend") &&
    !sectionHasContent(venture, "backend")
  );
}

export function resolveNextAction(venture: VentureProject): NextAction {
  const name = shortName(venture.name);
  const base = workspaceHref(venture);

  if (hasDiscoveryPending(venture)) {
    const remaining = venture.discoveryContext?.remainingQuestions?.length ?? 0;
    const detail =
      remaining > 0
        ? `${remaining} pregunta${remaining > 1 ? "s" : ""} de Discovery sin responder`
        : "Completa Discovery para desbloquear Research";
    return {
      label: "Responder Discovery",
      description: detail,
      href: `/intelligence/${venture.id}`,
      impact: "Desbloquea Research y mejora la calidad del análisis",
      priority: "alta",
      ventureId: venture.id,
      ventureName: name,
    };
  }

  if (!venture.researchReport) {
    return {
      label: "Completar Research",
      description: `Research pendiente en ${name}`,
      href: venture.status === "building" ? `/build/${venture.id}` : `/intelligence/${venture.id}`,
      impact: "Reduce incertidumbre antes de invertir en Build",
      priority: "alta",
      ventureId: venture.id,
      ventureName: name,
    };
  }

  const hasSimulator =
    !!venture.ventureSimulatorResult || venture.intelligenceAccepted === true;

  if (!hasSimulator) {
    return {
      label: "Revisar Venture Simulator",
      description: `Simulación pendiente en ${name}`,
      href: `/intelligence/${venture.id}`,
      impact: "Aumenta las probabilidades de éxito con datos de mercado",
      priority: "alta",
      ventureId: venture.id,
      ventureName: name,
    };
  }

  if (!venture.productPRD) {
    return {
      label: "Revisar PRD",
      description: `Product pendiente en ${name}`,
      href: venture.status === "ready" ? `/venture/${venture.id}` : `/build/${venture.id}`,
      impact: "Define el MVP y mejora la calidad del Build Plan",
      priority: "media",
      ventureId: venture.id,
      ventureName: name,
    };
  }

  const sim =
    venture.ventureSimulatorResult ??
    runVentureSimulator(ventureToSimulatorInput(venture));

  if (sim?.recommendation === "research_more") {
    return {
      label: "Profundizar Research",
      description: `El simulador recomienda más Research en ${name}`,
      href: venture.status === "building" ? `/build/${venture.id}` : base,
      impact: "Mejora la calidad del PRD y reduce riesgo de pivot",
      priority: "alta",
      ventureId: venture.id,
      ventureName: name,
    };
  }

  if (sim?.recommendation === "pivot") {
    return {
      label: "Revisar pivot sugerido",
      description: `Decisión estratégica pendiente en ${name}`,
      href: `/intelligence/${venture.id}`,
      impact: "Puede aumentar mucho las probabilidades de éxito",
      priority: "alta",
      ventureId: venture.id,
      ventureName: name,
    };
  }

  if (hasBuildPlanReady(venture)) {
    return {
      label: "Revisar Build Plan",
      description: `Build Plan listo en ${name}`,
      href: `/venture/${venture.id}`,
      impact: "Acelera el lanzamiento con un plan técnico claro",
      priority: "media",
      ventureId: venture.id,
      ventureName: name,
    };
  }

  if (venture.status === "building") {
    return {
      label: "Continuar Build",
      description: `Build en progreso en ${name}`,
      href: `/build/${venture.id}`,
      impact: "Avanza hacia el lanzamiento de la startup",
      priority: "media",
      ventureId: venture.id,
      ventureName: name,
    };
  }

  if (sectionHasContent(venture, "landing")) {
    return {
      label: "Lanzar Beta",
      description: `${name} está lista para validar con usuarios`,
      href: `/venture/${venture.id}`,
      impact: "Valida la propuesta con tracción real",
      priority: "baja",
      ventureId: venture.id,
      ventureName: name,
    };
  }

  return {
    label: "Abrir venture workspace",
    description: `Revisar el estado completo de ${name}`,
    href: base,
    impact: "Mantiene el momentum del portfolio",
    priority: "baja",
    ventureId: venture.id,
    ventureName: name,
  };
}

export function resolvePortfolioNextAction(ventures: VentureProject[]): NextAction | null {
  if (ventures.length === 0) return null;

  const actions = ventures.map(resolveNextAction);
  actions.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  return actions[0] ?? null;
}

export function resolveAllNextActions(ventures: VentureProject[]): NextAction[] {
  const actions = ventures.map(resolveNextAction);
  actions.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  return actions;
}

export function countPriorityActions(ventures: VentureProject[]): number {
  return resolveAllNextActions(ventures).filter((a) => a.priority === "alta").length || 1;
}

export function formatNextActionLine(action: NextAction): string {
  const verb = action.label.toLowerCase();
  if (verb.startsWith("completar") || verb.startsWith("responder") || verb.startsWith("revisar")) {
    return `${verb} de ${action.ventureName}.`;
  }
  return `${verb} en ${action.ventureName}.`;
}

/** Header display: Responder Discovery de "Venture Name" */
export function formatHeaderNextAction(action: NextAction): string {
  return `${action.label} de “${action.ventureName}”`;
}
