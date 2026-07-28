/** Program 7000 — ForgeOS 1.0 Launch types */

export type LaunchSectionId =
  | "hero"
  | "features"
  | "pricing"
  | "docs"
  | "demo"
  | "community"
  | "case-studies"
  | "newsletter"
  | "legal";

export interface LaunchHubLink {
  id: string;
  label: string;
  href: string;
  description: string;
  badge?: string;
}

export interface MarketingSection {
  id: string;
  title: string;
  description: string;
  bullets?: string[];
  cta?: { label: string; href: string };
}

export interface PublicDocEntry {
  id: string;
  title: string;
  summary: string;
  href: string;
  category: string;
}

export interface SdkLink {
  id: string;
  title: string;
  summary: string;
  href: string;
  language?: string;
}

export interface ApiDocEntry {
  id: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  summary: string;
  planRequired?: string;
}

export interface MarketplacePreviewItem {
  id: string;
  name: string;
  category: string;
  summary: string;
  author: string;
  href: string;
}

export interface VideoTutorial {
  id: string;
  title: string;
  duration: string;
  summary: string;
  href: string;
  comingSoon?: boolean;
}

export type ProductTourStepId =
  | "welcome"
  | "venture-factory"
  | "founder-journey"
  | "live-ops"
  | "pricing"
  | "complete";

export interface ProductTourStep {
  id: ProductTourStepId;
  title: string;
  description: string;
  highlight?: string;
}

export interface ProductTourState {
  currentStep: ProductTourStepId;
  completedSteps: ProductTourStepId[];
  startedAt?: string;
  completedAt?: string;
}

export interface DemoScenario {
  id: string;
  title: string;
  description: string;
  cta: string;
  href: string;
}

export interface CaseStudy {
  id: string;
  title: string;
  industry: string;
  summary: string;
  outcomes: string[];
  href?: string;
  generic?: boolean;
}

export interface NewsletterSignupRecord {
  id: string;
  email: string;
  createdAt: string;
}

export interface CommunityChannel {
  id: string;
  name: string;
  description: string;
  href: string;
  status: "live" | "coming-soon";
}

export interface ContactFormPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface LegalHubLink {
  id: string;
  title: string;
  summary: string;
  href: string;
  status: "ready" | "placeholder";
}

export interface LaunchHubData {
  version: string;
  title: string;
  tagline: string;
  launchMode: boolean;
  primaryLinks: LaunchHubLink[];
  marketingSections: MarketingSection[];
  stats: { label: string; value: string }[];
}
