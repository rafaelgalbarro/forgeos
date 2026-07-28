/** PROGRAM 5400 — Executive Board types (structured snapshots only). */

import type { MissionPhase, PendingDecision } from "../types";

export type ImpactLevel = "low" | "medium" | "high";

export type BoardDepartmentId =
  | "CEO"
  | "CTO"
  | "CFO"
  | "CMO"
  | "Legal"
  | "Research"
  | "QA";

export interface BoardParticipant {
  id: BoardDepartmentId;
  label: string;
  labelEn: string;
  focus: string;
}

export interface DepartmentReview {
  department: BoardDepartmentId;
  recomendacion: string;
  riesgos: string[];
  impacto: ImpactLevel;
  confianza: number;
  completedAt: string;
}

export interface ExecutiveSummary {
  finalRecommendation: string;
  alternatives: string[];
  risks: string[];
  confidence: number;
  headline: string;
  headlineEn: string;
  synthesizedAt: string;
}

export type BoardTriggerReason =
  | "phase_validate"
  | "phase_deploy"
  | "decision_pricing"
  | "decision_architecture"
  | "decision_deployment"
  | "pair_founder_high_risk"
  | "contradiction"
  | "user_requested"
  | "auto_pilot_approval";

export interface BoardTriggerContext {
  reason: BoardTriggerReason;
  label: string;
  phase?: MissionPhase;
  decision?: PendingDecision;
}

export type ExecutiveBoardStatus = "idle" | "reviewing" | "ready";

export interface ExecutiveBoardSession {
  id: string;
  status: ExecutiveBoardStatus;
  trigger: BoardTriggerContext;
  reviews: DepartmentReview[];
  summary?: ExecutiveSummary;
  activeDepartments: BoardDepartmentId[];
  startedAt: string;
  completedAt?: string;
}

export interface ExecutiveBoardResult {
  session: ExecutiveBoardSession;
  shouldShow: boolean;
  ceoInjection?: string;
}
