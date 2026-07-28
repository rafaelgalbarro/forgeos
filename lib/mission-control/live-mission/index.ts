/** PROGRAM 5300 — Live Mission public API (bridged to lib/live-mission/). */

export type * from "./types";
export { createEmptyLiveMissionState, buildLiveMissionSnapshot } from "./live-mission-snapshot";
export { emitMissionEvent, emitMissionEventAsync, ensureLiveMission, syncLiveMissionFromMission, advanceLiveMissionQueue, registerMissionEventListener, subscribeLiveMissionEvents, emitExecutiveBoardReviewing, emitExecutiveSummaryReady, emitGTMDeliverable, emitGTMPlanReady, emitAutonomousMissionEvent, emitBoardEventToMission } from "./event-emitter";
export { enqueueTask, advanceRunningTasks, createTask, retryTask, markTaskFailed } from "./mission-queue";
export { appendLog, formatLogTime } from "./mission-logs";
export { combinedProgress, phaseProgressPercent } from "./mission-progress";
export { syncDepartmentActivityFromMission, createDefaultDepartmentActivity } from "./department-activity";
export { routeFeedEvent, allFeedItems } from "./mission-feed";
export { getRuntimeStatusHints } from "./adapters/runtime-adapter";
export { getExecutiveMeshHints, applyMeshHintsToActivity } from "./adapters/executive-mesh-adapter";

// PROGRAM 5300 — consolidated coordinator re-exports
export {
  buildSerializableSnapshot,
  createEmptySnapshot,
  collectUIEventsFromMission,
  adaptMissionEvent,
  getLiveMissionSnapshot,
  subscribeLiveMissionSnapshot,
  retryFailedTask,
  failTaskControlled,
} from "@/lib/live-mission";
