/** ForgeOS RC11 — SCIM provisioning engine (stub / ready). */

import { appendAuditEntry } from "./audit-log";
import { getActiveOrganization, updateOrganization } from "./organization-engine";
import type { EnterpriseOrganization } from "./types";

export interface ScimConfig {
  enabled: boolean;
  status: "not_configured" | "ready" | "active";
  endpoint?: string;
  bearerTokenPreview?: string;
}

export function getScimConfig(org?: EnterpriseOrganization): ScimConfig {
  const o = org ?? getActiveOrganization();
  if (!o) return { enabled: false, status: "not_configured" };
  return {
    enabled: o.settings.scimEnabled,
    status: o.settings.scimEnabled ? "ready" : "not_configured",
    endpoint: o.settings.scimEnabled
      ? `https://api.forgeos.app/scim/v2/${o.slug}`
      : undefined,
    bearerTokenPreview: o.settings.scimEnabled ? "fgs_scim_••••••••" : undefined,
  };
}

/** Demo: habilita SCIM sin proveedor real. */
export function enableScimStub(actorEmail = "admin@demo.forgeos"): ScimConfig {
  const org = getActiveOrganization();
  if (!org) throw new Error("No hay organización activa");

  updateOrganization(org.id, {
    settings: { ...org.settings, scimEnabled: true },
  }, actorEmail);

  appendAuditEntry({
    orgId: org.id,
    actorId: "system",
    actorEmail,
    action: "scim.enabled",
    resource: org.slug,
    details: "SCIM habilitado (demo stub)",
  });

  return getScimConfig();
}
