/** ForgeOS Venture State Machine — public API (Epic 4.2). */

export type {
  VentureState,
  ActiveVentureState,
  VentureStateContext,
  GuardResult,
  TransitionHistoryRecord,
  TransitionInput,
  TransitionResult,
  SchedulerTaskRecommendation,
  VentureStateSnapshot,
  VentureStateMachine,
  VentureStateMachineOptions,
} from "./types";

export {
  DEFAULT_VENTURE_STATE,
  LINEAR_PIPELINE,
  SPECIAL_STATES,
  ALL_VENTURE_STATES,
  getStateDefinition,
  getStateLabel,
  isActiveState,
  isSpecialState,
  listStateDefinitions,
} from "./states";

export {
  getLinearNext,
  getLinearPrevious,
  getAllowedTargets,
  getExpandedAllowedTargets,
  isStructurallyAllowed,
} from "./transitions";

export { evaluateGuard } from "./guards";

export {
  createVentureStateMachine,
  getSharedVentureStateMachine,
  resetSharedVentureStateMachine,
} from "./state-machine";

export {
  emitStateTransitionEvents,
  STATE_MACHINE_EVENT_TYPES,
  isStateMachineEventType,
  listStateMachineEventTypes,
} from "./state-events";

export type {
  StateMachineEventType,
  VentureStateChangedPayload,
  VentureLifecycleSignalPayload,
} from "./state-events";

export {
  suggestSchedulerTasks,
  getSchedulerTaskLabel,
  formatTransitionSummary,
} from "./scheduler-suggestions";
