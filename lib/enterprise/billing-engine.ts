/** ForgeOS RC11 — Billing plans & mock billing engine. */

import { appendAuditEntry } from "./audit-log";
import { getActiveOrganization, getOrganization, updateOrganization } from "./organization-engine";
import { listUsers } from "./user-engine";
import type { BillingPlan, PlanDefinition } from "./types";

export const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    id: "free",
    label: "Free",
    monthlyPrice: 0,
    seats: 3,
    features: ["3 asientos", "Equipos básicos", "Uso limitado", "Soporte comunidad"],
  },
  {
    id: "pro",
    label: "Pro",
    monthlyPrice: 49,
    seats: 25,
    features: ["25 asientos", "Auditoría", "API keys", "Webhooks", "Soporte email"],
  },
  {
    id: "enterprise",
    label: "Enterprise",
    monthlyPrice: 299,
    seats: 999,
    features: [
      "Asientos ilimitados",
      "SSO / SCIM ready",
      "Cumplimiento GDPR/SOC2",
      "Security Center",
      "Soporte prioritario",
    ],
  },
];

export function getPlanDefinition(plan: BillingPlan): PlanDefinition {
  return PLAN_DEFINITIONS.find((p) => p.id === plan) ?? PLAN_DEFINITIONS[0];
}

export function listPlans(): PlanDefinition[] {
  return PLAN_DEFINITIONS;
}

export interface BillingSummary {
  plan: PlanDefinition;
  seatsUsed: number;
  seatsAvailable: number;
  monthlyTotal: number;
  currency: string;
  nextInvoiceDate: string;
}

export function getBillingSummary(orgId?: string): BillingSummary | null {
  const org = orgId ? getOrganization(orgId) : getActiveOrganization();
  if (!org) return null;

  const plan = getPlanDefinition(org.plan);
  const seatsUsed = listUsers(org.id).length;
  const renews = new Date();
  renews.setMonth(renews.getMonth() + 1);

  return {
    plan,
    seatsUsed,
    seatsAvailable: plan.seats,
    monthlyTotal: plan.monthlyPrice,
    currency: "EUR",
    nextInvoiceDate: renews.toISOString().slice(0, 10),
  };
}

export function changePlan(
  plan: BillingPlan,
  actorEmail = "admin@demo.forgeos"
): BillingSummary | null {
  const org = getActiveOrganization();
  if (!org) return null;

  updateOrganization(org.id, { plan }, actorEmail);

  appendAuditEntry({
    orgId: org.id,
    actorId: "system",
    actorEmail,
    action: "plan.changed",
    resource: org.slug,
    details: `Plan cambiado a ${plan}`,
  });

  return getBillingSummary(org.id);
}
