/** ForgeOS RC11 — API keys (demo). */

import { appendAuditEntry } from "./audit-log";
import { getActiveOrganization } from "./organization-engine";
import { readEnterpriseState, uid, updateEnterpriseState } from "./state";
import type { ApiKey, EnterprisePermission } from "./types";

export function listApiKeys(orgId?: string): ApiKey[] {
  const id = orgId ?? getActiveOrganization()?.id;
  if (!id) return [];
  return readEnterpriseState().apiKeys.filter((k) => k.orgId === id);
}

export function createApiKey(
  name: string,
  scopes: EnterprisePermission[] = ["org:read", "usage:read"],
  actorEmail = "admin@demo.forgeos"
): ApiKey {
  const org = getActiveOrganization();
  if (!org) throw new Error("No hay organización activa");

  const key: ApiKey = {
    id: uid("key"),
    orgId: org.id,
    name,
    prefix: `fgs_${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
    scopes,
    status: "active",
  };

  updateEnterpriseState((s) => ({ ...s, apiKeys: [...s.apiKeys, key] }));

  appendAuditEntry({
    orgId: org.id,
    actorId: "system",
    actorEmail,
    action: "api_key.created",
    resource: key.prefix,
    details: name,
  });

  return key;
}

export function revokeApiKey(keyId: string, actorEmail = "admin@demo.forgeos"): void {
  updateEnterpriseState((s) => ({
    ...s,
    apiKeys: s.apiKeys.map((k) =>
      k.id === keyId ? { ...k, status: "revoked" as const } : k
    ),
  }));

  const key = readEnterpriseState().apiKeys.find((k) => k.id === keyId);
  if (key) {
    appendAuditEntry({
      orgId: key.orgId,
      actorId: "system",
      actorEmail,
      action: "api_key.revoked",
      resource: key.prefix,
    });
  }
}
