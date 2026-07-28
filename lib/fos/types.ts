import type { VentureProject } from "@/lib/domain/venture";

export type FosModuleId =
  | "kernel"
  | "scheduler"
  | "event-bus"
  | "state-machine"
  | "portfolio-engine"
  | "priority-engine"
  | "attention-engine"
  | "worker-coordinator"
  | "memory"
  | "context-engine"
  | "decision-engine"
  | "lifecycle-engine";

export type FosEventType =
  | "fos:boot"
  | "fos:metrics:computed"
  | "fos:portfolio:updated"
  | "fos:priority:resolved"
  | "fos:attention:shifted"
  | "fos:health:assessed"
  | "fos:live:activity"
  | "fos:lifecycle:transition"
  | "fos:decision:made"
  | "fos:context:built"
  | "fos:shutdown";

export interface FosEvent<T = unknown> {
  type: FosEventType;
  timestamp: string;
  source: FosModuleId;
  payload: T;
}

export type FosEventHandler<T = unknown> = (event: FosEvent<T>) => void;

export interface FosMetrics {
  dailyFocus: string;
  attentionScore: number;
  portfolioHealth: number;
  portfolioGrowth: number;
  portfolioReadiness: number;
  impactScore: number;
  momentum: number;
  confidence: number;
  risk: number;
}

export interface FosVentureContext {
  ventureId: string;
  ventureName: string;
  lifecycleStage: string;
  attentionWeight: number;
  riskLevel: "low" | "medium" | "high";
  priorityRank: number;
}

export interface FosSnapshot {
  metrics: FosMetrics;
  ventureContexts: FosVentureContext[];
  topPriorityVentureId: string | null;
  computedAt: string;
}

export interface FosRunInput {
  ventures: VentureProject[];
}

export interface FosRunResult extends FosSnapshot {
  events: FosEvent[];
}
