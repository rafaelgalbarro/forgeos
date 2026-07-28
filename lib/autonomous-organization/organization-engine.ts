/** ForgeOS RC6.5 — autonomous organization engine. */

import { coordinateDepartments } from "./cross-department-coordinator";
import { getDepartmentKpis } from "./department-kpis";
import { getDepartmentObjectives } from "./department-objectives";
import { getDepartmentWorkload } from "./department-runtime";
import { getExecutiveCalendar } from "./executive-calendar";
import { getExecutiveInbox } from "./executive-inbox";
import { getExecutiveNotifications } from "./executive-notifications";
import { getActiveInitiatives } from "./initiative-engine";
import { getWeeklyBoardMeeting } from "./meeting-engine";
import { computeOrganizationHealth } from "./organization-health";
import { readOrganizationMemory, recordBriefingDecision } from "./organization-memory";
import { planExecutivePriorities } from "./priority-planner";
import { detectRisks } from "./risk-monitor";
import type {
  BriefingDecision,
  ExecutiveDailyBriefing,
  OrganizationSnapshot,
  OvernightInsight,
} from "./types";

const DEFAULT_FOUNDER = "Rafael";

export function getFounderName(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_FOUNDER_NAME) {
    return process.env.NEXT_PUBLIC_FOUNDER_NAME;
  }
  return DEFAULT_FOUNDER;
}

function buildOvernightInsights(): OvernightInsight[] {
  const now = Date.now();
  return [
    {
      id: "night-research",
      departmentId: "research",
      message: "Research encontró nuevas oportunidades.",
      timestamp: new Date(now - 7 * 3600_000).toISOString(),
    },
    {
      id: "night-qa",
      departmentId: "qa",
      message: "QA detectó riesgos.",
      timestamp: new Date(now - 6 * 3600_000).toISOString(),
    },
    {
      id: "night-marketing",
      departmentId: "marketing",
      message: "Marketing terminó una campaña.",
      timestamp: new Date(now - 5 * 3600_000).toISOString(),
    },
    {
      id: "night-build",
      departmentId: "build",
      message: "Build recomienda avanzar a RC7.",
      timestamp: new Date(now - 4 * 3600_000).toISOString(),
    },
  ];
}

export function buildExecutiveDailyBriefing(founderName?: string): ExecutiveDailyBriefing {
  const name = founderName ?? getFounderName();
  const health = computeOrganizationHealth();
  const mem = readOrganizationMemory();
  const priorities = planExecutivePriorities();

  return {
    id: `briefing-${new Date().toISOString().slice(0, 10)}`,
    founderName: name,
    generatedAt: new Date().toISOString(),
    greeting: `Buenos días ${name}.`,
    overnightInsights: buildOvernightInsights(),
    priorities,
    risks: detectRisks(),
    initiatives: getActiveInitiatives(),
    workload: getDepartmentWorkload(),
    healthScore: health.score,
    decision: mem.briefingDecision,
    recommendation: "CEO propone tres prioridades.",
  };
}

export function buildOrganizationSnapshot(founderName?: string): OrganizationSnapshot {
  const health = computeOrganizationHealth();
  coordinateDepartments();

  return {
    briefing: buildExecutiveDailyBriefing(founderName),
    boardMeeting: getWeeklyBoardMeeting(),
    objectives: getDepartmentObjectives(),
    kpis: getDepartmentKpis(),
    inbox: getExecutiveInbox(),
    notifications: getExecutiveNotifications(),
    calendar: getExecutiveCalendar(),
    healthScore: health.score,
    healthFactors: health.factors,
  };
}

export function respondToBriefing(
  briefingId: string,
  decision: BriefingDecision
): ExecutiveDailyBriefing {
  const priorities = planExecutivePriorities().map((p) => p.id);
  recordBriefingDecision(
    briefingId,
    decision,
    decision === "accepted" ? priorities : undefined
  );
  return buildExecutiveDailyBriefing();
}
