/** Program 6000 — Invoice records stub */

import { readStorage, writeStorage } from "@/lib/beta-platform/storage";
import { COMMERCIAL_STORAGE_KEYS, DEFAULT_CURRENCY } from "./config";
import { getPlan } from "./plans";
import { getSubscription } from "./subscriptions";
import type { CommercialInvoice, CommercialPlanId, InvoiceStatus } from "./types";

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function readInvoices(): CommercialInvoice[] {
  return readStorage<CommercialInvoice[]>(COMMERCIAL_STORAGE_KEYS.invoices, []);
}

function writeInvoices(invoices: CommercialInvoice[]): void {
  writeStorage(COMMERCIAL_STORAGE_KEYS.invoices, invoices);
}

export function listInvoices(orgId?: string): CommercialInvoice[] {
  const sub = getSubscription(orgId);
  if (!sub) return [];
  return readInvoices()
    .filter((i) => i.orgId === sub.orgId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createInvoice(
  orgId: string,
  planId: CommercialPlanId,
  status: InvoiceStatus = "paid"
): CommercialInvoice {
  const plan = getPlan(planId)!;
  const sub = getSubscription(orgId);
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const invoice: CommercialInvoice = {
    id: uid("inv"),
    orgId,
    subscriptionId: sub?.id ?? "sub_demo",
    number: `INV-${now.getFullYear()}-${String(readInvoices().length + 1).padStart(4, "0")}`,
    status,
    amount: plan.monthlyPrice,
    currency: plan.currency || DEFAULT_CURRENCY,
    periodStart: now.toISOString().slice(0, 10),
    periodEnd: periodEnd.toISOString().slice(0, 10),
    paidAt: status === "paid" ? now.toISOString() : undefined,
    createdAt: now.toISOString(),
  };

  writeInvoices([...readInvoices(), invoice]);
  return invoice;
}

export function ensureDemoInvoices(orgId: string): CommercialInvoice[] {
  const existing = listInvoices(orgId);
  if (existing.length > 0) return existing;

  const sub = getSubscription(orgId);
  if (!sub) return [];

  createInvoice(orgId, sub.planId, "paid");
  return listInvoices(orgId);
}
