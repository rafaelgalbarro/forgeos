export type FreshnessStatus = "LIVE" | "STALE" | "PARTIAL";

export type RealityClassification =
  | "REAL_AND_FUNCTIONAL"
  | "REAL_PREVIEW"
  | "GENERATED_AND_VALIDATED"
  | "GENERATED_NOT_EXECUTED"
  | "SPECIFICATION_ONLY"
  | "PLAN_ONLY"
  | "DRY_RUN"
  | "BLOCKED"
  | "FAILED"
  | "NOT_CREATED"
  | "NOT_APPLICABLE";

export type ReadinessStatus =
  | "NOT_STARTED"
  | "PLANNED"
  | "IN_PROGRESS"
  | "PARTIAL"
  | "READY"
  | "BLOCKED"
  | "FAILED"
  | "NOT_APPLICABLE";

export type ValidationStatus = "PASS" | "WARNING" | "FAIL" | "NOT_RUN" | "NOT_APPLICABLE";

export interface CompanyDashboardAction {
  id: string;
  label: string;
  href: string;
  priority: "high" | "medium" | "low";
}

export interface CompanyDashboardSectionStatus {
  id: string;
  label: string;
  reality: RealityClassification;
  readiness: ReadinessStatus;
  blockers: string[];
  nextAction?: string;
}

export interface CompanyHeaderModel {
  ventureId: string;
  ventureName: string;
  tagline: string;
  sector: string;
  lifecycle: string;
  missionStatus: string;
  version: string;
}

export interface ProductCardModel {
  id: string;
  missionId: string;
  name: string;
  type: string;
  status: string;
  version: string;
  outputCount: number;
  previewUrl?: string;
  readiness: ReadinessStatus;
  blockers: string[];
  reality: RealityClassification;
}

export interface VisualOutputModel {
  id: string;
  missionId: string;
  title: string;
  kind: string;
  status: string;
  version: string;
  previewUrl?: string;
  screenshotUrl?: string;
  reality: RealityClassification;
}

export interface HealthBucket {
  id: "company" | "product" | "technical" | "gtm" | "operational" | "release";
  label: string;
  status: ReadinessStatus;
  score: number;
}

export interface CompanyDashboardReadModel {
  generatedAt: string;
  freshness: FreshnessStatus;
  errors: string[];
  header: CompanyHeaderModel;
  executiveSummary: string;
  health: HealthBucket[];
  sections: CompanyDashboardSectionStatus[];
  products: ProductCardModel[];
  visualOutputs: VisualOutputModel[];
  technicalFoundation: string[];
  businessAssets: string[];
  qa: Array<{ id: string; label: string; status: ValidationStatus; detail?: string }>;
  release: {
    releaseId?: string;
    version?: string;
    status: string;
    reality: RealityClassification;
  };
  deployment: {
    deploymentId?: string;
    status: "PLAN_READY" | "BLOCKED_BY_CONFIGURATION" | "NOT_CREATED";
    environment?: string;
    reality: RealityClassification;
  };
  timeline: Array<{ id: string; at: string; label: string; kind: string }>;
  blockers: string[];
  approvals: Array<{ id: string; label: string; status: string }>;
  nextActions: CompanyDashboardAction[];
  mapNodes: Array<{
    id: string;
    label: string;
    status: ReadinessStatus;
    reality: RealityClassification;
    version?: string;
    blocker?: string;
    action?: string;
  }>;
}
