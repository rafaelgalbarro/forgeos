/** PROGRAM 5900 — Exit Strategy types (coordinator only). */

import type { MissionPhase } from "../types";

export const EXIT_STRATEGY_VERSION = "PROGRAM 5900 — EXIT STRATEGY" as const;
export const EXIT_STRATEGY_STORAGE_PREFIX = "forgeos-exit-strategy-" as const;

export type ExitStrategyType =
  | "venta"
  | "crecimiento_independiente"
  | "dividendos"
  | "venture_capital"
  | "patrimonio_familiar";

export type AdaptationDomain = "roadmap" | "finanzas" | "marketing" | "producto";

export type DecisionImpactLevel = "positive" | "neutral" | "negative";

export interface ExitStrategyKPI {
  id: string;
  label: string;
  target: string;
  weight: number;
}

export interface ExitStrategyConfig {
  type: ExitStrategyType;
  label: string;
  labelEs: string;
  description: string;
  icon: string;
  timelineYears: string;
  primaryKPIs: ExitStrategyKPI[];
  risks: string[];
  /** Snapshot domains to emphasize (0-100 weight) */
  domainWeights: Record<AdaptationDomain, number>;
}

export interface ExitStrategySelection {
  missionId: string;
  strategy: ExitStrategyType;
  selectedAt: string;
  previousStrategy?: ExitStrategyType;
  changeCount: number;
}

export interface ReadinessDimension {
  id: string;
  label: string;
  score: number;
  maxScore: number;
  note: string;
}

export interface ExitReadiness {
  score: number;
  strategy: ExitStrategyType;
  dimensions: ReadinessDimension[];
  gaps: string[];
  recommendedNextStep: string;
  computedAt: string;
}

export interface MisalignedArea {
  domain: AdaptationDomain;
  label: string;
  currentState: string;
  expectedState: string;
  severity: "low" | "medium" | "high";
}

export interface StrategicAlignment {
  score: number;
  strategy: ExitStrategyType;
  alignedAreas: string[];
  misalignedAreas: MisalignedArea[];
  computedAt: string;
}

export interface DecisionImpact {
  decisionId: string;
  decisionTitle: string;
  impact: DecisionImpactLevel;
  explanation: string;
  strategy: ExitStrategyType;
}

export interface AdaptationRecommendation {
  domain: AdaptationDomain;
  label: string;
  priority: "high" | "medium" | "low";
  action: string;
  rationale: string;
}

export interface AdaptationPlan {
  strategy: ExitStrategyType;
  recommendations: AdaptationRecommendation[];
  snapshotAdjustments: Array<{ domain: string; progressDelta: number; summary: string }>;
  generatedAt: string;
}

export interface ExitStrategyDelta {
  previousStrategy: ExitStrategyType | null;
  newStrategy: ExitStrategyType;
  changedDomains: AdaptationDomain[];
  summary: string;
}

export interface ExitStrategySnapshot {
  version: typeof EXIT_STRATEGY_VERSION;
  missionId: string;
  generatedAt: string;
  selection: ExitStrategySelection | null;
  readiness: ExitReadiness | null;
  alignment: StrategicAlignment | null;
  adaptationPlan: AdaptationPlan | null;
  decisionImpacts: DecisionImpact[];
  phase: MissionPhase;
}
