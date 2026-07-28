/** PROGRAM 6030 — Snapshot types for Mission Control consumption. */

import type { CostEstimate, DepartmentId, DurationEstimate } from "../../domain/types";
import type {
  ApprovalRecord,
  MissionKernelStatus,
  NodeStatus,
  ProgressBreakdown,
  WorkflowNodeType,
} from "../types";

export interface NodeSnapshot {
  nodeId: string;
  type: WorkflowNodeType;
  label: string;
  status: NodeStatus;
  progress: number;
  department: DepartmentId;
  error?: string;
  artifactRefs: string[];
}

export interface StageSnapshot {
  stageId: string;
  label: string;
  status: NodeStatus;
  progress: number;
  nodeIds: string[];
}

export interface DepartmentSnapshot {
  department: DepartmentId;
  activeNodes: number;
  completedNodes: number;
  failedNodes: number;
}

export interface ApprovalSnapshot {
  pending: ApprovalRecord[];
  granted: ApprovalRecord[];
  denied: ApprovalRecord[];
}

export interface CostSnapshot {
  estimated: CostEstimate;
  durationEstimated: DurationEstimate;
  /** Always explicit — never implied as actual billing. */
  disclaimer: string;
}

export interface MissionExecutionSnapshot {
  missionId: string;
  planId: string;
  planVersion: number;
  status: MissionKernelStatus;
  objective: string;
  progress: ProgressBreakdown;
  stages: StageSnapshot[];
  nodes: NodeSnapshot[];
  departments: DepartmentSnapshot[];
  approvals: ApprovalSnapshot;
  cost: CostSnapshot;
  capturedAt: string;
  eventsTail: Array<{ type: string; timestamp: string }>;
}
