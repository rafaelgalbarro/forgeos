/** PROGRAM 5350 — Creation Output Studio contract. */

export const CREATION_OUTPUT_VERSION = "PROGRAM 5350 — CREATION OUTPUT STUDIO";

export type CreationOutputType =
  | "VENTURE_OUTPUT"
  | "WEBSITE_OUTPUT"
  | "WEB_APPLICATION_OUTPUT"
  | "MOBILE_APPLICATION_OUTPUT"
  | "BACKEND_OUTPUT"
  | "DEPLOYMENT_OUTPUT";

export type CreationOutputStatus =
  | "DRAFT"
  | "GENERATING"
  | "PREVIEW_READY"
  | "VALIDATING"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "EXPORT_READY"
  | "DEPLOYMENT_READY"
  | "FAILED";

export type PreviewMode = "mock" | "sandbox" | "dry-run" | "preview-plan" | "unavailable";

export interface OutputFileEntry {
  path: string;
  kind: "file" | "directory";
  description?: string;
  sizeBytes?: number;
}

export interface OutputRoute {
  id: string;
  path: string;
  label: string;
  layout?: string;
}

export interface OutputScreenshot {
  id: string;
  label: string;
  device: "desktop" | "tablet" | "mobile";
  url?: string;
  placeholder?: boolean;
}

export interface OutputDataModel {
  entities: { name: string; fields: string[]; relations?: string[] }[];
  provider?: string;
}

export interface OutputApiSpec {
  baseUrl: string;
  endpoints: { method: string; path: string; description: string; auth?: boolean }[];
  auth?: string;
}

export interface OutputValidation {
  score: number;
  passed: boolean;
  checks: { id: string; label: string; status: "pass" | "fail" | "warn" | "skip"; detail?: string }[];
  source: "demo" | "heuristic" | "adapter";
}

export interface OutputApproval {
  id: string;
  status: "pending" | "approved" | "rejected" | "changes_requested";
  requestedAt: string;
  resolvedAt?: string;
  reviewer?: string;
  note?: string;
}

export interface OutputWarning {
  id: string;
  severity: "info" | "warn" | "error";
  message: string;
  code?: string;
}

export interface OutputNextAction {
  id: string;
  label: string;
  href?: string;
  kind: "preview" | "export" | "approve" | "deploy" | "change_request" | "navigate";
}

export interface SourceArtifactRef {
  artifactId: string;
  type: string;
  label: string;
  href?: string;
}

export interface VentureOutputPayload {
  name: string;
  valueProposition: string;
  icp: string;
  market: string;
  businessModel: string;
  pricing: string;
  brand: { primaryColor: string; tone: string; tagline?: string };
  roadmap: { phase: string; items: string[] }[];
  kpis: { label: string; value: string; trend?: string }[];
  financialSummary: string;
  investorReadiness: { score: number; label: string };
  launchReadiness: { score: number; label: string };
  orgStructure: { role: string; responsibility: string }[];
  executiveSummary: string;
  linkedOutputs: Partial<Record<CreationOutputType, string>>;
}

export interface WebsiteOutputPayload {
  projectId: string;
  templateId: string;
  pages: OutputRoute[];
  seo: { title: string; description: string };
  componentTree: string[];
  responsiveBreakpoints: ("desktop" | "tablet" | "mobile")[];
  exportPlan: string;
  vercelPreviewPlan: string;
}

export interface WebApplicationOutputPayload {
  projectId: string;
  scenarios: { id: string; label: string; description: string }[];
  roles: { id: string; label: string; permissions: string[] }[];
  demoFlows: { id: string; label: string; steps: string[] }[];
  entities: string[];
  features: string[];
}

export interface MobileApplicationOutputPayload {
  projectId: string;
  deviceFrames: ("iphone" | "android")[];
  screens: OutputRoute[];
  orientation: "portrait" | "landscape";
  offlineState: string;
  permissions: string[];
  apiDependencies: string[];
  expoPreviewPlan: string;
}

export interface BackendOutputPayload {
  entities: OutputDataModel["entities"];
  relations: { from: string; to: string; type: string }[];
  dbSchema: string[];
  apiEndpoints: OutputApiSpec["endpoints"];
  auth: string;
  roles: string[];
  jobs: string[];
  events: string[];
  integrations: string[];
  envPlan: string[];
}

