/** ForgeOS AI Orchestration — type contracts (Epic 3.1). */

import type { VentureProject } from "@/lib/domain/venture";
import type { DiscoveryContext } from "@/lib/discovery/types";
import type { ResearchReport } from "@/lib/ai/types/research";
import type { ProductPRD } from "@/lib/ai/types/product";
import type { VentureSimulatorResult } from "@/lib/venture-simulator";
import type { KnowledgeRefSummary } from "@/lib/ai/types/research";
import type { VentureMemoryRecord, PortfolioMemory } from "@/lib/intelligence-layer/types";
import type { Decision } from "@/lib/intelligence-layer/types";
import type { AIProviderId } from "@/lib/ai-gateway/types";
import type { ProgramId } from "@/lib/programs/types";

export type OrchestrationTaskId =
  | "CEO_BRIEF"
  | "CEO_REVIEW"
  | "CEO_PRIORITY"
  | "CEO_RISK"
  | "BOARD_DEBATE"
  | "BOARD_VOTE"
  | "BOARD_CONSENSUS"
  | "BUILD_PLAN"
  | "BUILD_ARCHITECTURE"
  | "BUILD_BACKEND"
  | "BUILD_FRONTEND"
  | "BUILD_DATABASE"
  | "BUILD_DEPLOY"
  | "BUILD_QA";

export type BoardMemberId =
  | "CEO"
  | "CTO"
  | "CPO"
  | "CMO"
  | "CFO"
  | "COO"
  | "Legal"
  | "Growth"
  | "Research"
  | "UX"
  | "Architecture"
  | "Operations"
  | "Data";

export type ExecutiveNodeType =
  | "Decision"
  | "Recommendation"
  | "Risk"
  | "Opportunity"
  | "Priority"
  | "Blocked"
  | "Approved"
  | "Rejected"
  | "Deferred";

export type ConsensusLevel =
  | "UNANIMOUS"
  | "HIGH_CONSENSUS"
  | "MEDIUM_CONSENSUS"
  | "LOW_CONSENSUS"
  | "CONFLICT";

export type OutputFormat = "json" | "text";

export interface TaskDefinition {
  id: OrchestrationTaskId;
  program: ProgramId;
  objective: string;
  outputFormat: OutputFormat;
  requiresJson: boolean;
  minimumContext: string[];
  relatedWorker: string;
  allowsMockFallback: boolean;
  gatewayTask: import("@/lib/ai-gateway/types").AITask;
}

export interface VentureOrchestrationContext {
  venture?: VentureProject;
  ventureId?: string;
  idea?: string;
  discoveryContext?: DiscoveryContext | null;
  researchReport?: ResearchReport | null;
  productPRD?: ProductPRD | null;
  ventureSimulatorResult?: VentureSimulatorResult | null;
  buildPlan?: string | null;
  knowledgeRefs?: KnowledgeRefSummary[];
  ventureMemory?: VentureMemoryRecord | null;
  decisionGraph?: Decision[];
  portfolioMemory?: PortfolioMemory | null;
  founderMemory?: Record<string, unknown> | null;
  brainContext?: string;
  boardMember?: BoardMemberId;
  extra?: Record<string, unknown>;
}

export interface BuiltContext {
  system: string;
  user: string;
  inputSize: number;
  sources: string[];
}

export interface CeoOutput {
  summary: string;
  executiveSummary?: string;
  priority: string;
  topPriorities?: string[];
  risks: string[];
  criticalRisks?: string[];
  growthOpportunities?: string[];
  blockedVentures?: string[];
  recommendation: string;
  recommendedNextActions?: string[];
  expectedImpact: string;
  confidence?: number;
  timeHorizon?: string;
}

export interface BoardOutput {
  member: string;
  position: string;
  opinion?: string;
  argumentsFor: string[];
  argumentsAgainst: string[];
  risks: string[];
  opportunities?: string[];
  vote: string;
  confidence: number;
  suggestedAction?: string;
}

export interface ExecutiveGraphNode {
  id: string;
  ventureId: string;
  nodeType: ExecutiveNodeType;
  source: string;
  title: string;
  rationale: string;
  impact: string;
  confidence: number;
  reversible: boolean;
  dependencies: string[];
  createdAt: string;
}

export interface ConsensusRecord {
  id: string;
  ventureId: string;
  level: ConsensusLevel;
  confidence: number;
  rationale: string;
  finalDecision: string;
  minorityOpinions: string[];
  memberCount: number;
  createdAt: string;
}

export interface BuildOutput {
  summary: string;
  architecture: string;
  modules: string[];
  steps: string[];
  risks: string[];
  nextActions: string[];
}

export type ValidatedOutput = CeoOutput | BoardOutput | BuildOutput | Record<string, unknown>;

export interface AiExecutionRecord {
  id: string;
  taskId: OrchestrationTaskId;
  provider: AIProviderId;
  model: string;
  timestamp: string;
  latencyMs: number;
  fallbackUsed: boolean;
  warnings: string[];
  costEstimate: number;
  inputSize: number;
  outputSize: number;
  ventureId?: string;
  decisionId?: string;
  boardSessionId?: string;
  estimatedTokens?: number;
}

export interface DecisionGraphEntry {
  decisionId: string;
  ventureId: string;
  sourceTask: OrchestrationTaskId;
  title: string;
  rationale: string;
  recommendation: string;
  expectedImpact: string;
  confidence: number;
  reversible: boolean;
  createdAt: string;
}

export interface OrchestratedAiResult<T = ValidatedOutput> {
  taskId: OrchestrationTaskId;
  output: T;
  raw: string;
  provider: AIProviderId;
  model: string;
  fallbackUsed: boolean;
  mockUsed: boolean;
  warnings: string[];
  costEstimate: number;
  latencyMs: number;
  executionId: string;
  decisionId?: string;
}
