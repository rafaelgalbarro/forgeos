import type { VentureProject } from "@/lib/domain/venture";
import type { NextAction } from "@/lib/portfolio/next-action";
import type { ScoreDisplay } from "@/lib/portfolio/types";

export type WorkspaceSectionId =
  | "resumen"
  | "ceo"
  | "estado"
  | "startup-score"
  | "investment-readiness"
  | "next-actions"
  | "timeline"
  | "research"
  | "product"
  | "architecture"
  | "build"
  | "knowledge"
  | "metrics"
  | "activity"
  | "memory";

export const WORKSPACE_SECTIONS: { id: WorkspaceSectionId; title: string; group: string }[] = [
  { id: "resumen", title: "Resumen Ejecutivo", group: "Comando" },
  { id: "ceo", title: "CEO Brief", group: "Comando" },
  { id: "estado", title: "Estado del Venture", group: "Comando" },
  { id: "startup-score", title: "Startup Score", group: "Métricas" },
  { id: "investment-readiness", title: "Investment Readiness", group: "Métricas" },
  { id: "next-actions", title: "Próximas acciones", group: "Acción" },
  { id: "timeline", title: "Timeline", group: "Actividad" },
  { id: "research", title: "Research", group: "Contenido" },
  { id: "product", title: "Product", group: "Contenido" },
  { id: "architecture", title: "Architecture", group: "Contenido" },
  { id: "build", title: "Build", group: "Contenido" },
  { id: "knowledge", title: "Knowledge", group: "Contenido" },
  { id: "metrics", title: "Metrics", group: "Métricas" },
  { id: "activity", title: "Activity", group: "Actividad" },
  { id: "memory", title: "Memory", group: "Actividad" },
];

export type FounderLifecycleStageId =
  | "idea"
  | "validacion"
  | "mercado"
  | "producto"
  | "construccion"
  | "lanzamiento"
  | "crecimiento";

export type FounderLifecycleStepStatus = "complete" | "active" | "pending" | "blocked";

export interface FounderLifecycleStep {
  id: FounderLifecycleStageId;
  label: string;
  status: FounderLifecycleStepStatus;
}

export interface VentureCeoBrief {
  observation: string;
  recommendation: string;
  criticalRisk: string;
  opportunity: string;
}

export interface InvestmentReadinessMetric {
  id: string;
  label: string;
  score: number;
  maxScore: number;
  status: "ready" | "progress" | "pending";
  detail: string;
}

export interface InvestmentReadiness {
  overallScore: number;
  overallLabel: string;
  metrics: InvestmentReadinessMetric[];
}

export interface WorkspaceTimelineEvent {
  id: string;
  title: string;
  time: string;
  relative: string;
  description?: string;
}

export interface WorkspaceActivityItem {
  id: string;
  label: string;
  relative: string;
  type: string;
}

export interface WorkspaceMemorySummary {
  headline: string;
  milestones: string[];
  decisions: string[];
  learnings: string[];
}

export interface WorkspaceBuildStatus {
  phase: string;
  progress: number;
  items: { label: string; done: boolean }[];
}

export interface WorkspaceContentSummary {
  title: string;
  excerpt: string;
  hasContent: boolean;
  source?: string;
}

export interface VentureWorkspaceSnapshot {
  venture: VentureProject;
  currentState: string;
  lifeStageLabel: string;
  statusBadgeLabel: string;
  startupScore: ScoreDisplay;
  ventureScore: ScoreDisplay;
  confidenceLabel: string;
  founderLifecycle: FounderLifecycleStep[];
  activeLifecycleStage: FounderLifecycleStageId;
  ceoBrief: VentureCeoBrief;
  investmentReadiness: InvestmentReadiness;
  nextAction: NextAction;
  timeline: WorkspaceTimelineEvent[];
  activity: WorkspaceActivityItem[];
  memory: WorkspaceMemorySummary;
  buildStatus: WorkspaceBuildStatus;
  executiveSummary: string;
  research: WorkspaceContentSummary;
  product: WorkspaceContentSummary;
  architecture: WorkspaceContentSummary;
  knowledge: WorkspaceContentSummary;
  metrics: { label: string; value: string; detail: string }[];
}
