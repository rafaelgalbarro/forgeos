/** ForgeOS RC11 — Enterprise user engine. */

import { appendAuditEntry } from "./audit-log";
import { getActiveOrganization } from "./organization-engine";
import { readEnterpriseState, uid, updateEnterpriseState } from "./state";
import type { EnterpriseRole, EnterpriseUser } from "./types";

export function listUsers(orgId?: string): EnterpriseUser[] {
  const id = orgId ?? getActiveOrganization()?.id;
  if (!id) return [];
  return readEnterpriseState().users.filter((u) => u.orgId === id);
}

export function getUser(userId: string): EnterpriseUser | undefined {
  return readEnterpriseState().users.find((u) => u.id === userId);
}

export function inviteUser(
  email: string,
  name: string,
  role: EnterpriseRole,
  orgId?: string,
  actorEmail = "admin@demo.forgeos"
): EnterpriseUser {
  const oid = orgId ?? getActiveOrganization()?.id;
  if (!oid) throw new Error("No hay organización activa");

  const user: EnterpriseUser = {
    id: uid("usr"),
    orgId: oid,
    email,
    name,
    role,
    teamIds: [],
    status: "active",
    createdAt: new Date().toISOString(),
  };

  updateEnterpriseState((s) => ({ ...s, users: [...s.users, user] }));

  appendAuditEntry({
    orgId: oid,
    actorId: "system",
    actorEmail,
    action: "user.invited",
    resource: email,
    details: `Rol asignado: ${role}`,
  });

  return user;
}

export function assignUserRole(
  userId: string,
  role: EnterpriseRole,
  actorEmail = "admin@demo.forgeos"
): EnterpriseUser | undefined {
  let updated: EnterpriseUser | undefined;

  updateEnterpriseState((s) => ({
    ...s,
    users: s.users.map((u) => {
      if (u.id !== userId) return u;
      updated = { ...u, role };
      return updated;
    }),
  }));

  if (updated) {
    appendAuditEntry({
      orgId: updated.orgId,
      actorId: "system",
      actorEmail,
      action: "user.role_changed",
      resource: updated.email,
      details: `Nuevo rol: ${role}`,
    });
  }

  return updated;
}

export function addUserToTeam(userId: string, teamId: string): EnterpriseUser | undefined {
  let updated: EnterpriseUser | undefined;

  updateEnterpriseState((s) => ({
    ...s,
    users: s.users.map((u) => {
      if (u.id !== userId) return u;
      const teamIds = u.teamIds.includes(teamId) ? u.teamIds : [...u.teamIds, teamId];
      updated = { ...u, teamIds };
      return updated;
    }),
  }));

  return updated;
}
