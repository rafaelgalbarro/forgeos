/** Program 6000 — Plan-gated features (extends beta feature flags) */

import { isFeatureEnabled as isBetaFeatureEnabled } from "@/lib/beta-platform/feature-flags";
import { getSubscription } from "./subscriptions";
import type { CommercialPlanId } from "./types";

export interface CommercialFeatureFlag {
  id: string;
  name: string;
  description: string;
  minPlan: CommercialPlanId;
}

const PLAN_ORDER: CommercialPlanId[] = ["starter", "pro", "business", "enterprise"];

export const COMMERCIAL_FEATURE_FLAGS: CommercialFeatureFlag[] = [
  { id: "live-ai", name: "Live AI", description: "Operaciones AI en tiempo real", minPlan: "pro" },
  { id: "api-access", name: "API Access", description: "Claves API y webhooks", minPlan: "business" },
  { id: "autonomous-org", name: "Autonomous Org", description: "Departamentos autónomos", minPlan: "business" },
  { id: "sso-scim", name: "SSO / SCIM", description: "Single sign-on empresarial", minPlan: "enterprise" },
  { id: "security-center", name: "Security Center", description: "Panel de seguridad avanzado", minPlan: "enterprise" },
  { id: "advanced-analytics", name: "Analytics avanzado", description: "KPIs y métricas de portfolio", minPlan: "pro" },
];

function planRank(planId: CommercialPlanId): number {
  return PLAN_ORDER.indexOf(planId);
}

export function isCommercialFeatureEnabled(
  featureId: string,
  orgId?: string,
  betaContext?: { userId?: string; workspaceId?: string }
): boolean {
  const flag = COMMERCIAL_FEATURE_FLAGS.find((f) => f.id === featureId);
  if (!flag) {
    return isBetaFeatureEnabled(featureId, betaContext);
  }

  const sub = getSubscription(orgId);
  const planId = sub?.planId ?? "starter";
  if (planRank(planId) < planRank(flag.minPlan)) return false;

  return isBetaFeatureEnabled(featureId, betaContext) || planRank(planId) >= planRank(flag.minPlan);
}

export function listCommercialFeatures(orgId?: string): Array<CommercialFeatureFlag & { enabled: boolean }> {
  return COMMERCIAL_FEATURE_FLAGS.map((f) => ({
    ...f,
    enabled: isCommercialFeatureEnabled(f.id, orgId),
  }));
}

export function getRequiredPlan(featureId: string): CommercialPlanId | null {
  return COMMERCIAL_FEATURE_FLAGS.find((f) => f.id === featureId)?.minPlan ?? null;
}
