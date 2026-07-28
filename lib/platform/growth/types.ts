/** Growth pillar — type contracts. */

import type { VentureId } from "../shared/types";

export type GrowthModuleId =
  | "growth-engine"
  | "cac"
  | "ltv"
  | "funnels"
  | "experiments"
  | "crm"
  | "retention"
  | "referrals"
  | "pricing-optimization";

export interface CacMetrics {
  channel: string;
  spend: number;
  acquisitions: number;
  cac: number | null;
}

export interface LtvMetrics {
  arpu: number;
  churnRate: number;
  ltv: number | null;
  paybackMonths: number | null;
}

export interface FunnelStage {
  id: string;
  name: string;
  visitors: number;
  conversionRate: number;
}

export interface Experiment {
  id: string;
  hypothesis: string;
  variant: string;
  status: "draft" | "running" | "concluded";
  result?: string;
}

export interface CrmContact {
  id: string;
  email: string;
  stage: "lead" | "qualified" | "customer" | "churned";
  source: string;
}

export interface GrowthSnapshot {
  ventureId: VentureId;
  modules: GrowthModuleId[];
  updatedAt: string;
}
