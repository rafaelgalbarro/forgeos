/** PROGRAM 5100/5150/5200/5300 — Mission Control core types (coordinator only). */

import type { LiveMissionState } from "./live-mission/types";
import type { CEOInsight, DecisionRecord } from "./pair-founder/types";

export type { CEOInsight, DecisionRecord } from "./pair-founder/types";

export const MISSION_CONTROL_VERSION = "PROGRAM 5150 — MISSION CONTROL E2E VALIDATION";

/** PROGRAM 5150 — official mission session statuses */
export type MissionSessionStatus =
  | "DRAFT"
  | "UNDERSTANDING"
  | "PLANNING"
  | "BUILDING"
  | "VALIDATING"
  | "READY_FOR_DEPLOY"
  | "OPERATING"
  | "EVOLVING"
  | "PAUSED"
  | "BLOCKED"
  | "COMPLETED"
  | "FAILED";

/** PROGRAM 5150 — classified intent (primary + optional secondary) */
export interface MissionIntent {
  primary: IntentionType;
  secondary?: IntentionType[];
  confidence: number;
  extractedIdea?: string;
  clarifyingQuestion?: string;
  /** CEO rationale for venture-first / web-app / website / mobile */
  ceoRationale?: {
    ventureFirst?: string;
    webApp?: string;
    publicWebsite?: string;
    mobileTiming?: string;
  };
}

/** PROGRAM 5150 — session state aggregate */
export interface MissionState {
  sessionStatus: MissionSessionStatus;
  phase: MissionPhase;
  understandingComplete: boolean;
  planComplete: boolean;
  buildComplete: boolean;
  validateComplete: boolean;
  deployPrepared: boolean;
  operatePrepared: boolean;
  evolvePrepared: boolean;
  blockedReason?: string;
  pausedAt?: string;
}

/** PROGRAM 5150 — plan/build/validate stage item */
export type MissionStageStatus = "pending" | "in_progress" | "completed" | "blocked" | "skipped";

export interface MissionStage {
  id: string;
  label: string;
  phase: MissionPhase;
  owner: string;
  department: string;
  dependencies: string[];
  status: MissionStageStatus;
  expectedResult: string;
  estimatedMinutes: number;
  approvalRequired: boolean;
  approved?: boolean;
}

/** PROGRAM 5150 — append-only mission event */
export interface MissionEvent {
  id: string;
  timestamp: string;
  type: "stage" | "decision" | "artifact" | "score" | "system" | "conversation";
  label: string;
  phase?: MissionPhase;
  department?: string;
  metadata?: Record<string, string | number | boolean>;
}

/** PROGRAM 5150 — persisted decision (extends pending decision contract) */
export interface MissionDecision {
  id: string;
  category: DecisionCategory | string;
  title: string;
  description: string;
  options: string[];
  resolved: boolean;
  selectedOption?: string;
  important: boolean;
  askedAt: string;
  resolvedAt?: string;
  context?: string;
}

/** PROGRAM 5150 — generated artifact reference */
export interface MissionArtifact {
  id: string;
  type: "plan" | "preview" | "score" | "deployment" | "report" | "build";
  label: string;
  phase: MissionPhase;
  source: "demo" | "heuristic" | "real";
  href?: string;
  summary?: string;
  createdAt: string;
}

/** PROGRAM 5150 — validation score set */
export interface MissionValidationScores {
  venture: number;
  product: number;
  technical: number;
  market: number;
  risk: number;
  mvpReadiness: number;
  launchReadiness: number;
  investorReadiness: number;
  source: "demo" | "heuristic" | "real";
  generatedAt: string;
}

/** PROGRAM 5150 — append-only history record */
export interface MissionHistoryEntry {
  id: string;
  timestamp: string;
  action: string;
  phase: MissionPhase;
  sessionStatus: MissionSessionStatus;
  detail?: string;
}

export interface MissionHistory {
  missionId: string;
  entries: MissionHistoryEntry[];
}

/** PROGRAM 5150 — full mission session (persistence contract) */
export interface MissionSession {
  missionId: string;
  workspaceId: string;
  ventureId?: string;
  ventureSlug?: string;
  founderId: string;
  intent: MissionIntent | null;
  currentStage: MissionPhase;
  status: MissionSessionStatus;
  state: MissionState;
  conversation: MissionMessage[];
  decisions: MissionDecision[];
  artifacts: MissionArtifact[];
  events: MissionEvent[];
  pendingApprovals: MissionDecision[];
  activeDepartments: string[];
  planStages?: MissionStage[];
  validationScores?: MissionValidationScores;
  createdAt: string;
  updatedAt: string;
}

export type MissionPhase =
  | "UNDERSTAND"
  | "PLAN"
  | "BUILD"
  | "VALIDATE"
  | "DEPLOY"
  | "OPERATE"
  | "EVOLVE";

export type IntentionType = "VENTURE" | "WEBSITE" | "APPLICATION" | "MOBILE" | "DISCOVERY";

export type DecisionCategory =
  | "PRICING"
  | "BRANDING"
  | "DOMAIN"
  | "ARCHITECTURE"
  | "DEPLOYMENT";

