/** Program 3000 Sprint 6 — Private Beta Platform types */

export const BETA_PLATFORM_VERSION = "3000.6.0";

export type WaitlistStatus = "pending" | "invited" | "registered" | "active";

export interface WaitlistEntry {
  id: string;
  email: string;
  name: string;
  company?: string;
  useCase?: string;
  status: WaitlistStatus;
  queuePosition: number;
  createdAt: string;
  invitedAt?: string;
  registeredAt?: string;
}

export type InvitationStatus = "active" | "redeemed" | "expired";

export interface InvitationCode {
  code: string;
  label: string;
  maxUses: number;
  usedCount: number;
  status: InvitationStatus;
  createdAt: string;
  expiresAt?: string;
  redeemedBy?: string[];
}

export interface InvitationRedemption {
  code: string;
  email: string;
  redeemedAt: string;
}

export type FeedbackCategory = "bug" | "feature" | "general" | "ux" | "performance";

export interface BetaFeedbackRecord {
  id: string;
  userId?: string;
  email?: string;
  message: string;
  category: FeedbackCategory;
  page: string;
  rating?: number;
  createdAt: string;
}

export type BetaAnalyticsEvent =
  | "page_view"
  | "waitlist_join"
  | "invitation_redeem"
  | "beta_dashboard_view"
  | "feature_flag_toggle"
  | "feedback_submit"
  | "crash_report"
  | "beta_register"
  | "cta_click";

export interface BetaAnalyticsEventRecord {
  id: string;
  event: BetaAnalyticsEvent;
  path?: string;
  userId?: string;
  workspaceId?: string;
  label?: string;
  meta?: Record<string, string>;
  timestamp: string;
}

export type CrashSeverity = "low" | "medium" | "high" | "critical";

export interface CrashReport {
  id: string;
  message: string;
  stack?: string;
  page: string;
  userId?: string;
  severity: CrashSeverity;
  userAgent?: string;
  createdAt: string;
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  scope: "global" | "user" | "workspace";
  defaultValue: boolean;
}

export interface FeatureFlagOverride {
  flagId: string;
  enabled: boolean;
  userId?: string;
  workspaceId?: string;
  updatedAt: string;
}

export interface BetaChangelogEntry {
  version: string;
  date: string;
  title: string;
  highlights: string[];
  tag: "major" | "minor" | "patch";
  sprint?: string;
}

export type BetaAccessStage = "none" | "waitlist" | "invited" | "registered" | "active";

export interface BetaAccessState {
  stage: BetaAccessStage;
  waitlistEntry: WaitlistEntry | null;
  invitation: InvitationRedemption | null;
  hasAuthSession: boolean;
  canAccessDashboard: boolean;
  canAccessProduct: boolean;
}

export interface BetaDashboardData {
  access: BetaAccessState;
  waitlistPosition: number | null;
  feedbackCount: number;
  analyticsEventCount: number;
  crashReportCount: number;
  featureFlags: Array<FeatureFlag & { resolved: boolean }>;
  recentChangelog: BetaChangelogEntry[];
  systemStatus: "operational" | "degraded" | "maintenance";
}
