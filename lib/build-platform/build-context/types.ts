/** Build Context — type contracts (Epic 6.0). */

export type BuildContextSectionId =
  | "discovery"
  | "research"
  | "competitors"
  | "businessModel"
  | "brand"
  | "users"
  | "personas"
  | "architecture"
  | "ux"
  | "productPrd"
  | "knowledge"
  | "memory"
  | "decisionGraph"
  | "workers"
  | "buildPlan"
  | "deploymentTarget"
  | "analytics"
  | "security"
  | "infrastructure"
  | "qa";

export type BuildContextSectionStatus = "empty" | "partial" | "complete" | "stale";

export type BuildContextOrigin =
  | "venture"
  | "discovery"
  | "research"
  | "product"
  | "simulator"
  | "intelligence"
  | "build-plan"
  | "runtime"
  | "memory"
  | "knowledge"
  | "manual"
  | "mock"
  | "merged";

export interface BuildContextValidationIssue {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
  field?: string;
}

export interface BuildContextSectionValidation {
  valid: boolean;
  score: number;
  issues: BuildContextValidationIssue[];
}

export interface BuildContextSection<T = unknown> {
  id: BuildContextSectionId;
  label: string;
  data: T | null;
  origin: BuildContextOrigin;
  status: BuildContextSectionStatus;
  validation: BuildContextSectionValidation;
  updatedAt: string;
  sourceModule?: string;
}

export interface BuildContextMeta {
  ventureId: string;
  ventureName: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  completenessScore: number;
  readyForBuild: boolean;
}

export interface BuildContext {
  meta: BuildContextMeta;
  sections: Record<BuildContextSectionId, BuildContextSection>;
}

export interface BuildContextHistoryEntry {
  id: string;
  ventureId: string;
  version: number;
  action: "created" | "updated" | "merged" | "validated";
  summary: string;
  completenessScore: number;
  createdAt: string;
  snapshot?: BuildContext;
}

export interface BuildContextMergeResult {
  context: BuildContext;
  mergedSections: BuildContextSectionId[];
  conflicts: string[];
}

export interface BuildContextAdapterInput {
  ventureId: string;
  ventureName: string;
  ideaText?: string;
  description?: string;
  targetAudience?: string;
  discoveryContext?: unknown;
  researchReport?: unknown;
  productPRD?: unknown;
  intelligenceReport?: unknown;
  simulatorResult?: unknown;
  sections?: { id: string; content: string }[];
}

export const BUILD_CONTEXT_SECTION_ORDER: BuildContextSectionId[] = [
  "discovery",
  "research",
  "competitors",
  "businessModel",
  "brand",
  "users",
  "personas",
  "productPrd",
  "architecture",
  "ux",
  "knowledge",
  "memory",
  "decisionGraph",
  "workers",
  "buildPlan",
  "deploymentTarget",
  "analytics",
  "security",
  "infrastructure",
  "qa",
];

export const BUILD_CONTEXT_SECTION_LABELS: Record<BuildContextSectionId, string> = {
  discovery: "Discovery",
  research: "Research",
  competitors: "Competitors",
  businessModel: "Business Model",
  brand: "Brand",
  users: "Users",
  personas: "Personas",
  architecture: "Architecture",
  ux: "UX",
  productPrd: "Product PRD",
  knowledge: "Knowledge",
  memory: "Memory",
  decisionGraph: "Decision Graph",
  workers: "Workers",
  buildPlan: "Build Plan",
  deploymentTarget: "Deployment Target",
  analytics: "Analytics",
  security: "Security",
  infrastructure: "Infrastructure",
  qa: "QA",
};
