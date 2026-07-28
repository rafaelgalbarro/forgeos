/** Creator Flow — shared types (Epic 7.7). */

export type CreatorStepId =
  | "idea"
  | "discovery"
  | "research"
  | "ceo"
  | "board"
  | "product"
  | "architecture"
  | "build"
  | "deploy"
  | "growth";

export type CreatorStepStatus = "pending" | "active" | "complete" | "blocked";

export interface CreatorStepDefinition {
  id: CreatorStepId;
  order: number;
  label: string;
  objetivo: string;
  estimatedTime: string;
}

export interface CreatorStepSnapshot extends CreatorStepDefinition {
  status: CreatorStepStatus;
  progress: number;
  whatHappened: string[];
  whatToDoNext: string;
  ctaLabel: string;
  ctaHref?: string;
  canAdvance: boolean;
  executiveSummary?: string;
}

export interface CreatorFlowSummary {
  ventureId: string;
  ventureName: string;
  currentStepId: CreatorStepId;
  currentStepLabel: string;
  overallProgress: number;
  stepsComplete: number;
  stepsTotal: number;
  estimatedTimeRemaining: string;
}

export interface CreatorFlowSnapshot {
  summary: CreatorFlowSummary;
  steps: CreatorStepSnapshot[];
  timelineHighlights: CreatorTimelineHighlight[];
  knowledgeRefs: CreatorKnowledgeRef[];
  updatedAt: string;
}

export interface CreatorTimelineHighlight {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  category: string;
}

export interface CreatorKnowledgeRef {
  id: string;
  title: string;
  domain: string;
}

export interface CreatorVentureFlowState {
  ventureId: string;
  currentStepId: CreatorStepId;
  completedStepIds: CreatorStepId[];
  lastUpdatedAt: string;
}

export interface CreatorStoreState {
  ventures: Record<string, CreatorVentureFlowState>;
  activeVentureId: string | null;
}

export interface AdvanceStepResult {
  success: boolean;
  message: string;
  snapshot: CreatorFlowSnapshot;
}
