/** Program 6000 — Trial management */

import { appendCommercialAudit } from "./audit-logs";
import { pushBillingNotification } from "./notifications";
import { getPlan } from "./plans";
import { ensureSubscription, getSubscription, updateSubscription } from "./subscriptions";
import type { CommercialPlanId } from "./types";

const DEFAULT_TRIAL_DAYS = 14;

export function startTrial(
  planId: CommercialPlanId = "pro",
  orgId?: string,
  days = DEFAULT_TRIAL_DAYS
): ReturnType<typeof getSubscription> {
  const sub = ensureSubscription(orgId, planId);
  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + days);

  const updated = updateSubscription(sub.orgId, {
    planId,
    status: "trialing",
    trialEndsAt: trialEnds.toISOString(),
  });

  const plan = getPlan(planId);
  appendCommercialAudit({
    orgId: sub.orgId,
    actor: "system",
    action: "trial.started",
    resource: planId,
    details: `${days} días — ${plan?.name}`,
  });

  pushBillingNotification({
    orgId: sub.orgId,
    type: "trial",
    title: `Trial ${plan?.name ?? planId} activo`,
    message: `Tu prueba termina el ${trialEnds.toISOString().slice(0, 10)}.`,
  });

  return updated;
}

export function getTrialDaysRemaining(orgId?: string): number | null {
  const sub = getSubscription(orgId);
  if (!sub?.trialEndsAt || sub.status !== "trialing") return null;
  const end = new Date(sub.trialEndsAt).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
}

export function isTrialActive(orgId?: string): boolean {
  const days = getTrialDaysRemaining(orgId);
  return days !== null && days > 0;
}

export function endTrial(orgId: string, convertToPlan?: CommercialPlanId): void {
  const sub = getSubscription(orgId);
  if (!sub) return;

  updateSubscription(orgId, {
    status: "active",
    trialEndsAt: undefined,
    planId: convertToPlan ?? sub.planId,
  });

  appendCommercialAudit({
    orgId,
    actor: "system",
    action: "trial.ended",
    resource: sub.id,
  });
}
