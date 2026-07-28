/** Program 6000 — API key management (localStorage) */

import { readStorage, writeStorage } from "@/lib/beta-platform/storage";
import { appendCommercialAudit } from "./audit-logs";
import { COMMERCIAL_STORAGE_KEYS } from "./config";
import { getActiveOrgId } from "./subscriptions";
import type { CommercialApiKey } from "./types";

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function readKeys(): CommercialApiKey[] {
  return readStorage<CommercialApiKey[]>(COMMERCIAL_STORAGE_KEYS.apiKeys, []);
}

function writeKeys(keys: CommercialApiKey[]): void {
  writeStorage(COMMERCIAL_STORAGE_KEYS.apiKeys, keys);
}

export function listCommercialApiKeys(orgId?: string): CommercialApiKey[] {
  const id = orgId ?? getActiveOrgId();
  return readKeys().filter((k) => k.orgId === id && k.status === "active");
}

export function createCommercialApiKey(
  name: string,
  scopes: string[] = ["read:ventures", "read:usage"],
  orgId?: string
): CommercialApiKey {
  const id = orgId ?? getActiveOrgId();
  const key: CommercialApiKey = {
    id: uid("ckey"),
    orgId: id,
    name,
    prefix: `fos_${Math.random().toString(36).slice(2, 10)}`,
    scopes,
    status: "active",
    createdAt: new Date().toISOString(),
  };

  writeKeys([...readKeys(), key]);
  appendCommercialAudit({
    orgId: id,
    actor: "user",
    action: "api_key.created",
    resource: key.prefix,
    details: name,
  });

  return key;
}

export function revokeCommercialApiKey(keyId: string): void {
  const keys = readKeys();
  const key = keys.find((k) => k.id === keyId);
  writeKeys(keys.map((k) => (k.id === keyId ? { ...k, status: "revoked" as const } : k)));

  if (key) {
    appendCommercialAudit({
      orgId: key.orgId,
      actor: "user",
      action: "api_key.revoked",
      resource: key.prefix,
    });
  }
}
