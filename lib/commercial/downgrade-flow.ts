/** Program 6000 — Downgrade flow */

import { appendCommercialAudit } from "./audit-logs";
import { pushBillingNotification } from "./notifications";
import { getPlan } from "./plans";
import { changeSubscriptionPlan, getSubscription } from "./subscriptions";
import type { CommercialPlanId } from "./types";

export interface DowngradeResult {
  ok: boolean;
  planId: CommercialPlanId;
  message: string;
  effectiveAt: string;
}

export function requestDowngrade(
  planId: CommercialPlanId,
  orgId?: string
): DowngradeResult {
  const sub = getSubscription(orgId);
  if (!sub) {
    return { ok: false, planId, message: "No hay suscripción activa", effectiveAt: "" };
  }

  const plan = getPlan(planId);
  if (!plan) {
    return { ok: false, planId, message: "Plan no encontrado", effectiveAt: "" };
  }

  const order: CommercialPlanId[] = ["starter", "pro", "business", "enterprise"];
  if (order.indexOf(planId) >= order.indexOf(sub.planId)) {
    return { ok: false, planId, message: "No es un downgrade válido", effectiveAt: "" };
  }

  changeSubscriptionPlan(sub.orgId, planId);
  const effectiveAt = sub.currentPeriodEnd;

  appendCommercialAudit({
    orgId: sub.orgId,
    actor: "user",
    action: "downgrade.requested",
    resource: planId,
    details: `Efectivo: ${effectiveAt.slice(0, 10)}`,
  });

  pushBillingNotification({
    orgId: sub.orgId,
    type: "downgrade",
    title: `Downgrade a ${plan.name}`,
    message: `El cambio será efectivo al final del periodo (${effectiveAt.slice(0, 10)}).`,
  });

  return {
    ok: true,
    planId,
    message: `Downgrade programado a ${plan.name}`,
    effectiveAt,
  };
}

export function canDowngradeTo(currentPlanId: CommercialPlanId, targetPlanId: CommercialPlanId): boolean {
  const order: CommercialPlanId[] = ["starter", "pro", "business", "enterprise"];
  return order.indexOf(targetPlanId) < order.indexOf(currentPlanId);
}
