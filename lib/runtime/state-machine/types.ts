/** ForgeOS Venture State Machine — type contracts (Epic 4.2). */

import type { SchedulerTaskType } from "../scheduler/types";

/** Official venture lifecycle states. */
export type VentureState =
  | "IDEA"
  | "DISCOVERY"
  | "RESEARCH"
  | "PRODUCT"
  | "ARCHITECTURE"
  | "UX"
  | "BUILD"
  | "QA"
  | "LAUNCH"
  | "GROWTH"
  | "SCALE"
  | "CAPITAL"
  | "EXIT"
  | "PAUSED"
  | "BLOCKED"
  | "ARCHIVED";

export type ActiveVentureState = Exclude<
  VentureState,
  "PAUSED" | "BLOCKED" | "ARCHIVED"
>;

/** Context used by heuristic guards — supplied by callers, not fetched internally. */
export interface VentureStateContext {
  ventureId: string;
  /** Discovery stage has meaningful artifacts (answers, decisions, etc.). */
  discoveryComplete?: boolean;
  discoveryArtifacts?: string[];
  /** Research stage marked complete. */
  researchComplete?: boolean;
  /** Product PRD exists and is non-empty. */
  hasProductPrd?: boolean;
  /** QA sign-off completed. */
  qaComplete?: boolean;
  /** Minimum capital metrics threshold met. */
  hasMinimumMetrics?: boolean;
  /** Optional metric snapshot for guard warnings. */
  metrics?: Record<string, number>;
  /** Required when resuming from BLOCKED. */
  blockResolved?: boolean;
}

export interface GuardResult {
  allowed: boolean;
  reason: string;
  missingRequirements: string[];
  warnings: string[];
}

export interface TransitionHistoryRecord {
  id: string;
  ventureId: string;
  from: VentureState;
  to: VentureState;
  reason: string;
  triggeredBy: string;
  createdAt: string;
  warnings: string[];
  metadata: Record<string, unknown>;
}

export interface TransitionInput {
  ventureId: string;
  to: VentureState;
  reason: string;
  triggeredBy: string;
  context: VentureStateContext;
  metadata?: Record<string, unknown>;
}

export interface TransitionResult {
  success: boolean;
  from: VentureState;
  to: VentureState;
  guard: GuardResult;
  historyRecord?: TransitionHistoryRecord;
  /** Scheduler task suggestions — recommendations only, no execution. */
  suggestedTasks: SchedulerTaskRecommendation[];
  /** Events emitted during this transition (if success). */
  emittedEventIds: string[];
}

/** Maps to SchedulerTaskType when available; otherwise a documented recommendation string. */
export interface SchedulerTaskRecommendation {
  taskType: SchedulerTaskType | string;
  label: string;
  from: VentureState;
  to: VentureState;
  note?: string;
}

export interface VentureStateSnapshot {
  ventureId: string;
  state: VentureState;
  /** State before PAUSED or BLOCKED (for resume). */
  resumeState: VentureState | null;
  updatedAt: string;
}

export interface VentureStateMachineOptions {
  maxHistory?: number;
}

export interface VentureStateMachine {
  getState(ventureId: string): VentureState;
  getSnapshot(ventureId: string): VentureStateSnapshot;
  canTransition(
    ventureId: string,
    to: VentureState,
    context: VentureStateContext,
  ): GuardResult;
  transition(input: TransitionInput): TransitionResult;
  getAvailableTransitions(
    ventureId: string,
    context: VentureStateContext,
  ): VentureState[];
  getHistory(ventureId?: string, limit?: number): TransitionHistoryRecord[];
  clear(): void;
}
