import type { VentureProject } from "@/lib/domain/venture";
import type { BuildQueueState } from "../types";

export function resolveQueueState(venture: VentureProject): BuildQueueState {
  if (venture.status === "ready" && venture.sections.some((s) => s.id === "frontend" && s.content)) {
    return "Live";
  }
  if (venture.status === "building") {
    const hasBackend = venture.sections.some((s) => s.id === "backend" && s.content);
    const hasFrontend = venture.sections.some((s) => s.id === "frontend" && s.content);
    if (hasBackend && hasFrontend) return "Testing";
    if (hasBackend || hasFrontend) return "Building";
    return "Planning";
  }
  if (venture.productPRD && venture.intelligenceAccepted) return "Pending";
  return "Pending";
}

export function stateProgress(state: BuildQueueState): number {
  const map: Record<BuildQueueState, number> = {
    Pending: 5,
    Planning: 20,
    Building: 50,
    Testing: 75,
    Deploying: 90,
    Live: 100,
  };
  return map[state];
}

export function statePhaseLabel(state: BuildQueueState): string {
  const map: Record<BuildQueueState, string> = {
    Pending: "En cola",
    Planning: "Planificando arquitectura",
    Building: "Construyendo MVP",
    Testing: "QA y validación",
    Deploying: "Preparando deploy",
    Live: "En producción",
  };
  return map[state];
}
