/** PROGRAM 5500 — Autonomous Build public API. */

export type * from "./types";
export { AUTONOMOUS_BUILD_VERSION } from "./types";

export {
  detectApprovalReason,
  createApprovalGate,
  requiresApproval,
  approvalReasonLabel,
} from "./approval-gates";

export {
  createCheckpoint,
  saveCheckpoint,
  readCheckpoints,
  getLatestCheckpoint,
  restoreFromCheckpoint,
} from "./mission-checkpoints";

export { pauseAutonomous, isAutonomousPaused, canAutonomousRun } from "./mission-pause";
export { resumeAutonomous, resumeFromCheckpoint } from "./mission-resume";

export {
  checkTaskForApproval,
  resolveApproval,
  formatApprovalQuestion,
} from "./mission-approval";

export {
  createWorkers,
  assignWorker,
  releaseWorker,
  advanceWorkerTask,
  startWorkerOnTask,
} from "./mission-workers";

export {
  buildAutonomousQueue,
  scheduleNextTask,
  estimateEtaSeconds,
  getCurrentTask,
  getNextTask,
  getCompletedTasks,
  isQueueComplete,
} from "./autonomous-queue";

export {
  createAutonomousState,
  setAutonomousEnabled,
  tickAutonomous,
  handleApprovalResponse,
  pauseAutonomousLoop,
  buildPanelView,
  attachAutonomousState,
} from "./autonomous-orchestrator";
