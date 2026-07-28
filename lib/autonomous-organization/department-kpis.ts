/** ForgeOS RC6.5 — department KPIs. */

import type { DepartmentId, DepartmentKpi } from "./types";

const KPIS: DepartmentKpi[] = [
  { id: "kpi-research", departmentId: "research", label: "Oportunidades detectadas", value: 7, unit: "nuevas", trend: "up", target: 5 },
  { id: "kpi-qa", departmentId: "qa", label: "Riesgos abiertos", value: 3, unit: "críticos", trend: "down", target: 0 },
  { id: "kpi-marketing", departmentId: "marketing", label: "Campañas activas", value: 2, unit: "live", trend: "stable", target: 2 },
  { id: "kpi-build", departmentId: "build", label: "Builds preview", value: 4, unit: "semana", trend: "up", target: 3 },
  { id: "kpi-product", departmentId: "product", label: "PRDs en curso", value: 2, unit: "docs", trend: "up", target: 2 },
  { id: "kpi-ceo", departmentId: "ceo", label: "Decisiones pendientes", value: 1, unit: "briefing", trend: "stable", target: 0 },
];

export function getDepartmentKpis(departmentId?: DepartmentId): DepartmentKpi[] {
  if (!departmentId) return KPIS;
  return KPIS.filter((k) => k.departmentId === departmentId);
}
