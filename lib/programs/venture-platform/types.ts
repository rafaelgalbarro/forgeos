/** Venture Platform — program-specific scaffold types (future SaaS). */

export type VenturePlatformModuleId =
  | "launch"
  | "growth"
  | "notifications"
  | "headquarters"
  | "orgs"
  | "teams"
  | "api"
  | "billing";

/** Scaffold — future multi-tenant organization. */
export interface PlatformOrganization {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "studio" | "enterprise";
  createdAt: string;
}

/** Scaffold — team within an organization. */
export interface PlatformTeam {
  id: string;
  orgId: string;
  name: string;
  role: "owner" | "admin" | "member" | "viewer";
}

/** Scaffold — API key for platform access. */
export interface PlatformApiKey {
  id: string;
  orgId: string;
  label: string;
  scopes: string[];
  createdAt: string;
  expiresAt?: string;
}

/** Scaffold — billing subscription. */
export interface PlatformBillingSubscription {
  id: string;
  orgId: string;
  plan: string;
  status: "active" | "trialing" | "past_due" | "cancelled";
  currentPeriodEnd: string;
}
