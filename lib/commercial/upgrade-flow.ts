/** Program 6000 — Upgrade flow */

import { createInvoice } from "./invoices";
import { appendCommercialAudit } from "./audit-logs";
import { pushBillingNotification } from "./notifications";
import { getPlan } from "./plans";
import { quotePlan } from "./pricing-engine";
import { createCheckoutSession } from "./stripe-adapter";
import { changeSubscriptionPlan, getSubscription } from "./subscriptions";
import type { BillingInterval, CommercialPlanId } from "./types";

export interface UpgradeResult {
  ok: boolean;
  planId: CommercialPlanId;
  message: string;
  checkoutUrl?: string;
  dryRun: boolean;
}

export async function requestUpgrade(
  planId: CommercialPlanId,
  orgId?: string,
  interval: BillingInterval = "monthly"
): Promise<UpgradeResult> {
  const sub = getSubscription(orgId);
  if (!sub) {
    return { ok: false, planId, message: "No hay suscripción activa", dryRun: true };
  }

  const plan = getPlan(planId);
  if (!plan) {
    return { ok: false, planId, message: "Plan no encontrado", dryRun: true };
  }

  const quote = quotePlan(planId, interval);
  const checkout = await createCheckoutSession({
    orgId: sub.orgId,
    planId,
    interval,
    successUrl: "/billing?upgraded=1",
    cancelUrl: "/subscriptions",
  });

  changeSubscriptionPlan(sub.orgId, planId, interval);
  createInvoice(sub.orgId, planId, checkout.mode === "dry-run" ? "paid" : "open");

  appendCommercialAudit({
    orgId: sub.orgId,
    actor: "user",
    action: "upgrade.requested",
    resource: planId,
    details: quote ? `Total: €${quote.total}` : undefined,
  });

  pushBillingNotification({
    orgId: sub.orgId,
    type: "upgrade",
    title: `Upgrade a ${plan.name}`,
    message: checkout.message,
  });

  return {
    ok: true,
    planId,
    message: checkout.message,
    checkoutUrl: checkout.url,
    dryRun: checkout.mode === "dry-run",
  };
}

export function canUpgradeTo(currentPlanId: CommercialPlanId, targetPlanId: CommercialPlanId): boolean {
  const order: CommercialPlanId[] = ["starter", "pro", "business", "enterprise"];
  return order.indexOf(targetPlanId) > order.indexOf(currentPlanId);
}
