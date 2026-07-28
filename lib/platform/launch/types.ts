/** Launch pillar — type contracts. */

import type { VentureId } from "../shared/types";

export type LaunchModuleId =
  | "branding"
  | "landing"
  | "seo"
  | "aso"
  | "marketing"
  | "email"
  | "social"
  | "analytics"
  | "store"
  | "docs";

export interface BrandingAsset {
  id: string;
  type: "logo" | "palette" | "typography" | "voice";
  status: "pending" | "draft" | "ready";
}

export interface LandingPagePlan {
  sections: string[];
  cta: string;
  status: "scaffold";
}

export interface SeoPlan {
  keywords: string[];
  metaTitle: string;
  metaDescription: string;
}

export interface AsoPlan {
  appTitle: string;
  subtitle: string;
  keywords: string[];
}

export interface MarketingChannel {
  id: string;
  name: string;
  budget: number | null;
  status: "planned" | "active" | "paused";
}

export interface EmailCampaign {
  id: string;
  subject: string;
  audience: string;
  status: "draft" | "scheduled" | "sent";
}

export interface SocialPlan {
  platforms: string[];
  cadence: string;
  themes: string[];
}

export interface AnalyticsSetup {
  providers: string[];
  events: string[];
  dashboards: string[];
}

export interface StoreListing {
  platform: "app-store" | "play-store" | "chrome-store";
  status: "draft" | "submitted" | "live";
}

export interface DocsPlan {
  sections: string[];
  format: "markdown" | "notion" | "gitbook";
}

export interface LaunchSnapshot {
  ventureId: VentureId;
  modules: LaunchModuleId[];
  readiness: number;
  updatedAt: string;
}
