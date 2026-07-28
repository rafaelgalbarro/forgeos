/** ForgeOS Real Connections — shared types (RC5). */

export type ConnectionProvider = "github" | "supabase" | "vercel" | "cloudflare";

export type ConnectionMode = "dry_run" | "sandbox" | "production";

export type ConnectionOperation =
  | "validate"
  | "list"
  | "plan"
  | "dry_run"
  | "execute"
  | "rollback"
  | "health";

export type ConnectionRiskLevel = "low" | "medium" | "high" | "critical";

export interface ConnectionAuthConfig {
  provider: ConnectionProvider;
  /** Server-side env key — never exposed to client */
  envKey: string;
  configured: boolean;
}

export interface ConnectionPlanStep {
  stepId: string;
  action: string;
  description: string;
  reversible: boolean;
  estimatedDurationMs: number;
}

export interface ConnectionPlan {
  planId: string;
  provider: ConnectionProvider;
  operation: string;
  mode: ConnectionMode;
  steps: ConnectionPlanStep[];
  rollbackSteps: ConnectionPlanStep[];
  estimatedCost: number;
  riskLevel: ConnectionRiskLevel;
  requiresApproval: boolean;
  summary: string;
}

export interface ConnectionTelemetry {
  latencyMs: number;
  provider: ConnectionProvider;
  operation: string;
  mode: ConnectionMode;
  success: boolean;
  costEstimate: number;
}

export interface ConnectionResult {
  success: boolean;
  provider: ConnectionProvider;
  operation: string;
  mode: ConnectionMode;
  output: string;
  plan?: ConnectionPlan;
  data?: Record<string, unknown>;
  errors: string[];
  warnings: string[];
  auditId: string;
  telemetry: ConnectionTelemetry;
  executed: boolean;
  blockedReason?: string;
}

export interface ConnectionRequest {
  provider: ConnectionProvider;
  operation: string;
  ventureId: string;
  requestedBy: string;
  approvedBy?: string;
  mode?: ConnectionMode;
  userConfirmed?: boolean;
  payload?: Record<string, unknown>;
}

export interface ConnectionHealthStatus {
  provider: ConnectionProvider;
  healthy: boolean;
  configured: boolean;
  message: string;
  lastCheckedAt: string;
  latencyMs: number;
}

export interface ConnectionAuditEntry {
  id: string;
  timestamp: string;
  provider: ConnectionProvider;
  operation: string;
  mode: ConnectionMode;
  ventureId: string;
  requestedBy: string;
  outcome: "planned" | "dry_run" | "executed" | "blocked" | "failed" | "validated";
  details: string;
  riskLevel: ConnectionRiskLevel;
}

export const REAL_CONNECTION_CAPABILITIES = [
  "create_repository",
  "create_branch",
  "open_pull_request",
  "create_database",
  "create_environment",
  "deploy_software",
  "configure_domain",
  "prepare_release",
] as const;

export type RealConnectionCapability = (typeof REAL_CONNECTION_CAPABILITIES)[number];
