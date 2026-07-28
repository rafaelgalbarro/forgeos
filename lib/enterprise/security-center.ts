/** ForgeOS RC11 — Security Center (demo posture). */

import { listAuditEntries } from "./audit-log";
import { getActiveOrganization, getOrganization, updateOrganization } from "./organization-engine";
import { listApiKeys } from "./api-keys";
import { getScimConfig } from "./scim-engine";
import { getSsoConfig } from "./sso-engine";
import { listWebhooks } from "./webhooks";
import type { SecurityPosture } from "./types";

export function getSecurityPosture(orgId?: string): SecurityPosture {
  const org = orgId ? getOrganization(orgId) : getActiveOrganization();

  if (!org) {
    return {
      mfaEnabled: false,
      ssoReady: false,
      scimReady: false,
      apiKeyCount: 0,
      webhookCount: 0,
      score: 0,
    };
  }

  const sso = getSsoConfig(org);
  const scim = getScimConfig(org);
  const apiKeys = listApiKeys(org.id);
  const webhooks = listWebhooks(org.id);
  const audits = listAuditEntries(org.id, 1);

  let score = 30;
  if (org.settings.mfaRequired) score += 15;
  if (sso.enabled) score += 20;
  if (scim.enabled) score += 15;
  if (apiKeys.length > 0) score += 10;
  if (audits.length > 0) score += 10;

  return {
    mfaEnabled: org.settings.mfaRequired,
    ssoReady: sso.enabled,
    scimReady: scim.enabled,
    apiKeyCount: apiKeys.filter((k) => k.status === "active").length,
    webhookCount: webhooks.filter((w) => w.status === "active").length,
    lastAuditAt: audits[0]?.timestamp,
    score: Math.min(score, 100),
  };
}

export function enableMfaStub(): SecurityPosture {
  const org = getActiveOrganization();
  if (!org) return getSecurityPosture();

  updateOrganization(org.id, {
    settings: { ...org.settings, mfaRequired: true },
  });

  return getSecurityPosture(org.id);
}
