/** PROGRAM 5700 — Go To Market types (coordinator only). */

import type { MissionPhase } from "../types";

export const GTM_PROGRAM_VERSION = "PROGRAM 5700 — GO TO MARKET";

export type GTMDeliverableId =
  | "launchPlan"
  | "contentCalendar"
  | "linkedInPlan"
  | "emailCampaigns"
  | "productHunt"
  | "pressKit"
  | "websiteReview"
  | "onboardingChecklist";

export const GTM_DELIVERABLE_LABELS: Record<GTMDeliverableId, string> = {
  launchPlan: "Plan de Lanzamiento",
  contentCalendar: "Calendario de Contenido",
  linkedInPlan: "Plan LinkedIn",
  emailCampaigns: "Campañas Email",
  productHunt: "Checklist Product Hunt",
  pressKit: "Press Kit",
  websiteReview: "Revisión Web",
  onboardingChecklist: "Checklist Onboarding",
};

export type GTMDeliverableStatus = "pending" | "generating" | "ready";

export interface GTMContext {
  missionId: string;
  ventureName: string;
  idea: string;
  intention: string;
  industry: string;
  phase: MissionPhase;
  contextHash: string;
}

export interface LaunchPlanMilestone {
  id: string;
  title: string;
  dueWeek: number;
  completed: boolean;
}

export interface LaunchPlanPhase {
  id: string;
  name: string;
  description: string;
  startWeek: number;
  endWeek: number;
  milestones: LaunchPlanMilestone[];
}

export interface LaunchPlan {
  summary: string;
  targetLaunchDate: string;
  phases: LaunchPlanPhase[];
}

export type ContentChannel = "blog" | "social" | "email";

export interface ContentCalendarEntry {
  id: string;
  week: number;
  day: string;
  channel: ContentChannel;
  title: string;
  topic: string;
  cta: string;
}

export interface LinkedInPost {
  id: string;
  week: number;
  day: string;
  format: "texto" | "carrusel" | "video" | "encuesta";
  headline: string;
  body: string;
  audience: string;
  hashtags: string[];
}

export interface EmailCampaignStep {
  id: string;
  dayOffset: number;
  subject: string;
  preview: string;
  goal: string;
}

export interface EmailCampaign {
  id: string;
  name: string;
  type: "welcome" | "launch" | "nurture";
  steps: EmailCampaignStep[];
}

export type ProductHuntPhase = "pre-launch" | "launch-day" | "post-launch";

export interface ProductHuntTask {
  id: string;
  phase: ProductHuntPhase;
  title: string;
  description: string;
  completed: boolean;
}

export interface PressKit {
  companyName: string;
  tagline: string;
  companyDescription: string;
  founderBio: string;
  keyStats: { label: string; value: string }[];
  assets: { name: string; type: string; status: "ready" | "pending" }[];
  contactEmail: string;
}

export interface WebsiteReviewItem {
  id: string;
  category: string;
  criterion: string;
  score: number;
  maxScore: number;
  recommendation: string;
}

export interface OnboardingTask {
  id: string;
  step: number;
  title: string;
  description: string;
  owner: string;
  completed: boolean;
}

export interface GTMPackage {
  missionId: string;
  generatedAt: string;
  contextHash: string;
  ventureName: string;
  launchPlan: LaunchPlan;
  contentCalendar: ContentCalendarEntry[];
  linkedInPlan: LinkedInPost[];
  emailCampaigns: EmailCampaign[];
  productHuntChecklist: ProductHuntTask[];
  pressKit: PressKit;
  websiteReview: WebsiteReviewItem[];
  onboardingChecklist: OnboardingTask[];
  deliverableStatus: Record<GTMDeliverableId, GTMDeliverableStatus>;
}

export interface GTMSnapshot {
  missionId: string;
  generatedAt: string | null;
  contextHash: string;
  deliverableCount: number;
  readyCount: number;
  deliverables: { id: GTMDeliverableId; label: string; status: GTMDeliverableStatus }[];
}

export interface GTMGenerationResult {
  package: GTMPackage;
  snapshot: GTMSnapshot;
  events: { deliverableId: GTMDeliverableId; label: string }[];
}
