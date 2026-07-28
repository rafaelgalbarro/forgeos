/** RC10 — Per-organization consent engine for network contributions. */

import type { ConsentScope, ConsentStatus, OrgConsentRecord } from "./types";
import { CONSENT_REQUIRED_MESSAGE } from "./types";

const DEFAULT_SCOPES: Record<ConsentScope, ConsentStatus> = {
  benchmarks: "pending",
  signals: "pending",
  "best-practices": "pending",
  trends: "pending",
  opportunities: "pending",
};

const consentStore = new Map<string, OrgConsentRecord>();

export function getOrgConsent(organizationId: string): OrgConsentRecord {
  const existing = consentStore.get(organizationId);
  if (existing) return existing;

  const record: OrgConsentRecord = {
    organizationId,
    scopes: { ...DEFAULT_SCOPES },
    updatedAt: new Date().toISOString(),
  };
  consentStore.set(organizationId, record);
  return record;
}

export function setConsentScope(
  organizationId: string,
  scope: ConsentScope,
  status: ConsentStatus
): OrgConsentRecord {
  const record = getOrgConsent(organizationId);
  const now = new Date().toISOString();

  record.scopes[scope] = status;
  record.updatedAt = now;

  if (status === "granted") {
    record.grantedAt = now;
    record.revokedAt = undefined;
  } else if (status === "denied") {
    record.revokedAt = now;
  }

  consentStore.set(organizationId, record);
  return record;
}

export function grantAllConsent(organizationId: string): OrgConsentRecord {
  const record = getOrgConsent(organizationId);
  const now = new Date().toISOString();

  for (const scope of Object.keys(record.scopes) as ConsentScope[]) {
    record.scopes[scope] = "granted";
  }
  record.grantedAt = now;
  record.revokedAt = undefined;
  record.updatedAt = now;

  consentStore.set(organizationId, record);
  return record;
}

export function revokeAllConsent(organizationId: string): OrgConsentRecord {
  const record = getOrgConsent(organizationId);
  const now = new Date().toISOString();

  for (const scope of Object.keys(record.scopes) as ConsentScope[]) {
    record.scopes[scope] = "denied";
  }
  record.revokedAt = now;
  record.updatedAt = now;

  consentStore.set(organizationId, record);
  return record;
}

export function canContributeToNetwork(
  organizationId: string,
  scope?: ConsentScope
): boolean {
  const record = getOrgConsent(organizationId);

  if (scope) {
    return record.scopes[scope] === "granted";
  }

  return Object.values(record.scopes).some((s) => s === "granted");
}

export function assertContributionConsent(
  organizationId: string,
  scope: ConsentScope
): { allowed: boolean; message?: string } {
  if (!canContributeToNetwork(organizationId, scope)) {
    return { allowed: false, message: CONSENT_REQUIRED_MESSAGE };
  }
  return { allowed: true };
}

export function listConsentScopes(): ConsentScope[] {
  return Object.keys(DEFAULT_SCOPES) as ConsentScope[];
}
