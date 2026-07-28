/** Program 4500 — Full pipeline runner with localStorage persistence. */

import type {
  ApplicationFactorySnapshot,
  AppProject,
  PipelineRunResult,
  WizardStepId,
} from "./types";
import {
  APPLICATION_FACTORY_DISCLAIMER,
  APPLICATION_FACTORY_VERSION,
} from "./types";
import { createInitialSteps, setStepStatus, advanceWizard, computeWizardProgress } from "./wizard";
import { generatePRD, formatPRDSummary } from "./prd-generator";
import { generateArchitecture, formatArchitectureSummary } from "./architecture-generator";
import { generateDatabaseSchema, formatDatabaseSummary } from "./database-generator";
import { generateAPIRoutes, formatAPISummary } from "./api-generator";
import { generateFrontendPages, formatFrontendSummary } from "./frontend-generator";
import { generateBackendModules, formatBackendSummary } from "./backend-generator";
import { generateAuthConfig, formatAuthSummary } from "./auth-generator";
import { generateAdminPanel, formatAdminSummary } from "./admin-generator";
import { generatePermissions, formatPermissionsSummary } from "./permissions-generator";
import { generateTestSuite, formatTestsSummary } from "./tests-generator";
import { generatePreviewApp, formatPreviewSummary } from "./preview-app";
import { createInitialBuildStatus, syncBuildStatusFromProject } from "./build-status";
import { generateExportBundle } from "./export";
import { DEMO_PROJECT_ID, createDemoAppProject } from "./seed/demo-project";

const STORAGE_KEY = "forgeos-application-factory-projects";

