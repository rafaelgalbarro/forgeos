/** PROGRAM 5300 — Live Mission public API (consolidated coordinator). */

export type * from "./types";
export {
  adaptMissionEvent,
  adaptHistoryEntry,
  adaptTaskSnapshot,
  collectUIEventsFromMission,
  taskStatusToVisible,
  autonomousStatusToVisible,
  wireMissionEventAdapter,
} from "./mission-event-adapter";
export { buildSerializableSnapshot, createEmptySnapshot } from "./live-mission-snapshot";
export {
  selectMissionProgress,
  selectMissionStage,
  selectMissionState,
  selectRecentEvents,
  selectQueuedTasks,
  selectRunningTasks,
  selectCompletedTasks,
  selectFailedTasks,
  selectActiveDepartments,
  selectAllDepartments,
  selectArtifactFeed,
  selectErrorsAndWarnings,
  selectEtaSeconds,
  selectHasActiveWork,
  selectApprovalEvents,
  formatEta,
  visibleStateLabel,
  visibleStateBadgeVariant,
} from "./live-mission-selector";
export {
  getLiveMissionSnapshot,
  subscribeLiveMissionSnapshot,
  subscribeLiveMissionUIEvents,
  retryFailedTask,
  failTaskControlled,
  enqueueDemoTask,
  useLiveMissionSnapshot,
} from "./live-mission-store";
