/** Program 4000 — First Venture Validation types. */

import type { CeoEngineOutput } from "@/lib/ceo";
import type { MeshPipelineResult } from "@/lib/executive-mesh";
import type { VentureProject } from "@/lib/domain/venture";
import type { VentureIntelligenceSnapshot } from "@/lib/venture-intelligence";
import type { BuildPipelineSnapshot } from "@/lib/build-pipeline";
import type { BuildContext } from "@/lib/build-platform/build-context";
import type { BuildDna } from "@/lib/build-platform/build-dna";

export const FOUNDER_ZERO_VERSION = "Program 4000";
export const FOUNDER_ZERO_DISCLAIMER =
  "Validación heurística dry-run — reutiliza motores existentes de ForgeOS.";

export type ValidationStageId =
  | "idea"
  | "research"
  | "competitors"
  | "market"
  | "business-model"
  | "pricing"
  | "naming"
  | "brand"
  | "logo"
  | "landing"
  | "prd"
  | "architecture"
  | "frontend-plan"
  | "backend-plan"
  | "database-plan"
  | "build-context"
  | "build-dna"
  | "deployment-preview"
  | "investor-readiness"
  | "go-to-market"
  | "launch-checklist";

export type ChecklistStatus = "not_started" | "in_progress" | "completed" | "blocked";

export interface ValidationStage {
  id: ValidationStageId;
  label: string;
  order: number;
  status: ChecklistStatus;
  moduleUsed: string;
  resultSummary: string;
  risks: string[];
  pending: string[];
  recommendations: string[];
}

export interface DepartmentContribution {
  departmentId: string;
  label: string;
  result: string;
  risks: string[];
  pending: string[];
  recommendations: string[];
}

export interface VentureScoreBreakdown {
  marketScore: number;
  businessScore: number;
  executionScore: number;
  productScore: number;
  financialScore: number;
  growthScore: number;
  riskScore: number;
  overallVentureScore: number;
}

export interface ReadinessLevels {
  prototypeReady: boolean;
  mvpReady: boolean;
  betaReady: boolean;
  investorReady: boolean;
  launchReady: boolean;
  prototypeScore: number;
  mvpScore: number;
  betaScore: number;
  investorScore: number;
  launchScore: number;
}

export interface CeoValidationBrief {
  executiveSummary: string;
  currentRisks: string[];
  recommendations: string[];
  nextActions: string[];
  overallReadiness: string;
  confidenceScore: number;
}

export interface VentureHealthSnapshot {
  score: number;
  label: string;
  blockers: string[];
  warnings: string[];
}

export interface ValidationProgress {
  completedCount: number;
  totalCount: number;
  percent: number;
  currentStageId: ValidationStageId | null;
  currentStageLabel: string | null;
}

export interface ValidationReports {
  executive: string;
  technical: string;
  business: string;
  investment: string;
  launch: string;
}

export interface ValidationHistoryEntry {
  id: string;
  ventureId: string;
  ventureName: string;
  ranAt: string;
  overallScore: number;
  completedStages: number;
  totalStages: number;
}

export interface FounderZeroSession {
  ventureId: string;
  lastRunAt: string | null;
  runCount: number;
}

export interface ReusedModuleRef {
  id: string;
  label: string;
  path: string;
  role: string;
}

export interface FounderZeroSnapshot {
  version: string;
  disclaimer: string;
  venture: VentureProject;
  stages: ValidationStage[];
  progress: ValidationProgress;
  health: VentureHealthSnapshot;
  scores: VentureScoreBreakdown;
  readiness: ReadinessLevels;
  ceo: CeoValidationBrief;
  departments: DepartmentContribution[];
  intelligence: VentureIntelligenceSnapshot | null;
  buildContext: BuildContext | null;
  buildDna: BuildDna | null;
  buildPipeline: BuildPipelineSnapshot | null;
  mesh: MeshPipelineResult | null;
  ceoEngine: CeoEngineOutput | null;
  reports: ValidationReports;
  reusedModules: ReusedModuleRef[];
  history: ValidationHistoryEntry[];
  computedAt: string;
}
