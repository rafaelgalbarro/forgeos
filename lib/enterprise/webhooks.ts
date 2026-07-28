/** ForgeOS RC11 — Webhooks (demo). */

import { appendAuditEntry } from "./audit-log";
import { getActiveOrganization } from "./organization-engine";
import { readEnterpriseState, uid, updateEnterpriseState } from "./state";
import type { WebhookEndpoint } from "./types";

export const WEBHOOK_EVENTS = [
  "org.created",
  "user.invited",
  "plan.changed",
  "usage.threshold",
  "audit.alert",
] as const;

export function listWebhooks(orgId?: string): WebhookEndpoint[] {
  const id = orgId ?? getActiveOrganization()?.id;
  if (!id) return [];
  return readEnterpriseState().webhooks.filter((w) => w.orgId === id);
}

export function createWebhook(
  url: string,
  events: string[] = ["org.created"],
  actorEmail = "admin@demo.forgeos"
): WebhookEndpoint {
  const org = getActiveOrganization();
  if (!org) throw new Error("No hay organización activa");

  const hook: WebhookEndpoint = {
    id: uid("wh"),
    orgId: org.id,
    url,
    events,
    status: "active",
    createdAt: new Date().toISOString(),
  };

  updateEnterpriseState((s) => ({ ...s, webhooks: [...s.webhooks, hook] }));

  appendAuditEntry({
    orgId: org.id,
    actorId: "system",
    actorEmail,
    action: "webhook.created",
    resource: url,
    details: events.join(", "),
  });

  return hook;
}
