/** ForgeOS RC11 — Enterprise demo flow orchestrator. */

import { getActiveOrganization, createOrganization } from "./organization-engine";
import { createTeam } from "./team-engine";
import { inviteUser, addUserToTeam, assignUserRole } from "./user-engine";
import { buildUsageMetrics } from "./usage-engine";
import { getBillingSummary } from "./billing-engine";
import { listAuditEntries } from "./audit-log";
import { buildPermissionMatrix } from "./permissions-engine";
import { writeStorage } from "@/lib/intelligence-layer/memory/storage";
import { STORAGE_KEYS } from "@/lib/intelligence-layer/memory/types";
import { readEnterpriseState, resetEnterpriseState } from "./state";
import type { EnterpriseOrganization, EnterpriseRole } from "./types";

export type DemoStep =
  | "org"
  | "team"
  | "roles"
  | "permissions"
  | "usage"
  | "billing"
  | "audit";

export const DEMO_STEPS: { id: DemoStep; label: string; description: string }[] = [
  { id: "org", label: "1. Organización", description: "Crear organización demo" },
  { id: "team", label: "2. Equipo", description: "Crear equipo de producto" },
  { id: "roles", label: "3. Roles", description: "Asignar roles a usuarios" },
  { id: "permissions", label: "4. Permisos", description: "Ver matriz RBAC" },
  { id: "usage", label: "5. Uso", description: "Ver métricas de consumo" },
  { id: "billing", label: "6. Facturación", description: "Ver plan y facturación" },
  { id: "audit", label: "7. Auditoría", description: "Ver registro de auditoría" },
];

export interface DemoFlowState {
  step: DemoStep;
  org?: EnterpriseOrganization;
  hasTeam: boolean;
  userCount: number;
  permissionsReady: boolean;
  usageReady: boolean;
  billingReady: boolean;
  auditCount: number;
}

export function getDemoFlowState(): DemoFlowState {
  const org = getActiveOrganization();
  const state = readEnterpriseState();
  const teams = org ? state.teams.filter((t) => t.orgId === org.id) : [];
  const users = org ? state.users.filter((u) => u.orgId === org.id) : [];

  return {
    step: inferCurrentStep(org, teams.length > 0, users.length),
    org,
    hasTeam: teams.length > 0,
    userCount: users.length,
    permissionsReady: !!org,
    usageReady: !!org,
    billingReady: !!org,
    auditCount: org ? listAuditEntries(org.id).length : 0,
  };
}

function inferCurrentStep(
  org: EnterpriseOrganization | undefined,
  hasTeam: boolean,
  userCount: number
): DemoStep {
  if (!org) return "org";
  if (!hasTeam) return "team";
  if (userCount < 2) return "roles";
  return "audit";
}

/** Ejecuta el paso demo completo de principio a fin. */
export function runFullDemoFlow(): DemoFlowState {
  let org = getActiveOrganization();
  if (!org) {
    org = createOrganization("Acme Ventures Demo", "pro");
  }

  const state = readEnterpriseState();
  let teams = state.teams.filter((t) => t.orgId === org!.id);
  if (teams.length === 0) {
    const team = createTeam("Producto", "Equipo de producto y ventures", org.id);
    teams = [team];
  }

  let users = state.users.filter((u) => u.orgId === org!.id);
  if (users.length === 0) {
    const owner = inviteUser("ceo@acme.demo", "CEO Demo", "owner", org.id);
    const admin = inviteUser("admin@acme.demo", "Admin Demo", "admin", org.id);
    const member = inviteUser("dev@acme.demo", "Developer Demo", "member", org.id);
    users = [owner, admin, member];
    addUserToTeam(teams[0].id, member.id);
    assignUserRole(admin.id, "admin");
  }

  buildUsageMetrics(org.id);
  getBillingSummary(org.id);
  buildPermissionMatrix();

  return getDemoFlowState();
}

export function resetDemoFlow(): void {
  resetEnterpriseState();
  writeStorage(STORAGE_KEYS.enterpriseAudit, []);
  writeStorage(STORAGE_KEYS.enterpriseUsage, {});
}

export const DEMO_ROLES: { email: string; name: string; role: EnterpriseRole }[] = [
  { email: "ceo@acme.demo", name: "CEO Demo", role: "owner" },
  { email: "admin@acme.demo", name: "Admin Demo", role: "admin" },
  { email: "dev@acme.demo", name: "Developer Demo", role: "member" },
];