export type SnapshotDomain =
  | "research"
  | "businessModel"
  | "brand"
  | "website"
  | "application"
  | "mobile"
  | "prd"
  | "architecture"
  | "marketing"
  | "financials"
  | "investorReadiness"
  | "deployment"
  | "gtm";

export type SnapshotStatus = "idle" | "in_progress" | "completed" | "blocked";

export interface SnapshotItem {
  id: SnapshotDomain;
  label: string;
  status: SnapshotStatus;
  progress: number;
  summary?: string;
}

export interface MissionMessage {
  id: string;
  role: "user" | "ceo" | "system";
  content: string;
  timestamp: string;
  decisionPrompt?: boolean;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  label: string;
  phase?: MissionPhase;
  icon?: string;
}

export interface LiveExecutionStep {
  id: string;
  label: string;
  department: string;
  status: "pending" | "working" | "completed";
}

export interface LiveExecutionStatus {
  active: boolean;
  steps: LiveExecutionStep[];
  currentStepId?: string;
}

export interface PendingDecision {
  id: string;
  category: DecisionCategory;
  title: string;
  description: string;
  options: string[];
  resolved: boolean;
  selectedOption?: string;
  important: boolean;
}

export interface AutoPilotState {
  enabled: boolean;
  pausedForDecision: boolean;
  lastAutoAction?: string;
}

export interface DiscoveryOpportunity {
  id: string;
  title: string;
  ventureScore: number;
  market: string;
  roi: string;
  mvpTime: string;
  investment: string;
  scalability: string;
  summary: string;
}

export interface ExecutiveCouncilSummary {
  visible: boolean;
  headline: string;
  summary: string;
  departments: string[];
  confidence: number;
}

export type { ExecutiveBoardSession, ExecutiveSummary, DepartmentReview } from "./executive-board/types";

export interface MissionStatusSummary {
  ceoStatus: string;
  confidence: number;
  nextDecision?: string;
  activeDepartments: string[];
  risks: string[];
  recommendations: string[];
  executiveCouncil?: ExecutiveCouncilSummary;
}

export interface Mission {
  id: string;
  title: string;
  intention: IntentionType | null;
  phase: MissionPhase;
  createdAt: string;
  updatedAt: string;
  idea?: string;
  projectId?: string;
  factoryRoute?: string;
  discoveryProfile?: Record<string, string>;
  messages: MissionMessage[];
  timeline: TimelineEvent[];
  liveExecution: LiveExecutionStatus;
  pendingDecisions: PendingDecision[];
  autoPilot: AutoPilotState;
  snapshots: SnapshotItem[];
  status: MissionStatusSummary;
  liveMission?: LiveMissionState;
  /** PROGRAM 5200 — latest CEO co-founder insight */
  ceoInsight?: CEOInsight;
  /** PROGRAM 5200 — append-only decision log */
  decisionLog?: DecisionRecord[];
  /** PROGRAM 5400 — Executive Board session state */
  executiveBoard?: import("./executive-board/types").ExecutiveBoardSession;
  /** PROGRAM 5500 — autonomous build state */
  autonomous?: import("./autonomous-build/types").AutonomousState;
  /** PROGRAM 5700 — lightweight GTM snapshot */
  gtmSnapshot?: import("./go-to-market/types").GTMSnapshot;
  /** PROGRAM 5700 — GTM generation in progress */
  gtmGenerating?: boolean;
  /** PROGRAM 5800 — investor mode snapshot */
  investorSnapshot?: import("./investor-mode/types").InvestorModeSnapshot;
}

export interface MissionSnapshot {
  version: string;
  generatedAt: string;
  activeMissionId: string | null;
  missionCount: number;
  defaultSnapshots: SnapshotItem[];
  aiEnabled: boolean;
  autoPilotDefault: boolean;
  /** PROGRAM 5200 — SSR-safe CEO insight placeholder */
  ceoInsightDefaults?: {
    ventureUnderstanding: string;
    nextAction: string;
  };
  /** PROGRAM 5700 — GTM module available */
  gtmEnabled?: boolean;
  gtmProgramVersion?: string;
  /** PROGRAM 5600 — post-deploy company workspace seed */
  companyWorkspaces?: import("./autonomous-company/types").CompanyWorkspacesSnapshot;
  /** PROGRAM 5800 — investor mode SSR snapshot */
  investorMode?: import("./investor-mode/types").InvestorModeSnapshot;
}

export interface IntentionResult {
  intention: IntentionType | null;
  confidence: number;
  clarifyingQuestion?: string;
  extractedIdea?: string;
}

export interface ConversationTurnResult {
  mission: Mission;
  reply: string;
  awaitingInput: boolean;
  showExecutiveBanner: boolean;
  routeHint?: string;
  executiveBoardReviewing?: boolean;
  executiveBoardSession?: import("./executive-board/types").ExecutiveBoardSession;
  /** PROGRAM 5700 — GTM package was generated this turn */
  gtmGenerated?: boolean;
  /** PROGRAM 5800 — investor package was generated this turn */
  investorGenerated?: boolean;
}

export interface FactoryRouteResult {
  factory: IntentionType;
  href: string;
  projectId?: string;
  label: string;
}
