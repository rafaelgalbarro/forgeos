/** ForgeOS RC11 — SSO engine (stub / ready). */

import { appendAuditEntry } from "./audit-log";
import { getActiveOrganization, updateOrganization } from "./organization-engine";
import type { EnterpriseOrganization } from "./types";

export interface SsoConfig {
  provider: "okta" | "azure-ad" | "google" | "saml";
  domain: string;
  enabled: boolean;
  status: "not_configured" | "ready" | "active";
  metadataUrl?: string;
}

const DEMO_SSO: SsoConfig = {
  provider: "saml",
  domain: "",
  enabled: false,
  status: "not_configured",
};

export function getSsoConfig(org?: EnterpriseOrganization): SsoConfig {
  const o = org ?? getActiveOrganization();
  if (!o) return DEMO_SSO;
  return {
    ...DEMO_SSO,
    domain: `${o.slug}.forgeos.app`,
    enabled: o.settings.ssoEnabled,
    status: o.settings.ssoEnabled ? "ready" : "not_configured",
    metadataUrl: o.settings.ssoEnabled
      ? `https://sso.forgeos.app/metadata/${o.slug}`
      : undefined,
  };
}

/** Demo: marca SSO como listo sin proveedor real. */
export function configureSsoStub(actorEmail = "admin@demo.forgeos"): SsoConfig {
  const org = getActiveOrganization();
  if (!org) throw new Error("No hay organización activa");

  updateOrganization(org.id, {
    settings: { ...org.settings, ssoEnabled: true },
  }, actorEmail);

  appendAuditEntry({
    orgId: org.id,
    actorId: "system",
    actorEmail,
    action: "sso.configured",
    resource: org.slug,
    details: "SSO configurado (demo stub)",
  });

  return getSsoConfig();
}

export const SSO_PROVIDERS = [
  { id: "okta", label: "Okta" },
  { id: "azure-ad", label: "Azure AD" },
  { id: "google", label: "Google Workspace" },
  { id: "saml", label: "SAML 2.0 genérico" },
] as const;
