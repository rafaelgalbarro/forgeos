/** Program 9000 — Consent engine with localStorage persistence. */

import {
  getOrgConsent as getBaseOrgConsent,
  setConsentScope as setBaseConsentScope,
  grantAllConsent as grantBaseAllConsent,
  revokeAllConsent as revokeBaseAllConsent,
  canContributeToNetwork as canBaseContribute,
  listConsentScopes,
} from "@/lib/network/consent-engine";
import type { ConsentScope, ConsentStatus } from "@/lib/network/types";
import { CONSENT_REQUIRED_MESSAGE } from "@/lib/network/types";
import { INTELLIGENCE_NETWORK_STORAGE_KEYS, isNetworkConsentRequired } from "./config";
import type { IntelligenceConsentRecord } from "./types";

const DEFAULT_WORKSPACE = "default-workspace";

function readStoredConsent(): Record<string, IntelligenceConsentRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(INTELLIGENCE_NETWORK_STORAGE_KEYS.consent);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, IntelligenceConsentRecord>;
  } catch {
    return {};
  }
}

function writeStoredConsent(store: Record<string, IntelligenceConsentRecord>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(INTELLIGENCE_NETWORK_STORAGE_KEYS.consent, JSON.stringify(store));
}

function consentKey(organizationId: string, workspaceId: string): string {
  return `${organizationId}::${workspaceId}`;
}

export function getWorkspaceConsent(
  organizationId: string,
  workspaceId: string = DEFAULT_WORKSPACE
): IntelligenceConsentRecord {
  const key = consentKey(organizationId, workspaceId);
  const stored = readStoredConsent()[key];
  if (stored) return stored;

  const base = getBaseOrgConsent(organizationId);
  return {
    ...base,
    workspaceId,
    consentRequired: isNetworkConsentRequired(),
    networkEnabled: false,
  };
}

export function setWorkspaceConsentScope(
  organizationId: string,
  workspaceId: string,
  scope: ConsentScope,
  status: ConsentStatus
): IntelligenceConsentRecord {
  setBaseConsentScope(organizationId, scope, status);
  const record = getWorkspaceConsent(organizationId, workspaceId);
  record.scopes[scope] = status;
  record.updatedAt = new Date().toISOString();
  record.networkEnabled = Object.values(record.scopes).some((s) => s === "granted");

  const store = readStoredConsent();
  store[consentKey(organizationId, workspaceId)] = record;
  writeStoredConsent(store);
  return record;
}

export function grantWorkspaceConsent(
  organizationId: string,
  workspaceId: string = DEFAULT_WORKSPACE
): IntelligenceConsentRecord {
  grantBaseAllConsent(organizationId);
  const record = getWorkspaceConsent(organizationId, workspaceId);
  for (const scope of listConsentScopes()) {
    record.scopes[scope] = "granted";
  }
  record.grantedAt = new Date().toISOString();
  record.revokedAt = undefined;
  record.updatedAt = record.grantedAt;
  record.networkEnabled = true;

  const store = readStoredConsent();
  store[consentKey(organizationId, workspaceId)] = record;
  writeStoredConsent(store);
  return record;
}

export function revokeWorkspaceConsent(
  organizationId: string,
  workspaceId: string = DEFAULT_WORKSPACE
): IntelligenceConsentRecord {
  revokeBaseAllConsent(organizationId);
  const record = getWorkspaceConsent(organizationId, workspaceId);
  for (const scope of listConsentScopes()) {
    record.scopes[scope] = "denied";
  }
  record.revokedAt = new Date().toISOString();
  record.updatedAt = record.revokedAt;
  record.networkEnabled = false;

  const store = readStoredConsent();
  store[consentKey(organizationId, workspaceId)] = record;
  writeStoredConsent(store);
  return record;
}

export function canContributeFromWorkspace(
  organizationId: string,
  workspaceId: string = DEFAULT_WORKSPACE,
  scope?: ConsentScope
): boolean {
  const record = getWorkspaceConsent(organizationId, workspaceId);
  if (record.consentRequired && !record.networkEnabled) {
    return false;
  }
  if (scope) {
    return record.scopes[scope] === "granted";
  }
  return canBaseContribute(organizationId) && record.networkEnabled;
}

export function assertWorkspaceContributionConsent(
  organizationId: string,
  workspaceId: string,
  scope: ConsentScope
): { allowed: boolean; message?: string } {
  if (!canContributeFromWorkspace(organizationId, workspaceId, scope)) {
    return { allowed: false, message: CONSENT_REQUIRED_MESSAGE };
  }
  return { allowed: true };
}

export { listConsentScopes };