function generateId(): string {
  return `af-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createAppProject(description: string, name?: string): AppProject {
  const now = new Date().toISOString();
  const projectName = name?.trim() || description.slice(0, 40).trim() || "Mi Aplicación";
  const id = generateId();

  return {
    id,
    name: projectName,
    description: description.trim(),
    createdAt: now,
    updatedAt: now,
    currentStep: "prd",
    steps: createInitialSteps(),
    prd: null,
    architecture: null,
    database: null,
    api: null,
    frontend: null,
    backend: null,
    auth: null,
    admin: null,
    permissions: null,
    tests: null,
    preview: null,
    buildStatus: createInitialBuildStatus(id),
    exportBundle: null,
    completed: false,
  };
}

export function readApplicationFactorySnapshot(): ApplicationFactorySnapshot {
  if (typeof window === "undefined") {
    return emptySnapshot();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedSnapshot();
    const parsed = JSON.parse(raw) as ApplicationFactorySnapshot;
    if (!parsed.projects?.length) return seedSnapshot();
    return parsed;
  } catch {
    return seedSnapshot();
  }
}

export function writeApplicationFactorySnapshot(snapshot: ApplicationFactorySnapshot): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function emptySnapshot(): ApplicationFactorySnapshot {
  return {
    version: APPLICATION_FACTORY_VERSION,
    projects: [],
    activeProjectId: null,
    lastUpdated: new Date().toISOString(),
  };
}

function seedSnapshot(): ApplicationFactorySnapshot {
  const demo = createDemoAppProject();
  return {
    version: APPLICATION_FACTORY_VERSION,
    projects: [demo],
    activeProjectId: DEMO_PROJECT_ID,
    lastUpdated: new Date().toISOString(),
  };
}

export function saveProject(project: AppProject): ApplicationFactorySnapshot {
  const snapshot = readApplicationFactorySnapshot();
  const idx = snapshot.projects.findIndex((p) => p.id === project.id);
  const updated = {
    ...project,
    updatedAt: new Date().toISOString(),
    buildStatus: syncBuildStatusFromProject(project),
  };

  if (idx >= 0) {
    snapshot.projects[idx] = updated;
  } else {
    snapshot.projects.unshift(updated);
  }

  snapshot.activeProjectId = updated.id;
  snapshot.lastUpdated = new Date().toISOString();
  writeApplicationFactorySnapshot(snapshot);
  return snapshot;
}

export function getProjectById(id: string): AppProject | null {
  const snapshot = readApplicationFactorySnapshot();
  return snapshot.projects.find((p) => p.id === id) ?? null;
}

export function deleteProject(id: string): ApplicationFactorySnapshot {
  const snapshot = readApplicationFactorySnapshot();
  snapshot.projects = snapshot.projects.filter((p) => p.id !== id);
  if (snapshot.activeProjectId === id) {
    snapshot.activeProjectId = snapshot.projects[0]?.id ?? null;
  }
  snapshot.lastUpdated = new Date().toISOString();
  writeApplicationFactorySnapshot(snapshot);
  return snapshot;
}

export async function runPipelineStep(
  project: AppProject,
  stepId?: WizardStepId
): Promise<PipelineRunResult> {
  const targetStep = stepId ?? project.currentStep;
  let updated = { ...project };

  switch (targetStep) {
    case "prd": {
      const prd = generatePRD(updated.name, updated.description);
      updated.prd = prd;
      updated = setStepStatus(updated, "prd", "success", formatPRDSummary(prd));
      updated = advanceWizard(updated);
      break;
    }
    case "architecture": {
      const prd = updated.prd ?? generatePRD(updated.name, updated.description);
      const arch = generateArchitecture(updated.name, prd);
      updated.architecture = arch;
      updated = setStepStatus(updated, "architecture", "success", formatArchitectureSummary(arch));
      updated = advanceWizard(updated);
      break;
    }
    case "database": {
      const prd = updated.prd ?? generatePRD(updated.name, updated.description);
      const db = generateDatabaseSchema(updated.name, prd);
      updated.database = db;
      updated = setStepStatus(updated, "database", "success", formatDatabaseSummary(db));
      updated = advanceWizard(updated);
      break;
    }
    case "api": {
      const prd = updated.prd ?? generatePRD(updated.name, updated.description);
      const db = updated.database ?? generateDatabaseSchema(updated.name, prd);
      const api = generateAPIRoutes(updated.name, db);
      updated.api = api;
      updated = setStepStatus(updated, "api", "success", formatAPISummary(api));
      updated = advanceWizard(updated);
      break;
    }
    case "frontend": {
      const prd = updated.prd ?? generatePRD(updated.name, updated.description);
      const frontend = generateFrontendPages(updated.name, prd);
      updated.frontend = frontend;
      updated = setStepStatus(updated, "frontend", "success", formatFrontendSummary(frontend));
      updated = advanceWizard(updated);
      break;
    }
    case "backend": {
      const prd = updated.prd ?? generatePRD(updated.name, updated.description);
      const db = updated.database ?? generateDatabaseSchema(updated.name, prd);
      const backend = generateBackendModules(updated.name, db);
      updated.backend = backend;
      updated = setStepStatus(updated, "backend", "success", formatBackendSummary(backend));
      updated = advanceWizard(updated);
      break;
    }
    case "auth": {
      const auth = generateAuthConfig(updated.name);
      updated.auth = auth;
      updated = setStepStatus(updated, "auth", "success", formatAuthSummary(auth));
      updated = advanceWizard(updated);
      break;
    }
    case "admin": {
      const admin = generateAdminPanel(updated.name);
      updated.admin = admin;
      updated = setStepStatus(updated, "admin", "success", formatAdminSummary(admin));
      updated = advanceWizard(updated);
      break;
    }
    case "permissions": {
      const perms = generatePermissions(updated.name);
      updated.permissions = perms;
      updated = setStepStatus(updated, "permissions", "success", formatPermissionsSummary(perms));
      updated = advanceWizard(updated);
      break;
    }
    case "tests": {
      const tests = generateTestSuite(updated.name);
      updated.tests = tests;
      updated = setStepStatus(updated, "tests", "success", formatTestsSummary(tests));
      updated = advanceWizard(updated);
      break;
    }
    case "github": {
      updated = setStepStatus(
        updated,
        "github",
        "stub",
        "GitHub — estrategia main/develop/feature/* (cloud-foundation)"
      );
      updated = advanceWizard(updated);
      break;
    }
    case "supabase": {
      updated = setStepStatus(
        updated,
        "supabase",
        "stub",
        "Supabase — entornos dev/preview/staging/prod (cloud-foundation)"
      );
      updated = advanceWizard(updated);
      break;
    }
    case "preview": {
      const preview = generatePreviewApp(updated);
      updated.preview = preview;
      updated = setStepStatus(updated, "preview", "success", formatPreviewSummary(preview));
      updated = advanceWizard(updated);
      break;
    }
    case "deploy": {
      updated.exportBundle = generateExportBundle(updated);
      updated = setStepStatus(
        updated,
        "deploy",
        "stub",
        "Deploy — Vercel + Supabase via /cloud (cloud-foundation)"
      );
      updated.completed = true;
      break;
    }
  }

  updated.buildStatus = syncBuildStatusFromProject(updated);
  saveProject(updated);

  return {
    project: updated,
    stepCompleted: targetStep,
    nextStep: updated.currentStep === targetStep ? null : updated.currentStep,
  };
}

export async function runFullPipeline(project: AppProject): Promise<AppProject> {
  let current = { ...project };

  for (const step of [
    "prd", "architecture", "database", "api", "frontend", "backend",
    "auth", "admin", "permissions", "tests", "github", "supabase", "preview", "deploy",
  ] as WizardStepId[]) {
    if (current.completed) break;
    const result = await runPipelineStep(current, step);
    current = result.project;
  }

  return current;
}

export function getProjectProgress(project: AppProject): number {
  return computeWizardProgress(project);
}

export { APPLICATION_FACTORY_VERSION, APPLICATION_FACTORY_DISCLAIMER, STORAGE_KEY };
