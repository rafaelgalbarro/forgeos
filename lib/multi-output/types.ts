/** PROGRAM 5390 — Multi-Output Mission contract. */

import type { CreationOutputType } from "@/lib/creation-output/types";
import type { IntentionType, MissionPhase } from "@/lib/mission-control/types";

export const MULTI_OUTPUT_VERSION = "PROGRAM 5390 — MULTI-OUTPUT MISSION";

/** All deliverable kinds a mission can produce */
export type MultiOutputKind =
  | "VENTURE"
  | "BRAND"
  | "WEBSITE"
  | "WEB_APP"
  | "MOBILE"
  | "BACKEND"
  | "DATABASE"
  | "API"
  | "DEPLOYMENT"
  | "GTM"
  | "INVESTOR"
  | "OPERATIONAL";

export type MultiOutputPlanStatus =
  | "DRAFT"
  | "PENDING_ACCEPTANCE"
  | "ACCEPTED"
  | "MODIFIED"
  | "EXECUTING"
  | "COMPLETED"
  | "PARTIAL";

export type PlannedOutputStatus =
  | "planificado"
  | "generando"
  | "preview"
  | "aprobado"
  | "bloqueado"
  | "desplegado"
  | "excluido"
  | "fallido";

export type OutputRequirement = "required" | "optional" | "excluded";

export interface OutputDependency {
  from: MultiOutputKind;
  to: MultiOutputKind;
  /** Human-readable reason */
  reason: string;
  /** If true, downstream cannot start until upstream is approved */
  requiresApproval?: boolean;
}

export interface PlannedOutput {
  kind: MultiOutputKind;
  label: string;
  icon: string;
  requirement: OutputRequirement;
  status: PlannedOutputStatus;
  version: string;
  dependencies: MultiOutputKind[];
  /** Mapped creation-output type when applicable */
  creationOutputType?: CreationOutputType;
  estimatedMinutes: number;
  estimatedCostEur: number;
  health: "healthy" | "warning" | "error" | "pending";
  previewUrl?: string;
  warnings: string[];
  pendingChanges: string[];
  blockedReason?: string;
  repairPlan?: string[];
  /** Parallel-safe with these kinds */
  parallelWith?: MultiOutputKind[];
}

export type MultiOutputStage =
  | "UNDERSTAND"
  | "SELECT_OUTPUTS"
  | "BUILD_SHARED_CONTEXT"
  | "GENERATE_SHARED_ASSETS"
  | "GENERATE_OUTPUTS"
  | "VALIDATE"
  | "PREVIEW"
  | "APPROVE"
  | "DEPLOY_PREVIEW"
  | "OPERATE"
  | "EVOLVE";

export interface MultiOutputStageItem {
  stage: MultiOutputStage;
  label: string;
  missionPhase?: MissionPhase;
  dependencies: MultiOutputStage[];
  status: "pending" | "in_progress" | "completed" | "blocked" | "skipped";
}

export interface MultiOutputPlan {
  planId: string;
  missionId: string;
  status: MultiOutputPlanStatus;
  intentProfile: IntentProfile;
  outputs: PlannedOutput[];
  stages: MultiOutputStageItem[];
  /** Total estimated time (minutes) */
  estimatedMinutes: number;
  /** Total estimated cost (EUR) */
  estimatedCostEur: number;
  excludedReasons: Partial<Record<MultiOutputKind, string>>;
  monorepoRecommended: boolean;
  monorepoStructure?: string[];
  acceptedAt?: string;
  modifiedAt?: string;
  createdAt: string;
  updatedAt: string;
  /** User-facing explanation */
  explanation: string;
}

export interface IntentProfile {
  primary: IntentionType | null;
  secondary: IntentionType[];
  ideaText: string;
  /** Detected business model pattern */
  pattern: "saas" | "restaurant" | "corporate_web" | "mobile_app" | "venture" | "generic";
  keywords: string[];
}

