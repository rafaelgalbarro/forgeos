/** Department activity hints via Executive Mesh public adapter (summary only). */

import type { DepartmentActivity, DepartmentId } from "../types";
import type { Mission } from "../../types";

export interface MeshActivityHints {
  departments: DepartmentId[];
  summary: string;
  confidence: number;
}

export async function getExecutiveMeshHints(mission: Mission): Promise<MeshActivityHints> {
  try {
    const { getExecutiveCouncilSnapshot } = await import("../../adapters/executive-mesh-adapter");
    const council = getExecutiveCouncilSnapshot(mission);
    return {
      departments: council.departments as DepartmentId[],
      summary: council.summary,
      confidence: council.confidence,
    };
  } catch {
    return {
      departments: ["CEO", "CTO", "CMO", "CFO", "Legal"],
      summary: "Consejo ejecutivo en standby",
      confidence: mission.status.confidence,
    };
  }
}

export function applyMeshHintsToActivity(
  activity: DepartmentActivity[],
  hints: MeshActivityHints
): DepartmentActivity[] {
  return activity.map((a) => {
    if (hints.departments.includes(a.department) && a.status === "idle") {
      return { ...a, status: "waiting", label: hints.summary.slice(0, 50) };
    }
    return a;
  });
}
