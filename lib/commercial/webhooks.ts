/** Program 6000 — Webhook registry stub */

import { readStorage, writeStorage } from "@/lib/beta-platform/storage";
import { appendCommercialAudit } from "./audit-logs";
import { COMMERCIAL_STORAGE_KEYS } from "./config";
import { getActiveOrgId } from "./subscriptions";
import type { CommercialWebhook } from "./types";

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function readWebhooks(): CommercialWebhook[] {
  return readStorage<CommercialWebhook[]>(COMMERCIAL_STORAGE_KEYS.webhooks, []);
}

function writeWebhooks(webhooks: CommercialWebhook[]): void {
  writeStorage(COMMERCIAL_STORAGE_KEYS.webhooks, webhooks);
}

export const WEBHOOK_EVENTS = [
  "subscription.created",
  "subscription.updated",
  "invoice.paid",
  "invoice.payment_failed",
  "usage.threshold",
] as const;

export function listCommercialWebhooks(orgId?: string): CommercialWebhook[] {
  const id = orgId ?? getActiveOrgId();
  return readWebhooks().filter((w) => w.orgId === id);
}

export function registerWebhook(
  url: string,
  events: string[] = ["subscription.updated"],
  orgId?: string
): CommercialWebhook {
  const id = orgId ?? getActiveOrgId();
  const webhook: CommercialWebhook = {
    id: uid("wh"),
    orgId: id,
    url,
    events,
    status: "active",
    secret: `whsec_${Math.random().toString(36).slice(2, 18)}`,
    createdAt: new Date().toISOString(),
  };

  writeWebhooks([...readWebhooks(), webhook]);
  appendCommercialAudit({
    orgId: id,
    actor: "user",
    action: "webhook.registered",
    resource: url,
  });

  return webhook;
}

export function disableWebhook(webhookId: string): void {
  writeWebhooks(
    readWebhooks().map((w) =>
      w.id === webhookId ? { ...w, status: "disabled" as const } : w
    )
  );
}
