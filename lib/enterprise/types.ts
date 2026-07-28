/** ForgeOS RC11 — Enterprise multi-tenant types (NOT autonomous-organization). */

export type BillingPlan = "free" | "pro" | "enterprise";

export type EnterpriseRole = "owner" | "admin" | "manager" | "member" | "viewer";

export type EnterprisePermission =
  | "org:read"
  | "org:write"
  | "team:read"
  | "team:write"
  | "users:read"
  | "users:write"
  | "billing:read"
  | "billing:write"
  | "usage:read"
  | "audit:read"
  | "api_keys:read"
  | "api_keys:write"
  | "webhooks:read"
  | "webhooks:write"
  | "security:read"
  | "security:write"
  | "compliance:read";

export type AuditAction =
  | "org.created"
  | "org.updated"
  | "team.created"
  | "team.updated"
  | "user.invited"
  | "user.role_changed"
  | "plan.changed"
  | "api_key.created"
  | "api_key.revoked"
  | "webhook.created"
  | "sso.configured"
  | "scim.enabled";

export type ComplianceFramework = "gdpr" | "soc2";

export interface EnterpriseOrganization {
  id: string;
  name: string;
  slug: string;
  plan: BillingPlan;
  createdAt: string;
  updatedAt: string;
  settings: {
    ssoEnabled: boolean;
    scimEnabled: boolean;
    mfaRequired: boolean;
  };
}

export interface EnterpriseUser {
  id: string;
  orgId: string;
  email: string;
  name: string;
  role: EnterpriseRole;
  teamIds: string[];
  status: "active" | "invited" | "suspended";
  createdAt: string;
}

export interface EnterpriseTeam {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  memberIds: string[];
  createdAt: string;
}

export interface RoleDefinition {
  role: EnterpriseRole;
  label: string;
  permissions: EnterprisePermission[];
}

export interface AuditLogEntry {
  id: string;
  orgId: string;
  actorId: string;
  actorEmail: string;
  action: AuditAction;
  resource: string;
  details?: string;
  timestamp: string;
}

export interface UsageMetric {
  id: string;
  orgId: string;
  label: string;
  used: number;
  limit: number;
  unit: string;
  period: string;
}

export interface Subscription {
  orgId: string;
  plan: BillingPlan;
  status: "active" | "trialing" | "past_due" | "canceled";
  seats: number;
  seatsUsed: number;
  renewsAt: string;
  monthlyPrice: number;
  currency: string;
}

export interface PlanDefinition {
  id: BillingPlan;
  label: string;
  monthlyPrice: number;
  seats: number;
  features: string[];
}

export interface ApiKey {
  id: string;
  orgId: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
  scopes: EnterprisePermission[];
  status: "active" | "revoked";
}

export interface WebhookEndpoint {
  id: string;
  orgId: string;
  url: string;
  events: string[];
  status: "active" | "disabled";
  createdAt: string;
}

export interface ComplianceChecklistItem {
  id: string;
  framework: ComplianceFramework;
  label: string;
  description: string;
  status: "ready" | "partial" | "pending";
}

export interface SecurityPosture {
  mfaEnabled: boolean;
  ssoReady: boolean;
  scimReady: boolean;
  apiKeyCount: number;
  webhookCount: number;
  lastAuditAt?: string;
  score: number;
}

export interface EnterpriseState {
  organizations: EnterpriseOrganization[];
  users: EnterpriseUser[];
  teams: EnterpriseTeam[];
  apiKeys: ApiKey[];
  webhooks: WebhookEndpoint[];
  activeOrgId?: string;
}
