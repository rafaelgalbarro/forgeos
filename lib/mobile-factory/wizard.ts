/** Program 4600 — Wizard step orchestration & state machine. */

import type { BuildStatus, MobileProject, WizardStep, WizardStepId } from "./types";

export const WIZARD_STEP_ORDER: WizardStepId[] = [
  "idea",
  "template",
  "navigation",
  "screens",
  "auth",
  "api",
  "structure",
  "preview",
  "android",
  "ios",
  "complete",
];

const STEP_LABELS: Record<WizardStepId, string> = {
  idea: "Idea",
  template: "Plantilla",
  navigation: "Navegación",
  screens: "Pantallas",
  auth: "Autenticación",
  api: "API",
  structure: "Estructura",
  preview: "Preview Expo",
  android: "Build Android",
  ios: "Build iOS",
  complete: "Completado",
};

export function createInitialSteps(): WizardStep[] {
  return WIZARD_STEP_ORDER.map((id, order) => ({
    id,
    label: STEP_LABELS[id],
    order,
    status: id === "idea" ? "running" : "pending",
  }));
}

export function getStepIndex(stepId: WizardStepId): number {
  return WIZARD_STEP_ORDER.indexOf(stepId);
}

export function getNextStep(current: WizardStepId): WizardStepId | null {
  const idx = getStepIndex(current);
  if (idx < 0 || idx >= WIZARD_STEP_ORDER.length - 1) return null;
  return WIZARD_STEP_ORDER[idx + 1];
}

export function getPreviousStep(current: WizardStepId): WizardStepId | null {
  const idx = getStepIndex(current);
  if (idx <= 0) return null;
  return WIZARD_STEP_ORDER[idx - 1];
}

export function canAdvance(project: MobileProject): boolean {
  const step = project.steps.find((s) => s.id === project.currentStep);
  return step?.status === "success" || step?.status === "skipped";
}

export function advanceWizard(project: MobileProject): MobileProject {
  const next = getNextStep(project.currentStep);
  if (!next) return { ...project, completed: true };

  const steps = project.steps.map((s) => {
    if (s.id === project.currentStep && s.status === "running") {
      return { ...s, status: "success" as BuildStatus };
    }
    if (s.id === next) {
      return { ...s, status: "running" as BuildStatus };
    }
    return s;
  });

  return {
    ...project,
    currentStep: next,
    steps,
    updatedAt: new Date().toISOString(),
    completed: next === "complete",
  };
}

export function setStepStatus(
  project: MobileProject,
  stepId: WizardStepId,
  status: BuildStatus,
  summary?: string
): MobileProject {
  const steps = project.steps.map((s) =>
    s.id === stepId ? { ...s, status, summary: summary ?? s.summary } : s
  );
  return { ...project, steps, updatedAt: new Date().toISOString() };
}

export function goToStep(project: MobileProject, stepId: WizardStepId): MobileProject {
  const targetIdx = getStepIndex(stepId);
  const steps = project.steps.map((s) => {
    const idx = getStepIndex(s.id);
    if (idx < targetIdx && s.status === "pending") {
      return { ...s, status: "skipped" as BuildStatus };
    }
    if (s.id === stepId) {
      return { ...s, status: "running" as BuildStatus };
    }
    if (idx > targetIdx && s.status === "running") {
      return { ...s, status: "pending" as BuildStatus };
    }
    return s;
  });

  return {
    ...project,
    currentStep: stepId,
    steps,
    updatedAt: new Date().toISOString(),
  };
}

export function computeWizardProgress(project: MobileProject): number {
  const done = project.steps.filter(
    (s) => s.status === "success" || s.status === "skipped"
  ).length;
  const total = project.steps.length - 1;
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

export function isWizardComplete(project: MobileProject): boolean {
  return project.completed || project.currentStep === "complete";
}
