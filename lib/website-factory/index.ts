/** PROGRAM 4400 — Website Factory public API. */

export type * from "./types";
export {
  WEBSITE_FACTORY_VERSION,
  WEBSITE_FACTORY_DISCLAIMER,
} from "./types";

export { WIZARD_STEPS, createInitialSteps, computeWizardProgress, getNextStepId, getPreviousStepId, setActiveStep, markStepCompleted, canAdvanceStep, getStepDefinition } from "./wizard";
export { WEBSITE_TEMPLATES, getTemplateById, listTemplatesByCategory } from "./templates";
export { generateWebsitePreview, generatePreviewSrcDoc } from "./preview";
export type { WebsitePreviewDocument } from "./preview";
export { generateExportBundle, formatExportManifest, createDownloadStub } from "./export";
export { createInitialBuildStatus, updateBuildPhase, syncBuildStatusFromProject, getBuildPhaseLabel, statusLabelEs } from "./build-status";
export {
  readAllProjects,
  writeAllProjects,
  getProjectById,
  saveProject,
  deleteProject,
  ensureDemoProjectSeeded,
  createWebsiteProject,
  runPipelineStep,
  runFullPipeline,
  updateProjectIdea,
  updateProjectBrand,
  listProjects,
} from "./pipeline";
export type { CreateProjectInput } from "./pipeline";
export { createDemoWebsiteProject, DEMO_PROJECT_ID } from "./fixtures/demo-project";
