/** Program 4500 — Demo app project seed (TaskFlow — task manager). */

import type { AppProject } from "../types";
import { createInitialSteps } from "../wizard";
import { generatePRD } from "../prd-generator";
import { generateArchitecture } from "../architecture-generator";
import { generateDatabaseSchema } from "../database-generator";
import { generateAPIRoutes } from "../api-generator";
import { generateFrontendPages } from "../frontend-generator";
import { generateBackendModules } from "../backend-generator";
import { generateAuthConfig } from "../auth-generator";
import { generateAdminPanel } from "../admin-generator";
import { generatePermissions } from "../permissions-generator";
import { generateTestSuite } from "../tests-generator";
import { generatePreviewApp } from "../preview-app";
import { createInitialBuildStatus, syncBuildStatusFromProject } from "../build-status";
import { generateExportBundle } from "../export";

export const DEMO_PROJECT_ID = "af-demo-taskflow";

export function createDemoAppProject(): AppProject {
  const name = "TaskFlow";
  const description =
    "Gestor de tareas con equipos, prioridades, dashboard de productividad y panel de administración.";
  const now = new Date().toISOString();

  const prd = generatePRD(name, description);
  const architecture = generateArchitecture(name, prd);
  const database = generateDatabaseSchema(name, prd);
  const api = generateAPIRoutes(name, database);
  const frontend = generateFrontendPages(name, prd);
  const backend = generateBackendModules(name, database);
  const auth = generateAuthConfig(name);
  const admin = generateAdminPanel(name);
  const permissions = generatePermissions(name);
  const tests = generateTestSuite(name);

  const steps = createInitialSteps().map((s) => ({
    ...s,
    status:
      s.id === "deploy"
        ? ("pending" as const)
        : s.id === "github" || s.id === "supabase"
          ? ("stub" as const)
          : ("success" as const),
    summary:
      s.id === "prd"
        ? `${prd.features.length} features`
        : s.id === "preview"
          ? "8 páginas navegables"
          : undefined,
  }));

  const base: AppProject = {
    id: DEMO_PROJECT_ID,
    name,
    description,
    createdAt: now,
    updatedAt: now,
    currentStep: "preview",
    steps,
    prd,
    architecture,
    database,
    api,
    frontend,
    backend,
    auth,
    admin,
    permissions,
    tests,
    preview: null,
    buildStatus: createInitialBuildStatus(DEMO_PROJECT_ID),
    exportBundle: null,
    completed: false,
  };

  const preview = generatePreviewApp(base);
  const exportBundle = generateExportBundle({ ...base, preview });
  const buildStatus = syncBuildStatusFromProject({ ...base, preview });

  return {
    ...base,
    preview,
    exportBundle,
    buildStatus,
  };
}
