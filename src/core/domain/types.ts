/** PROGRAM 6010 — Domain primitives (stub-aligned for 6030). */

export type MissionId = string;
export type PlanId = string;
export type NodeId = string;
export type StageId = string;

export type EstimateKind = "actual" | "estimated";

export interface CostEstimate {
  amount: number;
  unit: "EUR" | "USD" | "credits";
  confidence: number;
  assumptions: string[];
  source: string;
  kind: EstimateKind;
}

export interface DurationEstimate {
  amount: number;
  unit: "ms" | "s" | "min" | "h";
  confidence: number;
  assumptions: string[];
  source: string;
  kind: EstimateKind;
}

export type DepartmentId =
  | "ceo"
  | "research"
  | "brand"
  | "product"
  | "engineering"
  | "build"
  | "qa"
  | "ops"
  | "security"
  | "finance";
