/** RC12 — ForgeOS 1.0 Launch Preparation types */

export type BetaSignupStatus = "pending" | "approved" | "active";

export interface BetaSignupRecord {
  id: string;
  email: string;
  name: string;
  company?: string;
  useCase?: string;
  status: BetaSignupStatus;
  createdAt: string;
  approvedAt?: string;
}

export type OnboardingStepId =
  | "welcome"
  | "profile"
  | "goals"
  | "workspace"
  | "complete";

export interface OnboardingStep {
  id: OnboardingStepId;
  title: string;
  description: string;
  optional?: boolean;
}

export interface OnboardingState {
  currentStep: OnboardingStepId;
  completedSteps: OnboardingStepId[];
  profile: {
    name: string;
    role: string;
    company: string;
  };
  goals: string[];
  venturePath: "venture-factory" | "founder-journey" | "founder";
  startedAt: string;
  completedAt?: string;
}

export type AnalyticsEvent =
  | "page_view"
  | "beta_signup"
  | "onboarding_start"
  | "onboarding_step"
  | "onboarding_complete"
  | "cta_click"
  | "feedback_submit"
  | "pricing_view";

export interface AnalyticsPayload {
  event: AnalyticsEvent;
  path?: string;
  label?: string;
  step?: OnboardingStepId;
  meta?: Record<string, string>;
}

export interface FeedbackRecord {
  id: string;
  message: string;
  category: "bug" | "feature" | "general";
  page: string;
  createdAt: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  highlights: string[];
  tag: "major" | "minor" | "patch";
}

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  quarter: string;
  status: "shipped" | "in-progress" | "planned";
  category: "platform" | "ai" | "ecosystem" | "enterprise";
}

export interface PricingTier {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  badge?: string;
}

export interface DocArticle {
  slug: string;
  title: string;
  summary: string;
  category: "quickstart" | "guide" | "reference" | "legal";
  readMinutes: number;
}

export interface SupportArticle {
  id: string;
  title: string;
  summary: string;
  category: "getting-started" | "billing" | "technical" | "account";
}

export interface StatusService {
  id: string;
  name: string;
  status: "operational" | "degraded" | "maintenance" | "outage";
  description: string;
}
