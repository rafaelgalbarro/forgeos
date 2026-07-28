/** Program 4500 — Application Factory public API. */

export type * from "./types";
export {
  APPLICATION_FACTORY_VERSION,
  APPLICATION_FACTORY_DISCLAIMER,
  APP_TECH_STACK,
} from "./types";

export {
  WIZARD_STEP_ORDER,
  createInitialSteps,
  getNextStep,
  getPreviousStep,
  canAdvance,
  advanceWizard,
  setStepStatus,
  goToStep,
  computeWizardProgress,
  isWizardComplete,
} from "./wizard";

export { generatePRD, formatPRDSummary } from "./prd-generator";
export { generateArchitecture, formatArchitectureSummary } from "./architecture-generator";
export { generateDatabaseSchema, formatDatabaseSummary } from "./database-generator";
export { generateAPIRoutes, formatAPISummary } from "./api-generator";
export { generateFrontendPages, formatFrontendSummary } from "./frontend-generator";
export { generateBackendModules, formatBackendSummary } from "./backend-generator";
export { generateAuthConfig, formatAuthSummary } from "./auth-generator";
export { generateAdminPanel, formatAdminSummary } from "./admin-generator";
export { generatePermissions, formatPermissionsSummary } from "./permissions-generator";
export { generateTestSuite, formatTestsSummary } from "./tests-generator";
export {
  generatePreviewApp,
  formatPreviewSummary,
  getPreviewPageById,
  resolvePreviewNavigation,
} from "./preview-app";
export {
  createInitialBuildStatus,
  updateBuildPhase,
  syncBuildStatusFromProject,
  statusLabelEs,
  getBuildPhaseLabel,
} from "./build-status";
export { generateExportBundle, formatExportManifest, createDownloadStub } from "./export";

export {
  createAppProject,
  readApplicationFactorySnapshot,
  writeApplicationFactorySnapshot,
  saveProject,
  getProjectById,
  deleteProject,
  runPipelineStep,
  runFullPipeline,
  getProjectProgress,
  STORAGE_KEY,
} from "./pipeline";

export { DEMO_PROJECT_ID, createDemoAppProject } from "./seed/demo-project";