export interface DeploymentOutputPayload {
  githubStatus: string;
  repoPlan: string;
  branch: string;
  buildStatus: string;
  supabaseSandbox: string;
  vercelPreview: string;
  environment: string;
  qualityGates: { label: string; status: "pass" | "fail" | "pending" }[];
  rollbackPlan: string;
  deployed: boolean;
  dryRun: boolean;
}

export type CreationOutputPayload =
  | VentureOutputPayload
  | WebsiteOutputPayload
  | WebApplicationOutputPayload
  | MobileApplicationOutputPayload
  | BackendOutputPayload
  | DeploymentOutputPayload;

export interface CreationOutput {
  outputId: string;
  missionId: string;
  ventureId?: string;
  type: CreationOutputType;
  title: string;
  status: CreationOutputStatus;
  version: string;
  createdAt: string;
  updatedAt: string;
  sourceArtifacts: SourceArtifactRef[];
  previewMode: PreviewMode;
  previewUrl?: string;
  files: OutputFileEntry[];
  routes: OutputRoute[];
  screenshots: OutputScreenshot[];
  dataModel?: OutputDataModel;
  apiSpec?: OutputApiSpec;
  validation?: OutputValidation;
  approvals: OutputApproval[];
  warnings: OutputWarning[];
  nextActions: OutputNextAction[];
  payload?: CreationOutputPayload;
  previousVersionId?: string;
  factoryProjectId?: string;
}

export interface ChangeRequest {
  id: string;
  missionId: string;
  outputId: string;
  outputType: CreationOutputType;
  description: string;
  affectedAreas: string[];
  status: "open" | "in_progress" | "resolved" | "cancelled";
  createdAt: string;
  resolvedAt?: string;
  newVersionId?: string;
  previousVersionId: string;
}

export interface VersionComparison {
  id: string;
  missionId: string;
  outputType: CreationOutputType;
  versionAId: string;
  versionBId: string;
  versionALabel: string;
  versionBLabel: string;
  visualChanges: string[];
  functionalChanges: string[];
  affectedFiles: string[];
  affectedArtifacts: string[];
  risks: string[];
  scoreBefore: number;
  scoreAfter: number;
  createdAt: string;
}

export interface MissionOutputSummary {
  missionId: string;
  ventureId?: string;
  ventureSlug?: string;
  outputs: CreationOutputSummaryCard[];
  lastUpdated: string;
}

export interface CreationOutputSummaryCard {
  type: CreationOutputType;
  label: string;
  icon: string;
  outputId?: string;
  status: CreationOutputStatus;
  version: string;
  lastUpdated: string;
  studioHref: string;
}

export interface StudioSnapshot {
  missionId: string;
  ventureSlug?: string;
  outputs: CreationOutput[];
  changeRequests: ChangeRequest[];
  comparisons: VersionComparison[];
  selectedOutputId?: string;
  selectedVersion?: string;
}

export const OUTPUT_TYPE_LABELS: Record<CreationOutputType, string> = {
  VENTURE_OUTPUT: "Empresa",
  WEBSITE_OUTPUT: "Web",
  WEB_APPLICATION_OUTPUT: "Aplicación",
  MOBILE_APPLICATION_OUTPUT: "App móvil",
  BACKEND_OUTPUT: "Backend",
  DEPLOYMENT_OUTPUT: "Deploy",
};

export const OUTPUT_TYPE_ICONS: Record<CreationOutputType, string> = {
  VENTURE_OUTPUT: "🏢",
  WEBSITE_OUTPUT: "🌐",
  WEB_APPLICATION_OUTPUT: "💻",
  MOBILE_APPLICATION_OUTPUT: "📱",
  BACKEND_OUTPUT: "⚙️",
  DEPLOYMENT_OUTPUT: "🚀",
};

export const ALL_OUTPUT_TYPES: CreationOutputType[] = [
  "VENTURE_OUTPUT",
  "WEBSITE_OUTPUT",
  "WEB_APPLICATION_OUTPUT",
  "MOBILE_APPLICATION_OUTPUT",
  "BACKEND_OUTPUT",
  "DEPLOYMENT_OUTPUT",
];
