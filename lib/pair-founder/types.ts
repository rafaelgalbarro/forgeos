/** PROGRAM 5200 — AI Pair Founder types. */

import type { IntentionType, MissionPhase, PendingDecision } from "@/lib/mission-control/types";

export type RiskSeverity = "low" | "medium" | "high" | "critical";

export interface DecisionRecord {
  id: string;
  timestamp: string;
  phase: MissionPhase;
  category: string;
  title: string;
  selectedOption: string;
  rationale?: string;
  source: "user" | "auto-pilot" | "ceo";
}

export interface Contradiction {
  id: string;
  severity: RiskSeverity;
  priorStatement: string;
  newInput: string;
  suggestion: string;
  impact?: string;
  alternative?: string;
  requiredDecision?: string;
}

export interface Risk {
  id: string;
  severity: RiskSeverity;
  title: string;
  description: string;
  mitigation?: string;
}

export interface Alternative {
  id: string;
  title: string;
  description: string;
  justification: string;
  impact: "low" | "medium" | "high";
}

export interface PairFounderRecommendation {
  recommendation: string;
  rationaleSummary: string;
  expectedImpact: string;
  confidence: number;
  assumptions: string[];
  risk: string;
  alternative?: string;
}

export interface FounderPreference {
  tone: "direct" | "collaborative" | "analytical";
  riskTolerance: "conservative" | "balanced" | "aggressive";
  decisionStyle: "one-at-a-time" | "batch";
  autoPilotBias: "speed" | "quality";
}

/** STEP 1 — Founder profile per workspace (no sensitive attributes). */
export interface FounderProfile {
  objetivos: string[];
  experiencia: string;
  sectores: string[];
  toleranciaRiesgo: "conservative" | "balanced" | "aggressive";
  presupuesto: string;
  tiempoDisponible: string;
  preferencias: string[];
  tipoEmpresaDeseada: string;
  estrategiaCrecimiento: string;
  restricciones: string[];
  updatedAt: string;
}

export interface VentureMemory {
  missionId: string;
  ventureSummary: string;
  keyFacts: string[];
  priorDecisions: string[];
  strategyNotes: string[];
  lastUpdated: string;
  turnCount: number;
}

export interface MissionContext {
  missionId: string;
  workspaceId?: string;
  title: string;
  idea?: string;
  intention: IntentionType | null;
  phase: MissionPhase;
  pendingDecisions: PendingDecision[];
  recentMessages: { role: string; content: string }[];
  snapshots: { id: string; progress: number; status: string }[];
  meshHints?: string[];
  founderProfile?: FounderProfile;
}

export interface ContextChangeResult {
  changed: boolean;
  summary: string;
  affectedArtifacts: string[];
  recalculatedDependencies: string[];
}

export interface CEOInsight {
  ventureUnderstanding: string;
  deltaSinceLastTurn: string;
  hypotheses: string[];
  risks: Risk[];
  priorities: string[];
  recommendations: PairFounderRecommendation[];
  nextRecommendation: {
    action: string;
    justification: string;
    alternatives?: Alternative[];
  };
  contradictions: Contradiction[];
  pendingDecisionCount: number;
  confidence: number;
  generatedAt: string;
  exitReadiness?: import("@/lib/mission-control/exit-strategy/types").ExitReadiness;
  strategicAlignment?: import("@/lib/mission-control/exit-strategy/types").StrategicAlignment;
  exitStrategyDelta?: import("@/lib/mission-control/exit-strategy/types").ExitStrategyDelta;
}

export interface PairFounderTurnInput {
  missionId: string;
  context: MissionContext;
  userInput?: string;
  proposedReply: string;
}

export interface PairFounderTurnResult {
  reply: string;
  insight: CEOInsight;
  memory: VentureMemory;
  decisionRecords: DecisionRecord[];
  reorderedDecisions?: PendingDecision[];
  contextChange?: ContextChangeResult;
}

export type PairFounderTrigger =
  | "user_message"
  | "decision_resolved"
  | "context_change"
  | "explicit_review";
