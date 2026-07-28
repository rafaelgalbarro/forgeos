/** PROGRAM 4400 — Website Wizard step orchestration and state machine. */

import type { WizardProgress, WizardStep, WizardStepId, WizardStepStatus } from "./types";

export interface WizardStepDefinition {
  id: WizardStepId;
  label: string;
  order: number;
}

export const WIZARD_STEPS: WizardStepDefinition[] = [
  { id: "idea", label: "Idea", order: 1 },
  { id: "research", label: "Research", order: 2 },
  { id: "brand", label: "Brand", order: 3 },
  { id: "copywriting", label: "Copywriting", order: 4 },
  { id: "seo", label: "SEO", order: 5 },
  { id: "page-architecture", label: "Arquitectura de páginas", order: 6 },
  { id: "components", label: "Componentes", order: 7 },
  { id: "nextjs", label: "Next.js", order: 8 },
  { id: "tailwind", label: "Tailwind", order: 9 },
  { id: "shadcn", label: "shadcn/ui", order: 10 },
  { id: "preview", label: "Preview", order: 11 },
  { id: "github", label: "GitHub", order: 12 },
  { id: "deploy-preview", label: "Deploy Preview", order: 13 },
];

export function createInitialSteps(currentStepId: WizardStepId = "idea"): WizardStep[] {
  const currentOrder = WIZARD_STEPS.find((s) => s.id === currentStepId)?.order ?? 1;
  return WIZARD_STEPS.map((def) => {
    let status: WizardStepStatus = "pending";
    if (def.order < currentOrder) status = "completed";
    else if (def.order === currentOrder) status = "active";
    return {
      id: def.id,
      label: def.label,
      order: def.order,
      status,
      summary: "",
    };
  });
}

export function getStepDefinition(id: WizardStepId): WizardStepDefinition {
  const def = WIZARD_STEPS.find((s) => s.id === id);
  if (!def) throw new Error(`Unknown wizard step: ${id}`);
  return def;
}

export function getNextStepId(id: WizardStepId): WizardStepId | null {
  const order = getStepDefinition(id).order;
  const next = WIZARD_STEPS.find((s) => s.order === order + 1);
  return next?.id ?? null;
}

export function getPreviousStepId(id: WizardStepId): WizardStepId | null {
  const order = getStepDefinition(id).order;
  const prev = WIZARD_STEPS.find((s) => s.order === order - 1);
  return prev?.id ?? null;
}

export function canAdvanceStep(steps: WizardStep[], stepId: WizardStepId): boolean {
  const step = steps.find((s) => s.id === stepId);
  return step?.status === "active" || step?.status === "completed";
}

export function markStepCompleted(steps: WizardStep[], stepId: WizardStepId, summary: string): WizardStep[] {
  const nextId = getNextStepId(stepId);
  return steps.map((s) => {
    if (s.id === stepId) {
      return { ...s, status: "completed" as WizardStepStatus, summary };
    }
    if (nextId && s.id === nextId) {
      return { ...s, status: "active" as WizardStepStatus };
    }
    return s;
  });
}

export function setActiveStep(steps: WizardStep[], stepId: WizardStepId): WizardStep[] {
  const targetOrder = getStepDefinition(stepId).order;
  return steps.map((s) => {
    if (s.order < targetOrder) return { ...s, status: "completed" as WizardStepStatus };
    if (s.id === stepId) return { ...s, status: "active" as WizardStepStatus };
    return { ...s, status: "pending" as WizardStepStatus };
  });
}

export function computeWizardProgress(steps: WizardStep[], currentStepId: WizardStepId): WizardProgress {
  const completedCount = steps.filter((s) => s.status === "completed").length;
  const totalCount = steps.length;
  const def = getStepDefinition(currentStepId);
  return {
    completedCount,
    totalCount,
    percent: Math.round((completedCount / totalCount) * 100),
    currentStepId,
    currentStepLabel: def.label,
  };
}
