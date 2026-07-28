/** ForgeOS RC6.5 — department objectives. */

import type { DepartmentId, DepartmentObjective } from "./types";

const OBJECTIVES: DepartmentObjective[] = [
  { id: "obj-research-1", departmentId: "research", title: "Mapear 3 verticales emergentes", progress: 72, dueDate: "2026-07-14", owner: "Research" },
  { id: "obj-product-1", departmentId: "product", title: "Cerrar PRD RC7 scope", progress: 45, dueDate: "2026-07-12", owner: "Product" },
  { id: "obj-marketing-1", departmentId: "marketing", title: "Lanzar campaña founder beta", progress: 88, dueDate: "2026-07-10", owner: "Marketing" },
  { id: "obj-qa-1", departmentId: "qa", title: "Auditar regresiones RC6", progress: 60, dueDate: "2026-07-11", owner: "QA" },
  { id: "obj-build-1", departmentId: "build", title: "Preparar pipeline RC7 preview", progress: 35, dueDate: "2026-07-15", owner: "Build" },
  { id: "obj-arch-1", departmentId: "architecture", title: "Diseñar mesh autónomo v2", progress: 50, dueDate: "2026-07-16", owner: "Architecture" },
  { id: "obj-growth-1", departmentId: "growth", title: "Activar loop referidos", progress: 28, dueDate: "2026-07-20", owner: "Growth" },
];

export function getDepartmentObjectives(departmentId?: DepartmentId): DepartmentObjective[] {
  if (!departmentId) return OBJECTIVES;
  return OBJECTIVES.filter((o) => o.departmentId === departmentId);
}
