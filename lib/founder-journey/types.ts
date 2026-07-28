export type JourneyPhaseId =
  | "idea"
  | "discovery"
  | "validacion"
  | "research"
  | "competidores"
  | "ceo-review"
  | "board-decision"
  | "product"
  | "architecture"
  | "ux"
  | "build"
  | "qa"
  | "deployment"
  | "launch"
  | "growth";

export type JourneyPhaseStatus = "pending" | "active" | "complete" | "blocked";

export type BlockerSeverity = "info" | "warning" | "critical";

export interface JourneyBlocker {
  id: string;
  label: string;
  severity: BlockerSeverity;
}

export interface JourneyNextAction {
  label: string;
  description: string;
  href?: string;
  estimatedMinutes?: number;
}

export interface JourneyPhaseDefinition {
  id: JourneyPhaseId;
  label: string;
  order: number;
  objetivo: string;
  estimatedTime: string;
  valueTemplate: string;
  executive?: boolean;
}

export interface JourneyPhaseState extends JourneyPhaseDefinition {
  status: JourneyPhaseStatus;
  progress: number;
  blockers: JourneyBlocker[];
  nextAction: JourneyNextAction | null;
  valueGenerated: string;
  executiveNote?: string;
}

export interface JourneySummary {
  ventureId: string;
  ventureName: string;
  overallProgress: number;
  currentPhaseId: JourneyPhaseId;
  currentPhaseLabel: string;
  phasesComplete: number;
  phasesTotal: number;
  estimatedTimeRemaining: string;
  totalValueGenerated: string;
}

export interface FounderJourneySnapshot {
  summary: JourneySummary;
  phases: JourneyPhaseState[];
  timeline: JourneyTimelineEntry[];
  updatedAt: string;
}

export interface JourneyTimelineEntry {
  phaseId: JourneyPhaseId;
  label: string;
  status: JourneyPhaseStatus;
  progress: number;
  time?: string;
  description?: string;
}

export interface JourneyStoreState {
  ventureId: string | null;
  selectedPhaseId: JourneyPhaseId | null;
  lastViewedAt: string | null;
}

/** Program 3000 Sprint 2 — unified founder onboarding & journey flow. */

export type FounderOnboardingStepId =
  | "perfil"
  | "empresa"
  | "objetivos"
  | "mercado"
  | "primera-venture"
  | "ceo-briefing";

export interface FounderOnboardingStep {
  id: FounderOnboardingStepId;
  title: string;
  description: string;
}

export interface FounderProfileData {
  name: string;
  role: "founder" | "creator" | "executive";
  bio: string;
}

export interface FounderCompanyData {
  companyName: string;
  industry: string;
  teamSize: string;
}

export interface FounderMarketData {
  targetAudience: string;
  marketSize: string;
  competitors: string;
  category: "saas" | "marketplace" | "dashboard" | "reservas" | "mobile" | "ecommerce";
}

export interface FounderVentureData {
  name: string;
  idea: string;
  priority: "low" | "medium" | "high";
}

export interface FounderCeoBriefingData {
  priorities: string[];
  acknowledged: boolean;
}

export interface FounderOnboardingState {
  currentStep: FounderOnboardingStepId;
  completedSteps: FounderOnboardingStepId[];
  profile: FounderProfileData;
  company: FounderCompanyData;
  goals: string[];
  market: FounderMarketData;
  venture: FounderVentureData;
  ceoBriefing: FounderCeoBriefingData;
  startedAt: string;
  completedAt?: string;
  ventureId?: string;
}

export type FounderJourneyMilestoneId =
  | "landing"
  | "register"
  | "onboarding"
  | "workspace"
  | "venture-created"
  | "ceo"
  | "organization"
  | "live"
  | "venture-factory";

export interface FounderJourneyMilestone {
  id: FounderJourneyMilestoneId;
  label: string;
  href: string;
  description: string;
}

export interface FounderJourneyProgress {
  milestones: FounderJourneyMilestone[];
  completedIds: FounderJourneyMilestoneId[];
  currentId: FounderJourneyMilestoneId;
  percentComplete: number;
}

export interface WelcomeDashboardData {
  greeting: string;
  subtitle: string;
  nextAction: { label: string; href: string; description: string };
  quickLinks: { label: string; href: string }[];
  stats: { label: string; value: string }[];
}

export interface CeoWelcomeContent {
  headline: string;
  summary: string;
  priorities: string[];
  recommendations: string[];
  cta: { label: string; href: string };
}

export interface FounderJourneyCompletionResult {
  ventureId: string;
  workspaceId: string | null;
  nextRoute: string;
}
