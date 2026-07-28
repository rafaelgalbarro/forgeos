/** ForgeOS RC11 — Enterprise team engine. */

import { appendAuditEntry } from "./audit-log";
import { getActiveOrganization } from "./organization-engine";
import { readEnterpriseState, uid, updateEnterpriseState } from "./state";
import type { EnterpriseTeam } from "./types";

export function listTeams(orgId?: string): EnterpriseTeam[] {
  const id = orgId ?? getActiveOrganization()?.id;
  if (!id) return [];
  return readEnterpriseState().teams.filter((t) => t.orgId === id);
}

export function getTeam(teamId: string): EnterpriseTeam | undefined {
  return readEnterpriseState().teams.find((t) => t.id === teamId);
}

export function createTeam(
  name: string,
  description?: string,
  orgId?: string,
  actorEmail = "admin@demo.forgeos"
): EnterpriseTeam {
  const oid = orgId ?? getActiveOrganization()?.id;
  if (!oid) throw new Error("No hay organización activa");

  const team: EnterpriseTeam = {
    id: uid("team"),
    orgId: oid,
    name,
    description,
    memberIds: [],
    createdAt: new Date().toISOString(),
  };

  updateEnterpriseState((s) => ({ ...s, teams: [...s.teams, team] }));

  appendAuditEntry({
    orgId: oid,
    actorId: "system",
    actorEmail,
    action: "team.created",
    resource: team.name,
    details: description,
  });

  return team;
}

export function addTeamMember(
  teamId: string,
  userId: string,
  actorEmail = "admin@demo.forgeos"
): EnterpriseTeam | undefined {
  let updated: EnterpriseTeam | undefined;

  updateEnterpriseState((s) => ({
    ...s,
    teams: s.teams.map((t) => {
      if (t.id !== teamId) return t;
      const memberIds = t.memberIds.includes(userId) ? t.memberIds : [...t.memberIds, userId];
      updated = { ...t, memberIds };
      return updated;
    }),
  }));

  if (updated) {
    appendAuditEntry({
      orgId: updated.orgId,
      actorId: "system",
      actorEmail,
      action: "team.updated",
      resource: updated.name,
      details: `Miembro añadido: ${userId}`,
    });
  }

  return updated;
}
