/** ForgeOS RC6.5 — department runtime (workload & capacity). */

import type { DepartmentId, DepartmentWorkload } from "./types";

const WORKLOAD: DepartmentWorkload[] = [
  { departmentId: "research", label: "Research", loadPercent: 68, capacityPercent: 85, activeTasks: 4 },
  { departmentId: "product", label: "Product", loadPercent: 72, capacityPercent: 80, activeTasks: 3 },
  { departmentId: "marketing", label: "Marketing", loadPercent: 55, capacityPercent: 90, activeTasks: 2 },
  { departmentId: "qa", label: "QA", loadPercent: 78, capacityPercent: 75, activeTasks: 5 },
  { departmentId: "build", label: "Build", loadPercent: 65, capacityPercent: 88, activeTasks: 4 },
  { departmentId: "architecture", label: "Architecture", loadPercent: 50, capacityPercent: 92, activeTasks: 2 },
  { departmentId: "ceo", label: "CEO Office", loadPercent: 45, capacityPercent: 95, activeTasks: 1 },
];

export function getDepartmentWorkload(departmentId?: DepartmentId): DepartmentWorkload[] {
  if (!departmentId) return WORKLOAD;
  return WORKLOAD.filter((w) => w.departmentId === departmentId);
}

export function getAvailableCapacity(): { departmentId: DepartmentId; availablePercent: number }[] {
  return WORKLOAD.map((w) => ({
    departmentId: w.departmentId,
    availablePercent: Math.max(0, w.capacityPercent - w.loadPercent),
  }));
}
