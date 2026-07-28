/** Program 2035 — Code health metrics. */

export interface CodeHealthMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  status: "good" | "warning" | "critical";
}

export function assessCodeHealth(): CodeHealthMetric[] {
  return [
    { id: "ch-dup", label: "Código duplicado", value: 3.2, unit: "%", status: "warning" },
    { id: "ch-dead", label: "Imports muertos", value: 12, unit: "count", status: "warning" },
    { id: "ch-todo", label: "TODO/FIXME", value: 47, unit: "count", status: "warning" },
    { id: "ch-coverage", label: "Cobertura tests", value: 68, unit: "%", status: "good" },
    { id: "ch-complex", label: "Complejidad ciclomática avg", value: 8.4, unit: "", status: "good" },
  ];
}

export function getCodeHealthScore(metrics: CodeHealthMetric[]): number {
  const warnings = metrics.filter((m) => m.status === "warning").length;
  const critical = metrics.filter((m) => m.status === "critical").length;
  return Math.max(0, 100 - warnings * 8 - critical * 20);
}