export interface MissionReleaseVersion {
  release: string;
  missionId: string;
  components: Partial<Record<MultiOutputKind, string>>;
  partial: boolean;
  createdAt: string;
}

export interface MultiOutputReleasePackage {
  manifestVersion: string;
  missionId: string;
  release: MissionReleaseVersion;
  outputs: { kind: MultiOutputKind; outputId?: string; version: string; status: PlannedOutputStatus }[];
  artifacts: string[];
  previews: { kind: MultiOutputKind; url?: string }[];
  validation: { passed: boolean; score: number; checks: string[] };
  approvals: { kind: MultiOutputKind; approved: boolean; at?: string }[];
  deploymentPlans: { kind: MultiOutputKind; plan: string; dryRun: boolean }[];
  rollbackPlans: { kind: MultiOutputKind; plan: string }[];
  docs: string[];
}

export interface OutputImpactResult {
  changeType: string;
  changeDescription: string;
  affectedOutputs: MultiOutputKind[];
  affectedFiles: string[];
  risks: string[];
  estimatedMinutes: number;
  requiresApproval: boolean;
  /** Outputs that remain unchanged */
  unaffectedOutputs: MultiOutputKind[];
}

export interface SyncResult {
  missionId: string;
  trigger: string;
  updatedOutputs: MultiOutputKind[];
  skippedOutputs: MultiOutputKind[];
  failedOutputs: { kind: MultiOutputKind; error: string; repairPlan: string[] }[];
  durationMs: number;
}

export interface MultiOutputSummary {
  missionId: string;
  planStatus: MultiOutputPlanStatus;
  releaseVersion: string;
  outputs: PlannedOutputSummary[];
  totalOutputs: number;
  readyCount: number;
  blockedCount: number;
  lastUpdated: string;
}

export interface PlannedOutputSummary {
  kind: MultiOutputKind;
  label: string;
  icon: string;
  status: PlannedOutputStatus;
  version: string;
  health: PlannedOutput["health"];
  studioHref: string;
}

export const OUTPUT_KIND_LABELS: Record<MultiOutputKind, string> = {
  VENTURE: "Empresa",
  BRAND: "Marca",
  WEBSITE: "Web",
  WEB_APP: "Aplicación",
  MOBILE: "App móvil",
  BACKEND: "Backend",
  DATABASE: "Base de datos",
  API: "API",
  DEPLOYMENT: "Deploy",
  GTM: "Go-to-Market",
  INVESTOR: "Inversor",
  OPERATIONAL: "Operaciones",
};

export const OUTPUT_KIND_ICONS: Record<MultiOutputKind, string> = {
  VENTURE: "🏢",
  BRAND: "🎨",
  WEBSITE: "🌐",
  WEB_APP: "💻",
  MOBILE: "📱",
  BACKEND: "⚙️",
  DATABASE: "🗄️",
  API: "🔌",
  DEPLOYMENT: "🚀",
  GTM: "📣",
  INVESTOR: "💰",
  OPERATIONAL: "📋",
};

export const KIND_TO_CREATION_OUTPUT: Partial<Record<MultiOutputKind, CreationOutputType>> = {
  VENTURE: "VENTURE_OUTPUT",
  WEBSITE: "WEBSITE_OUTPUT",
  WEB_APP: "WEB_APPLICATION_OUTPUT",
  MOBILE: "MOBILE_APPLICATION_OUTPUT",
  BACKEND: "BACKEND_OUTPUT",
  DEPLOYMENT: "DEPLOYMENT_OUTPUT",
};

export const ALL_OUTPUT_KINDS: MultiOutputKind[] = [
  "VENTURE",
  "BRAND",
  "WEBSITE",
  "WEB_APP",
  "MOBILE",
  "BACKEND",
  "DATABASE",
  "API",
  "DEPLOYMENT",
  "GTM",
  "INVESTOR",
  "OPERATIONAL",
];
