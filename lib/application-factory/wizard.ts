/** Program 4500 — Wizard step orchestration & state machine. */

import type { AppProject, BuildStatus, WizardStep, WizardStepId } from "./types";

export const WIZARD_STEP_ORDER: WizardStepId[] = [
  "prd",
  "architecture",
  "database",
  "api",
  "frontend",
  "backend",
  "auth",
  "admin",
  "permissions",
  "tests",
  "github",
  "supabase",
  "preview",
  "deploy",
];

const STEP_LABELS: Record<WizardStepId, string> = {
  prd: "PRD",
  architecture: "Arquitectura",
  database: "Base de datos",
  api: "API",
  frontend: "Frontend",
  backend: "Backend",
  auth: "Autenticación",
  admin: "Panel Admin",
  permissions: "Permisos",
  tests: "Tests",
  github: "GitHub",
  supabase: "Supabase",
  preview: "Preview",
  deploy: "Deploy",
};

export function createInitialSteps(): WizardStep[] {
  return WIZARD_STEP_ORDER.map((id, order) => ({
    id,
    label: STEP_LABELS[id],
    order,
    status: id === "prd" ? "running" : "pending",
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

export function canAdvance(project: AppProject): boolean {
  const step = project.steps.find((s) => s.id === project.currentStep);
  return step?.status === "success" || step?.status === "skipped" || step?.status === "stub";
}

export function advanceWizard(project: AppProject): AppProject {
  const next = getNextStep(project.currentStep);
  if (!next) return { ...project, completed: true };

  const steps = project.steps.map((s) => {
    if (s.id === project.currentStep && (s.status === "running" || s.status === "stub")) {
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
    completed: next === "deploy" && steps.find((s) => s.id === "deploy")?.status === "success",
  };
}

export function setStepStatus(
  project: AppProject,
  stepId: WizardStepId,
  status: BuildStatus,
  summary?: string
): AppProject {
  const steps = project.steps.map((s) =>
    s.id === stepId ? { ...s, status, summary: summary ?? s.summary } : s
  );
  return { ...project, steps, updatedAt: new Date().toISOString() };
}

export function goToStep(project: AppProject, stepId: WizardStepId): AppProject {
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

export function computeWizardProgress(project: AppProject): number {
  const done = project.steps.filter(
    (s) => s.status === "success" || s.status === "skipped" || s.status === "stub"
  ).length;
  const total = project.steps.length;
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

export function isWizardComplete(project: AppProject): boolean {
  return project.completed || project.steps.every((s) => s.status === "success" || s.status === "stub");
}
