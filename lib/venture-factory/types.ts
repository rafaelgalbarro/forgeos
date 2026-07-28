/** Venture Factory RC7 — types */

export type VentureFactoryStageId =
  | "idea"
  | "research"
  | "mercado"
  | "competidores"
  | "pricing"
  | "business_model"
  | "naming"
  | "brand"
  | "landing"
  | "prd"
  | "architecture"
  | "ux"
  | "frontend"
  | "backend"
  | "database"
  | "deployment"
  | "marketing"
  | "revenue_dashboard";

export interface VentureFactoryStage {
  id: VentureFactoryStageId;
  label: string;
  durationMs: number;
}

export type VentureFactoryStatus = "idle" | "running" | "completed" | "cancelled";

export interface VentureIdeaContext {
  command: string;
  ideaText: string;
  vertical: string;
  dryRun: boolean;
  startedAt: string;
}

export interface MarketAnalysis {
  tam: string;
  sam: string;
  som: string;
  segments: string[];
  trends: string[];
  geography: string;
}

export interface CompetitorProfile {
  name: string;
  positioning: string;
  strengths: string[];
  weaknesses: string[];
  priceRange: string;
}

export interface PricingPlan {
  name: string;
  price: string;
  features: string[];
}

export interface PricingModel {
  strategy: string;
  currency: string;
  plans: PricingPlan[];
  unitEconomics: string;
}

export interface BusinessModelCanvas {
  valueProposition: string;
  customerSegments: string[];
  channels: string[];
  revenueStreams: string[];
  costStructure: string[];
  keyActivities: string[];
}

export interface BrandIdentity {
  name: string;
  tagline: string;
  tone: string;
  colors: string[];
  typography: string;
  logoConcept: string;
}

export interface LandingCopy {
  headline: string;
  subheadline: string;
  cta: string;
  sections: { title: string; body: string }[];
  heroBullets: string[];
}

export interface PrdSummary {
  productName: string;
  vision: string;
  mvpFeatures: string[];
  userStories: string[];
  successMetrics: string[];
  sprint1: string[];
}

export interface ArchitecturePlan {
  stack: string[];
  services: string[];
  integrations: string[];
  security: string[];
  diagram: string;
}

export interface SoftwarePlan {
  frontend: { framework: string; pages: string[]; components: string[] };
  backend: { framework: string; routes: string[]; services: string[] };
  database: { engine: string; tables: string[]; migrations: string };
  ux: { flows: string[]; wireframes: string[] };
}

export interface DeploymentPreview {
  provider: string;
  environments: string[];
  steps: string[];
  rollbackPlan: string;
  estimatedTime: string;
}

export interface MarketingPlan {
  channels: string[];
  campaigns: string[];
  contentCalendar: string[];
  launchWeek: string[];
}

export interface RevenueDashboardData {
  mrrProjection: string;
  arrProjection: string;
  kpis: { label: string; value: string; trend: string }[];
  funnel: { stage: string; rate: string }[];
  cohortNote: string;
}

export interface VentureHealthScore {
  overall: number;
  marketFit: number;
  differentiation: number;
  executionReadiness: number;
  notes: string[];
}

export interface VentureFactoryOutput {
  companyName: string;
  valueProposition: string;
  market: MarketAnalysis;
  competitors: CompetitorProfile[];
  pricing: PricingModel;
  businessModel: BusinessModelCanvas;
  brand: BrandIdentity;
  landing: LandingCopy;
  prd: PrdSummary;
  architecture: ArchitecturePlan;
  softwarePlan: SoftwarePlan;
  deployment: DeploymentPreview;
  marketing: MarketingPlan;
  revenue: RevenueDashboardData;
  health: VentureHealthScore;
}

export interface VentureFactoryTimelineEvent {
  id: string;
  stageId: VentureFactoryStageId;
  timestamp: string;
  label: string;
  message: string;
  status: "pending" | "active" | "done";
}

export interface VentureFactoryState {
  status: VentureFactoryStatus;
  context: VentureIdeaContext | null;
  currentStageId: VentureFactoryStageId | null;
  stages: VentureFactoryStage[];
  timeline: VentureFactoryTimelineEvent[];
  progress: number;
  output: VentureFactoryOutput | null;
  resultSummary: string | null;
}

export type VentureFactoryEvent =
  | { type: "started" }
  | { type: "stage_begin"; stageId: VentureFactoryStageId; message: string }
  | { type: "stage_end"; stageId: VentureFactoryStageId }
  | { type: "completed"; resultSummary: string }
  | { type: "cancelled" };
