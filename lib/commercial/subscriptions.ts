/** Program 6000 — Subscription state (localStorage default) */

import { readStorage, writeStorage } from "@/lib/beta-platform/storage";
import { COMMERCIAL_STORAGE_KEYS } from "./config";
import { getPlan } from "./plans";
import { appendCommercialAudit } from "./audit-logs";
import type { BillingInterval, CommercialPlanId, CommercialSubscription, SubscriptionStatus } from "./types";

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function readSubscriptions(): CommercialSubscription[] {
  return readStorage<CommercialSubscription[]>(COMMERCIAL_STORAGE_KEYS.subscriptions, []);
}

function writeSubscriptions(subs: CommercialSubscription[]): void {
  writeStorage(COMMERCIAL_STORAGE_KEYS.subscriptions, subs);
}

export function getActiveOrgId(): string {
  return readStorage<string>(COMMERCIAL_STORAGE_KEYS.activeOrg, "org_demo");
}

export function setActiveOrgId(orgId: string): void {
  writeStorage(COMMERCIAL_STORAGE_KEYS.activeOrg, orgId);
}

export function getSubscription(orgId?: string): CommercialSubscription | null {
  const id = orgId ?? getActiveOrgId();
  return readSubscriptions().find((s) => s.orgId === id && s.status !== "canceled") ?? null;
}

export function ensureSubscription(
  orgId?: string,
  planId: CommercialPlanId = "starter"
): CommercialSubscription {
  const id = orgId ?? getActiveOrgId();
  const existing = getSubscription(id);
  if (existing) return existing;

  const plan = getPlan(planId)!;
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const sub: CommercialSubscription = {
    id: uid("sub"),
    orgId: id,
    planId,
    status: "active",
    interval: "monthly",
    seats: plan.seats,
    seatsUsed: 1,
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    cancelAtPeriodEnd: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  writeSubscriptions([...readSubscriptions(), sub]);
  return sub;
}

export function updateSubscription(
  orgId: string,
  patch: Partial<Pick<CommercialSubscription, "planId" | "status" | "interval" | "seats" | "cancelAtPeriodEnd" | "trialEndsAt">>
): CommercialSubscription | null {
  const subs = readSubscriptions();
  const idx = subs.findIndex((s) => s.orgId === orgId && s.status !== "canceled");
  if (idx < 0) return null;

  const next: CommercialSubscription = {
    ...subs[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  subs[idx] = next;
  writeSubscriptions(subs);
  return next;
}

export function setSubscriptionStatus(orgId: string, status: SubscriptionStatus): CommercialSubscription | null {
  return updateSubscription(orgId, { status });
}

export function listSubscriptions(): CommercialSubscription[] {
  return readSubscriptions();
}

export function cancelSubscription(orgId: string, atPeriodEnd = true): CommercialSubscription | null {
  const patch = atPeriodEnd
    ? { cancelAtPeriodEnd: true }
    : { cancelAtPeriodEnd: false, status: "canceled" as const };
  const sub = updateSubscription(orgId, patch);
  if (sub) {
    appendCommercialAudit({
      orgId,
      actor: "system",
      action: "subscription.canceled",
      resource: sub.id,
      details: atPeriodEnd ? "Cancelación al fin del periodo" : "Cancelación inmediata",
    });
  }
  return sub;
}

export function changeSubscriptionPlan(
  orgId: string,
  planId: CommercialPlanId,
  interval: BillingInterval = "monthly"
): CommercialSubscription | null {
  const plan = getPlan(planId);
  if (!plan) return null;

  const sub = updateSubscription(orgId, { planId, interval, seats: plan.seats });
  if (sub) {
    appendCommercialAudit({
      orgId,
      actor: "user",
      action: "subscription.plan_changed",
      resource: sub.id,
      details: `Plan → ${planId}`,
    });
  }
  return sub;
}
