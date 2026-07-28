/** Executive Intelligence Mesh — core types (RC3.5). */

export type MeshDepartmentId =
  | "ceo"
  | "cto"
  | "cpo"
  | "cmo"
  | "cfo"
  | "coo"
  | "research"
  | "product"
  | "ux"
  | "architecture"
  | "backend"
  | "frontend"
  | "qa"
  | "security"
  | "legal"
  | "growth"
  | "sales"
  | "customer-success"
  | "support"
  | "finance"
  | "capital"
  | "knowledge"
  | "analytics"
  | "deployment"
  | "infrastructure";

export type MeshAction =
  | "consult"
  | "debate"
  | "delegate"
  | "request_review"
  | "escalate"
  | "reject"
  | "approve"
  | "consensus"
  | "request_skill"
  | "request_capability"
  | "vote"
  | "await_response"
  | "update_memory";

export type MeetingType =
  | "daily-executive"
  | "weekly-board"
  | "product-review"
  | "build-review"
  | "risk-review"
  | "investment-review"
  | "deployment-review";

export type PipelineStage =
  | "founder"
  | "ceo"
  | "debate-check"
  | "executive-board"
  | "specialists"
  | "consensus"
  | "decision-graph"
  | "execution-plan"
  | "runtime"
  | "response";

export interface MeshDepartment {
  id: MeshDepartmentId;
  label: string;
  role: string;
  reportsTo: MeshDepartmentId | null;
  specialties: string[];
  boardSeat?: boolean;
}

export interface MeshCollaborationLink {
  from: MeshDepartmentId;
  to: MeshDepartmentId;
  action: MeshAction;
  label: string;
}

export interface ExecutiveScore {
  departmentId: MeshDepartmentId;
  confidence: number;
  historicalAccuracy: number;
  costIndex: number;
  latencyMs: number;
  specialty: string;
  workload: number;
  participation: number;
  quality: number;
  updatedAt: string;
}

export interface MeshDebateArgument {
  departmentId: MeshDepartmentId;
  position: string;
  argumentsFor: string[];
  argumentsAgainst: string[];
  confidence: number;
  needsMoreInfo: boolean;
}

export interface MeshDebate {
  id: string;
  topic: string;
  participants: MeshDepartmentId[];
  arguments: MeshDebateArgument[];
  status: "open" | "escalated" | "resolved";
  escalatedToCeo: boolean;
  resolution?: string;
  createdAt: string;
}

export interface MeshMeeting {
  id: string;
  type: MeetingType;
  title: string;
  agenda: string[];
  participants: MeshDepartmentId[];
  arguments: MeshDebateArgument[];
  consensus?: string;
  actions: string[];
  followUp: string[];
  scheduledAt: string;
  completedAt?: string;
}

export interface MeshMemoryRecord {
  id: string;
  timestamp: string;
  ventureId: string;
  owner: MeshDepartmentId;
  contributors: MeshDepartmentId[];
  reasoning: string;
  confidence: number;
  knowledgeRefs: string[];
  decisionId?: string;
  timelineEventId?: string;
  pipelineStages: PipelineStage[];
}

export interface FounderRequest {
  ventureId: string;
  ventureName: string;
  topic: string;
  urgency: "low" | "medium" | "high";
  requiresDebate?: boolean;
}

export interface MeshPipelineResult {
  requestId: string;
  ventureId: string;
  stages: PipelineStage[];
  needsDebate: boolean;
  ceoResponse?: string;
  consensus?: string;
  decisionId?: string;
  executionPlan: string[];
  runtimeDispatched: boolean;
  memoryRecordId: string;
  debateId?: string;
  meetingId?: string;
  scores: ExecutiveScore[];
  latencyMs: number;
  warnings: string[];
}

export interface MeshConversationTurn {
  departmentId: MeshDepartmentId;
  action: MeshAction;
  message: string;
  targetDepartmentId?: MeshDepartmentId;
  confidence: number;
  at: string;
}
