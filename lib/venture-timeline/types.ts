/** Venture Timeline — shared types (Epic 7.3). */

export type TimelineDepartment =
  | "executive"
  | "research"
  | "product"
  | "engineering"
  | "build"
  | "qa"
  | "growth"
  | "finance"
  | "capital"
  | "memory";

export type TimelineCategory =
  | "CEO Reviews"
  | "Board Decisions"
  | "Research"
  | "Product"
  | "Architecture"
  | "Build"
  | "QA"
  | "Deploy"
  | "Marketing"
  | "Finance"
  | "Capital"
  | "Memory"
  | "Decision Graph";

export type TimelineEventSource =
  | "venture"
  | "memory"
  | "decision-graph"
  | "executive-memory"
  | "ai-orchestration"
  | "heuristic";

export interface TimelineEvent {
  id: string;
  ventureId: string;
  title: string;
  description: string;
  timestamp: string;
  department: TimelineDepartment;
  category: TimelineCategory;
  source: TimelineEventSource;
  actor?: string;
  metadata?: Record<string, unknown>;
}

export interface TimelineDateRange {
  from?: string;
  to?: string;
}

export interface TimelineFilterState {
  departments: TimelineDepartment[];
  categories: TimelineCategory[];
  dateRange?: TimelineDateRange;
}

export interface TimelineDepartmentGroup {
  department: TimelineDepartment;
  label: string;
  events: TimelineEvent[];
}

export interface TimelineDateGroup {
  dateKey: string;
  label: string;
  events: TimelineEvent[];
}

export interface VentureTimelineSnapshot {
  ventureId: string;
  events: TimelineEvent[];
  builtAt: string;
  sources: TimelineEventSource[];
}
