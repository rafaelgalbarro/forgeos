/** ForgeOS RC6.5 — Autonomous Organization lab harness. */

import {
  applyAutoDelegations,
  buildOrganizationSnapshot,
  coordinateDepartments,
  detectRisks,
  getAutoDelegationPlan,
  getDepartmentObjectives,
  getDepartmentKpis,
} from "@/lib/autonomous-organization";

export interface AutonomousOrganizationLabResult {
  healthScore: number;
  departmentCount: number;
  delegationCount: number;
  riskCount: number;
  modulesChecked: string[];
  summary: Record<string, unknown>;
  error?: string;
}

export async function runAutonomousOrganizationLab(): Promise<AutonomousOrganizationLabResult> {
  try {
    const snapshot = buildOrganizationSnapshot();
    const coordination = coordinateDepartments();
    const delegations = applyAutoDelegations();

    return {
      healthScore: snapshot.healthScore,
      departmentCount: snapshot.briefing.workload.length,
      delegationCount: delegations.length,
      riskCount: detectRisks().length,
      modulesChecked: [
        "organization-engine",
        "department-runtime",
        "department-objectives",
        "department-kpis",
        "initiative-engine",
        "meeting-engine",
        "executive-calendar",
        "executive-inbox",
        "executive-notifications",
        "cross-department-coordinator",
        "organization-memory",
        "organization-health",
        "priority-planner",
        "risk-monitor",
      ],
      summary: {
        briefingId: snapshot.briefing.id,
        greeting: snapshot.briefing.greeting,
        priorities: snapshot.briefing.priorities.length,
        objectives: getDepartmentObjectives().length,
        kpis: getDepartmentKpis().length,
        boardMeeting: snapshot.boardMeeting.scheduledAt,
        delegations: coordination.delegations.map((d) => `${d.from}→${d.to}`),
        healthFactors: snapshot.healthFactors,
      },
    };
  } catch (err) {
    return {
      healthScore: 0,
      departmentCount: 0,
      delegationCount: 0,
      riskCount: 0,
      modulesChecked: [],
      summary: {},
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
