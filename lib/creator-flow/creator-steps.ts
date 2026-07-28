import type { CreatorStepDefinition, CreatorStepId } from "./types";

export const CREATOR_STEPS: CreatorStepDefinition[] = [
  {
    id: "idea",
    order: 1,
    label: "Idea",
    objetivo: "Articular la oportunidad y el problema que resuelves.",
    estimatedTime: "15 min",
  },
  {
    id: "discovery",
    order: 2,
    label: "Discovery",
    objetivo: "Responder preguntas clave sobre producto, cliente y modelo.",
    estimatedTime: "20 min",
  },
  {
    id: "research",
    order: 3,
    label: "Research",
    objetivo: "Validar mercado, competencia y tendencias con evidencia.",
    estimatedTime: "30 min",
  },
  {
    id: "ceo",
    order: 4,
    label: "CEO",
    objetivo: "Revisión ejecutiva: observación, riesgo y recomendación.",
    estimatedTime: "10 min",
  },
  {
    id: "board",
    order: 5,
    label: "Board",
    objetivo: "Decisión de gobernanza basada en Venture Score.",
    estimatedTime: "15 min",
  },
  {
    id: "product",
    order: 6,
    label: "Product",
    objetivo: "Definir PRD, alcance de MVP y prioridades.",
    estimatedTime: "45 min",
  },
  {
    id: "architecture",
    order: 7,
    label: "Architecture",
    objetivo: "Blueprint técnico: stack, datos y despliegue.",
    estimatedTime: "30 min",
  },
  {
    id: "build",
    order: 8,
    label: "Build",
    objetivo: "Construir el MVP con entregables verificables.",
    estimatedTime: "2–4 h",
  },
  {
    id: "deploy",
    order: 9,
    label: "Deploy",
    objetivo: "Preparar release, checklist y entorno de producción.",
    estimatedTime: "30 min",
  },
  {
    id: "growth",
    order: 10,
    label: "Growth",
    objetivo: "Landing, KPIs y plan de tracción inicial.",
    estimatedTime: "45 min",
  },
];

export function getCreatorStep(id: CreatorStepId): CreatorStepDefinition {
  const step = CREATOR_STEPS.find((s) => s.id === id);
  if (!step) throw new Error(`Unknown creator step: ${id}`);
  return step;
}

export function getNextCreatorStepId(id: CreatorStepId): CreatorStepId | null {
  const idx = CREATOR_STEPS.findIndex((s) => s.id === id);
  if (idx < 0 || idx >= CREATOR_STEPS.length - 1) return null;
  return CREATOR_STEPS[idx + 1].id;
}

export function getCreatorStepIndex(id: CreatorStepId): number {
  return CREATOR_STEPS.findIndex((s) => s.id === id);
}
