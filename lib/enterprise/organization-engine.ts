/** ForgeOS RC11 — Enterprise tenant organization engine. */

import { appendAuditEntry } from "./audit-log";
import { getActiveOrgId, readEnterpriseState, setActiveOrgId, uid, updateEnterpriseState } from "./state";
import type { BillingPlan, EnterpriseOrganization } from "./types";

export function listOrganizations(): EnterpriseOrganization[] {
  return readEnterpriseState().organizations;
}

export function getOrganization(orgId: string): EnterpriseOrganization | undefined {
  return readEnterpriseState().organizations.find((o) => o.id === orgId);
}

export function getActiveOrganization(): EnterpriseOrganization | undefined {
  const orgId = getActiveOrgId();
  return orgId ? getOrganization(orgId) : readEnterpriseState().organizations[0];
}

export function createOrganization(
  name: string,
  plan: BillingPlan = "free",
  actorEmail = "admin@demo.forgeos"
): EnterpriseOrganization {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const now = new Date().toISOString();

  const org: EnterpriseOrganization = {
    id: uid("org"),
    name,
    slug: slug || "org",
    plan,
    createdAt: now,
    updatedAt: now,
    settings: { ssoEnabled: false, scimEnabled: false, mfaRequired: false },
  };

  updateEnterpriseState((s) => ({
    ...s,
    organizations: [...s.organizations, org],
    activeOrgId: org.id,
  }));

  appendAuditEntry({
    orgId: org.id,
    actorId: "system",
    actorEmail,
    action: "org.created",
    resource: org.slug,
    details: `Organización "${name}" creada con plan ${plan}`,
  });

  return org;
}

export function updateOrganization(
  orgId: string,
  patch: Partial<Pick<EnterpriseOrganization, "name" | "plan" | "settings">>,
  actorEmail = "admin@demo.forgeos"
): EnterpriseOrganization | undefined {
  let updated: EnterpriseOrganization | undefined;

  updateEnterpriseState((s) => ({
    ...s,
    organizations: s.organizations.map((o) => {
      if (o.id !== orgId) return o;
      updated = { ...o, ...patch, updatedAt: new Date().toISOString() };
      return updated;
    }),
  }));

  if (updated) {
    appendAuditEntry({
      orgId,
      actorId: "system",
      actorEmail,
      action: "org.updated",
      resource: updated.slug,
      details: JSON.stringify(patch),
    });
  }

  return updated;
}

export function selectOrganization(orgId: string): void {
  if (getOrganization(orgId)) setActiveOrgId(orgId);
}
