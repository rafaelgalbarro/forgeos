/** Program 4600 — Mobile Factory public API. */

export type * from "./types";
export {
  MOBILE_FACTORY_VERSION,
  MOBILE_FACTORY_DISCLAIMER,
  MOBILE_TECH_STACK,
} from "./types";

export { MOBILE_TEMPLATES, getTemplateById, getTemplatesByCategory } from "./templates";

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

export { generateNavigation, formatNavigationSummary } from "./navigation-generator";
export { generateScreens, formatScreensSummary } from "./screens-generator";
export { generateAuthFlow, formatAuthSummary } from "./auth-generator";
export { generateApiIntegration, formatApiSummary } from "./api-integration";
export { generateProjectStructure, formatStructureSummary } from "./project-structure";
export { generateExpoPreview, updatePreviewStatus, formatPreviewSummary } from "./preview";
export {
  createPlatformBuild,
  runPlatformBuild,
  formatBuildSummary,
  getBuildStatusVariant,
} from "./build-status";

export {
  createMobileProject,
  readMobileFactorySnapshot,
  writeMobileFactorySnapshot,
  saveProject,
  getProjectById,
  deleteProject,
  runPipelineStep,
  runFullPipeline,
  getProjectProgress,
} from "./pipeline";

export { DEMO_PROJECT_ID, createDemoMobileProject } from "./seed/demo-project";
