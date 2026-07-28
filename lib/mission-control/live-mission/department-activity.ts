/** CEO, Research, CTO, CMO, CFO, Legal activity snapshots. */

import type { DepartmentActivity, DepartmentId } from "./types";
import type { Mission } from "../types";

const DEPARTMENTS: DepartmentId[] = ["CEO", "Research", "CTO", "CMO", "CFO", "Legal"];

function defaultActivity(dept: DepartmentId): DepartmentActivity {
  return { department: dept, status: "idle", label: "En espera" };
}

export function createDefaultDepartmentActivity(): DepartmentActivity[] {
  return DEPARTMENTS.map(defaultActivity);
}

export function updateDepartment(
  activity: DepartmentActivity[],
  department: DepartmentId,
  status: DepartmentActivity["status"],
  label: string,
  lastAction?: string
): DepartmentActivity[] {
  return activity.map((a) =>
    a.department === department ? { ...a, status, label, lastAction } : a
  );
}

export function syncDepartmentActivityFromMission(
  activity: DepartmentActivity[],
  mission: Mission
): DepartmentActivity[] {
  let updated = [...activity];

  updated = updateDepartment(
    updated,
    "CEO",
    mission.liveExecution.active ? "active" : mission.phase === "UNDERSTAND" ? "waiting" : "done",
    mission.status.ceoStatus,
    mission.messages.at(-1)?.content.slice(0, 40)
  );

  const researchSnap = mission.snapshots.find((s) => s.id === "research");
  if (researchSnap && researchSnap.progress > 0) {
    updated = updateDepartment(
      updated,
      "Research",
      researchSnap.status === "completed" ? "done" : "active",
      `Research ${researchSnap.progress}%`,
      researchSnap.summary
    );
  }

  const archSnap = mission.snapshots.find((s) => s.id === "architecture");
  if (archSnap && archSnap.progress > 0) {
    updated = updateDepartment(
      updated,
      "CTO",
      archSnap.status === "completed" ? "done" : "active",
      `Arquitectura ${archSnap.progress}%`
    );
  }

  const mktSnap = mission.snapshots.find((s) => s.id === "marketing");
  if (mktSnap && mktSnap.progress > 0) {
    updated = updateDepartment(
      updated,
      "CMO",
      mktSnap.status === "completed" ? "done" : "active",
      `Marketing ${mktSnap.progress}%`
    );
  }

  const finSnap = mission.snapshots.find((s) => s.id === "financials");
  if (finSnap && finSnap.progress > 0) {
    updated = updateDepartment(
      updated,
      "CFO",
      finSnap.status === "completed" ? "done" : "active",
      `Finanzas ${finSnap.progress}%`
    );
  }

  if (mission.status.risks.length > 0) {
    updated = updateDepartment(
      updated,
      "Legal",
      "waiting",
      `${mission.status.risks.length} riesgo(s) detectado(s)`,
      mission.status.risks[0]
    );
  }

  return updated;
}
