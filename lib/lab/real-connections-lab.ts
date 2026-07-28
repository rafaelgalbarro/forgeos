/** ForgeOS Real Connections Lab — RC5. */

import {
  getConnectionsOverview,
  getConnectionsHealth,
  listConnectedCapabilities,
  generateDryRunPlan,
  testConnection,
} from "@/lib/connections";
import { runCapabilityRequest } from "@/lib/capabilities";
import { processApproval } from "@/lib/skills-governance/approval-engine";
import { assessSkillRisk } from "@/lib/skills-governance/risk-engine";
import type { ConnectionProvider, ConnectionResult } from "@/lib/connections/shared/types";
import type { CapabilityResult } from "@/lib/capabilities/types";

export interface RealConnectionsLabSnapshot {
  overview: ReturnType<typeof getConnectionsOverview>;
  health: Awaited<ReturnType<typeof getConnectionsHealth>>;
  capabilities: ReturnType<typeof listConnectedCapabilities>;
  sampleDryRun: ConnectionResult | null;
  sampleApproval: {
    risk: ReturnType<typeof assessSkillRisk>;
    approval: ReturnType<typeof processApproval>;
  };
  sampleCapability: CapabilityResult | null;
}

export async function runRealConnectionsLab(
  ventureId = "demo-venture-vandl"
): Promise<RealConnectionsLabSnapshot> {
  const overview = getConnectionsOverview(ventureId);
  const health = await getConnectionsHealth();
  const capabilities = listConnectedCapabilities();

  let sampleDryRun: ConnectionResult | null = null;
  try {
    sampleDryRun = await generateDryRunPlan("github", "create_repository", ventureId, "cto", {
      name: "forgeos-demo-repo",
    });
  } catch {
    sampleDryRun = null;
  }

  const risk = assessSkillRisk("github", "create_repository");
  const approval = processApproval({
    skillId: "github",
    ventureId,
    requestedBy: "cto",
    action: "create_repository",
    riskLevel: risk.level,
    preApprovedBy: "ceo",
  });

  let sampleCapability: CapabilityResult | null = null;
  try {
    sampleCapability = await runCapabilityRequest({
      capabilityId: "create_repository",
      context: {
        ventureId,
        requestedBy: "cto",
        approvedBy: "ceo",
        action: "create_repo",
        payload: { name: "forgeos-rc5-demo" },
      },
    });
  } catch {
    sampleCapability = null;
  }

  return {
    overview,
    health,
    capabilities,
    sampleDryRun,
    sampleApproval: { risk, approval },
    sampleCapability,
  };
}

export async function labTestConnection(provider: ConnectionProvider, ventureId: string) {
  return testConnection(provider, ventureId, "cto");
}

export async function labDryRun(
  provider: ConnectionProvider,
  operation: string,
  ventureId: string,
  payload?: Record<string, unknown>
) {
  return generateDryRunPlan(provider, operation, ventureId, "cto", payload);
}

export async function labRequestApproval(
  provider: ConnectionProvider,
  operation: string,
  ventureId: string
) {
  const skillId = provider;
  const risk = assessSkillRisk(skillId, operation);
  const approval = processApproval({
    skillId,
    ventureId,
    requestedBy: "cto",
    action: operation,
    riskLevel: risk.level,
    preApprovedBy: "ceo",
  });
  return { risk, approval };
}

export async function labSimulateExecution(
  provider: ConnectionProvider,
  operation: string,
  ventureId: string,
  payload?: Record<string, unknown>
) {
  return generateDryRunPlan(provider, operation, ventureId, "cto", {
    ...payload,
    simulated: true,
  });
}
