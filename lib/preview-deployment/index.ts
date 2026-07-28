/** PROGRAM 5380 — One-Click Preview Deployment public API. */

export { PREVIEW_DEPLOYMENT_VERSION } from "./types";
export type * from "./types";

export {
  getPreviewDeploymentPolicy,
  isPreviewDeploymentEnabled,
  isRealPreviewDeploymentAvailable,
  getPreviewDeploymentFlagsSnapshot,
} from "./config";

export {
  createDeploymentRequest,
  updateDeploymentStatus,
  approveDeploymentRequest,
  rejectDeploymentRequest,
  createDefaultRollbackPlan,
} from "./deployment-request";

export {
  saveDeploymentRequest,
  getDeploymentRequest,
  getDeploymentsForMission,
  listAllDeployments,
  addDeploymentHistoryEntry,
  getDeploymentHistory,
  getActivePreviewDeployments,
} from "./deployment-store";

export { appendAuditEntry, formatAuditSummary, getAuditLogForMission } from "./deployment-audit";

export {
  validateDeploymentPreconditions,
  allBlockingPreconditionsPassed,
  canPublishPreview,
} from "./deployment-validator";

export { buildDeploymentPlan, buildCodePushPlan } from "./deployment-planner";

export { runDeploymentSteps, rollbackDeployment } from "./deployment-runner";

export { runSmokeTests, runHealthCheck, healthCheckPassed } from "./deployment-health";

export {
  createPreviewDeploymentDraft,
  requestDeploymentApproval,
  approvePreviewDeployment,
  rejectPreviewDeployment,
  executePreviewDeployment,
  rollbackPreviewDeployment,
  getDeploymentSnapshot,
} from "./deployment-orchestrator";

export {
  runNexoraPreviewDeploymentE2E,
  runNexoraPreviewDeployExecute,
  NEXORA_PREVIEW_DEPLOY_MISSION_ID,
} from "./e2e-nexora";
