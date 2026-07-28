/** PROGRAM 5600 — Autonomous Company workspace types. */

import type { MissionPhase } from "../types";

export const AUTONOMOUS_COMPANY_VERSION = "PROGRAM 5600 — AUTONOMOUS COMPANY";

export type CompanyWorkspaceId =
  | "marketing"
  | "seo"
  | "roadmap"
  | "customerFeedback"
  | "nps"
  | "kpis"
  | "productMetrics"
  | "backlog"
  | "incidents";

export interface CompanyWorkspace {
  id: CompanyWorkspaceId;
  label: string;
  labelEs: string;
  icon: string;
  description: string;
  adapterSource: "customer-success" | "marketplace" | "production" | "self-evolution" | "local";
}

export interface KPISnapshot {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  trend?: "up" | "down" | "stable";
  target?: number;
}

export interface NPSData {
  score: number;
  promoters: number;
  passives: number;
  detractors: number;
  responseCount: number;
  trend?: "up" | "down" | "stable";
}

export interface BacklogItem {
  id: string;
  title: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "todo" | "in_progress" | "done";
  createdAt: string;
  tags?: string[];
}

export interface Incident {
  id: string;
  title: string;
  severity: "info" | "warning" | "error" | "critical";
  status: "open" | "investigating" | "mitigated" | "resolved" | "closed";
  createdAt: string;
  description?: string;
}

export interface RoadmapItem {
  id: string;
  title: string;
  quarter: string;
  status: "planned" | "in-progress" | "done";
  votes?: number;
  priority?: "low" | "medium" | "high";
}

export interface FeedbackItem {
  id: string;
  title: string;
  message: string;
  source: "beta" | "issue" | "feature" | "nps" | "design-partner";
  createdAt: string;
  rating?: number;
}

export interface MarketingSnapshot {
  headline: string;
  campaigns: Array<{ id: string; name: string; status: string; reach?: number }>;
  channels: string[];
  engagementRate?: number;
  agentCount?: number;
}

export interface SEOSnapshot {
  score: number;
  keywords: string[];
  indexedPages: number;
  topQueries: Array<{ query: string; impressions: number }>;
  strategyNote?: string;
}

export interface ProductMetricsSnapshot {
  totalEvents: number;
  dpEventCount: number;
  betaEventCount: number;
  topPaths: Array<{ path: string; count: number }>;
  topEvents: Array<{ event: string; count: number }>;
}

export interface WorkspacePanelData {
  loaded: boolean;
  summary: string;
  empty: boolean;
}

export interface CompanyWorkspacesSnapshot {
  version: string;
  generatedAt: string;
  missionId: string;
  phase: MissionPhase;
  active: boolean;
  marketing?: MarketingSnapshot;
  seo?: SEOSnapshot;
  roadmap?: RoadmapItem[];
  feedback?: FeedbackItem[];
  nps?: NPSData;
  kpis?: KPISnapshot[];
  productMetrics?: ProductMetricsSnapshot;
  backlog?: BacklogItem[];
  incidents?: Incident[];
  panels: Record<CompanyWorkspaceId, WorkspacePanelData>;
}
