/** Program 10000 — Generic Venture E2E types. */

import type { CeoEngineOutput } from "@/lib/ceo";
import type { MeshPipelineResult } from "@/lib/executive-mesh";
import type { VentureProject } from "@/lib/domain/venture";
import type { VentureIntelligenceSnapshot } from "@/lib/venture-intelligence";
import type { BuildPipelineSnapshot } from "@/lib/build-pipeline";
import type { BuildContext } from "@/lib/build-platform/build-context";
import type { BuildDna } from "@/lib/build-platform/build-dna";
import type { ReusedModuleRef } from "@/lib/founder-zero/types";

export const VENTURE_E2E_VERSION = "Program 10000";
export const VENTURE_E2E_DISCLAIMER =
  "Pipeline E2E genérico — reutiliza motores públicos de ForgeOS sin lógica específica por venture.";

export type E2EStageId =
  | "idea"
  | "research"
  | "market"
  | "competitors"
  | "business-model"
  | "pricing"
  | "brand"
  | "landing"
  | "prd"
  | "architecture"
  | "build-context"
  | "build-dna"
  | "deployment-preview"
  | "investor-readiness"
  | "go-to-market"
  | "launch-checklist";

export type E2EChecklistStatus = "not_started" | "in_progress" | "completed" | "blocked";

export interface E2EStage {
  id: E2EStageId;
  label: string;
  order: number;
  status: E2EChecklistStatus;
  moduleUsed: string;
  resultSummary: string;
  risks: string[];
  pending: string[];
  recommendations: string[];
}

export interface E2EProgress {
  completedCount: number;
  totalCount: number;
  percent: number;
  currentStageId: E2EStageId | null;
  currentStageLabel: string | null;
}

export interface E2EVentureHealth {
  score: number;
  label: string;
  blockers: string[];
  warnings: string[];
}

export interface E2EVentureScores {
  marketScore: number;
  businessScore: number;
  executionScore: number;
  productScore: number;
  financialScore: number;
  growthScore: number;
  riskScore: number;
  overallVentureScore: number;
}

export interface E2EReadiness {
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

export interface E2ECeoBrief {
  executiveSummary: string;
  currentRisks: string[];
  recommendations: string[];
  nextActions: string[];
  overallReadiness: string;
  confidenceScore: number;
}

export interface E2EDepartmentContribution {
  departmentId: string;
  label: string;
  result: string;
  risks: string[];
  pending: string[];
  recommendations: string[];
}

export interface E2EReports {
  executive: string;
  businessPlan: string;
  technicalArchitecture: string;
  investorReadiness: string;
  launchPlan: string;
}

export interface VentureE2ESnapshot {
  version: string;
  disclaimer: string;
  venture: VentureProject;
  ventureSlug: string;
  stages: E2EStage[];
  progress: E2EProgress;
  health: E2EVentureHealth;
  scores: E2EVentureScores;
  readiness: E2EReadiness;
  ceo: E2ECeoBrief;
  departments: E2EDepartmentContribution[];
  intelligence: VentureIntelligenceSnapshot | null;
  buildContext: BuildContext | null;
  buildDna: BuildDna | null;
  buildPipeline: BuildPipelineSnapshot | null;
  mesh: MeshPipelineResult | null;
  ceoEngine: CeoEngineOutput | null;
  reports: E2EReports;
  reusedModules: ReusedModuleRef[];
  computedAt: string;
}
