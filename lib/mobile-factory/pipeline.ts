/** Program 4600 — Full pipeline runner with localStorage persistence. */

import type {
  MobileFactorySnapshot,
  MobileProject,
  PipelineRunResult,
  WizardStepId,
} from "./types";
import {
  MOBILE_FACTORY_DISCLAIMER,
  MOBILE_FACTORY_VERSION,
} from "./types";
import { createInitialSteps, setStepStatus, advanceWizard, computeWizardProgress } from "./wizard";
import { getTemplateById } from "./templates";
import { generateNavigation, formatNavigationSummary } from "./navigation-generator";
import { generateScreens, formatScreensSummary } from "./screens-generator";
import { generateAuthFlow, formatAuthSummary } from "./auth-generator";
import { generateApiIntegration, formatApiSummary } from "./api-integration";
import { generateProjectStructure, formatStructureSummary } from "./project-structure";
import { generateExpoPreview, formatPreviewSummary } from "./preview";
import { createPlatformBuild, runPlatformBuild, formatBuildSummary } from "./build-status";
import { DEMO_PROJECT_ID, createDemoMobileProject } from "./seed/demo-project";

const STORAGE_KEY = "forgeos-mobile-factory";

function generateId(): string {
  return `mf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function createMobileProject(idea: string, name?: string): MobileProject {
  const now = new Date().toISOString();
  const projectName = name?.trim() || idea.slice(0, 40).trim() || "Mi App Móvil";

  return {
    id: generateId(),
    name: projectName,
    idea: idea.trim(),
    templateId: null,
    createdAt: now,
    updatedAt: now,
    currentStep: "idea",
    steps: createInitialSteps(),
    navigation: null,
    screens: [],
    auth: null,
    api: null,
    structure: null,
    preview: null,
    androidBuild: null,
    iosBuild: null,
    completed: false,
  };
}

export function readMobileFactorySnapshot(): MobileFactorySnapshot {
  if (typeof window === "undefined") {
    return emptySnapshot();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedSnapshot();
    const parsed = JSON.parse(raw) as MobileFactorySnapshot;
    if (!parsed.projects?.length) return seedSnapshot();
    return parsed;
  } catch {
    return seedSnapshot();
  }
}

export function writeMobileFactorySnapshot(snapshot: MobileFactorySnapshot): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function emptySnapshot(): MobileFactorySnapshot {
  return {
    version: MOBILE_FACTORY_VERSION,
    projects: [],
    activeProjectId: null,
    lastUpdated: new Date().toISOString(),
  };
}

function seedSnapshot(): MobileFactorySnapshot {
  const demo = createDemoMobileProject();
  return {
    version: MOBILE_FACTORY_VERSION,
    projects: [demo],
    activeProjectId: DEMO_PROJECT_ID,
    lastUpdated: new Date().toISOString(),
  };
}

export function saveProject(project: MobileProject): MobileFactorySnapshot {
  const snapshot = readMobileFactorySnapshot();
  const idx = snapshot.projects.findIndex((p) => p.id === project.id);
  const updated = { ...project, updatedAt: new Date().toISOString() };

  if (idx >= 0) {
    snapshot.projects[idx] = updated;
  } else {
    snapshot.projects.unshift(updated);
  }

  snapshot.activeProjectId = updated.id;
  snapshot.lastUpdated = new Date().toISOString();
  writeMobileFactorySnapshot(snapshot);
  return snapshot;
}

export function getProjectById(id: string): MobileProject | null {
  const snapshot = readMobileFactorySnapshot();
  return snapshot.projects.find((p) => p.id === id) ?? null;
}

export function deleteProject(id: string): MobileFactorySnapshot {
  const snapshot = readMobileFactorySnapshot();
  snapshot.projects = snapshot.projects.filter((p) => p.id !== id);
  if (snapshot.activeProjectId === id) {
    snapshot.activeProjectId = snapshot.projects[0]?.id ?? null;
  }
  snapshot.lastUpdated = new Date().toISOString();
  writeMobileFactorySnapshot(snapshot);
  return snapshot;
}

export async function runPipelineStep(
  project: MobileProject,
  stepId?: WizardStepId
): Promise<PipelineRunResult> {
  const targetStep = stepId ?? project.currentStep;
  let updated = { ...project };

  switch (targetStep) {
    case "idea": {
      updated = setStepStatus(updated, "idea", "success", updated.idea);
      updated = advanceWizard(updated);
      break;
    }
    case "template": {
      if (!updated.templateId) {
        updated.templateId = "consumer-app";
      }
      const template = getTemplateById(updated.templateId)!;
      updated = setStepStatus(updated, "template", "success", template.name);
      updated = advanceWizard(updated);
      break;
    }
    case "navigation": {
      const template = getTemplateById(updated.templateId ?? "consumer-app")!;
      const nav = generateNavigation(template, updated.name);
      updated.navigation = nav;
      updated = setStepStatus(updated, "navigation", "success", formatNavigationSummary(nav));
      updated = advanceWizard(updated);
      break;
    }
    case "screens": {
      const template = getTemplateById(updated.templateId ?? "consumer-app")!;
      const nav = updated.navigation ?? generateNavigation(template, updated.name);
      const screens = generateScreens(template, nav);
      updated.screens = screens;
      updated = setStepStatus(updated, "screens", "success", formatScreensSummary(screens));
      updated = advanceWizard(updated);
      break;
    }
    case "auth": {
      const template = getTemplateById(updated.templateId ?? "consumer-app")!;
      const slug = slugify(updated.name);
      const auth = generateAuthFlow(template, slug);
      updated.auth = auth;
      updated = setStepStatus(updated, "auth", "success", formatAuthSummary(auth));
      updated = advanceWizard(updated);
      break;
    }
    case "api": {
      const template = getTemplateById(updated.templateId ?? "consumer-app")!;
      const slug = slugify(updated.name);
      const screens = updated.screens;
      const api = generateApiIntegration(template, slug, screens);
      updated.api = api;
      updated = setStepStatus(updated, "api", "success", formatApiSummary(api));
      updated = advanceWizard(updated);
      break;
    }
    case "structure": {
      const template = getTemplateById(updated.templateId ?? "consumer-app")!;
      const slug = slugify(updated.name);
      const structure = generateProjectStructure(template, slug, updated.screens);
      updated.structure = structure;
      updated = setStepStatus(updated, "structure", "success", formatStructureSummary(structure));
      updated = advanceWizard(updated);
      break;
    }
    case "preview": {
      const preview = generateExpoPreview(updated.name, updated.id);
      updated.preview = preview;
      updated = setStepStatus(updated, "preview", "success", formatPreviewSummary(preview));
      updated = advanceWizard(updated);
      break;
    }
    case "android": {
      const slug = slugify(updated.name);
      const build = updated.androidBuild ?? createPlatformBuild("android");
      updated.androidBuild = await runPlatformBuild(build, slug);
      updated = setStepStatus(
        updated,
        "android",
        "success",
        formatBuildSummary(updated.androidBuild)
      );
      updated = advanceWizard(updated);
      break;
    }
    case "ios": {
      const slug = slugify(updated.name);
      const build = updated.iosBuild ?? createPlatformBuild("ios");
      updated.iosBuild = await runPlatformBuild(build, slug);
      updated = setStepStatus(updated, "ios", "success", formatBuildSummary(updated.iosBuild));
      updated = advanceWizard(updated);
      break;
    }
    case "complete": {
      updated = setStepStatus(updated, "complete", "success", "Proyecto móvil listo");
      updated.completed = true;
      break;
    }
  }

  saveProject(updated);

  return {
    project: updated,
    stepCompleted: targetStep,
    nextStep: updated.currentStep === targetStep ? null : updated.currentStep,
  };
}

export async function runFullPipeline(project: MobileProject): Promise<MobileProject> {
  let current = { ...project };
  const steps: WizardStepId[] = [
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

  for (const step of steps) {
    if (current.completed) break;
    const result = await runPipelineStep(current, step);
    current = result.project;
  }

  return current;
}

export function getProjectProgress(project: MobileProject): number {
  return computeWizardProgress(project);
}

export { MOBILE_FACTORY_VERSION, MOBILE_FACTORY_DISCLAIMER };
