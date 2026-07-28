/** ForgeOS RC6.5 — Autonomous Executive Organization. */

export type * from "./types";

export {
  buildExecutiveDailyBriefing,
  buildOrganizationSnapshot,
  respondToBriefing,
  getFounderName,
} from "./organization-engine";

export { getDepartmentObjectives } from "./department-objectives";
export { getDepartmentKpis } from "./department-kpis";
export { getDepartmentWorkload, getAvailableCapacity } from "./department-runtime";
export { getActiveInitiatives } from "./initiative-engine";
export { getWeeklyBoardMeeting } from "./meeting-engine";
export { getExecutiveCalendar } from "./executive-calendar";
export { getExecutiveInbox } from "./executive-inbox";
export { getExecutiveNotifications } from "./executive-notifications";
export { coordinateDepartments, getAutoDelegationPlan, applyAutoDelegations } from "./cross-department-coordinator";
export { readOrganizationMemory, recordBriefingDecision, recordDelegation } from "./organization-memory";
export { computeOrganizationHealth } from "./organization-health";
export { planExecutivePriorities } from "./priority-planner";
export { detectRisks } from "./risk-monitor";
