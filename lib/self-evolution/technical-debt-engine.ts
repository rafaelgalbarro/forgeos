/** Program 2035 — Technical debt detection heuristics. */

import type { AffectedArea } from "./types";

export interface DebtItem {
  id: string;
  title: string;
  area: AffectedArea;
  severity: "low" | "medium" | "high";
  estimatedHours: number;
  category: "duplicate" | "dead-code" | "todo" | "legacy" | "complexity";
}

const DEBT_CATALOG: DebtItem[] = [
  {
    id: "debt-dup-kpi",
    title: "KpiBlock / MetricCard duplicados",
    area: "code-health",
    severity: "medium",
    estimatedHours: 4,
    category: "duplicate",
  },
  {
    id: "debt-dead-imports",
    title: "12 imports muertos en components/lab/",
    area: "code-health",
    severity: "low",
    estimatedHours: 2,
    category: "dead-code",
  },
  {
    id: "debt-todo-lib",
    title: "47 TODO/FIXME en lib/",
    area: "code-health",
    severity: "medium",
    estimatedHours: 16,
    category: "todo",
  },
  {
    id: "debt-rc1-lab",
    title: "Lab RC1 legacy sin mantenimiento",
    area: "runtime",
    severity: "low",
    estimatedHours: 3,
    category: "legacy",
  },
  {
    id: "debt-mesh-complex",
    title: "Executive Mesh — función > 200 líneas",
    area: "mesh",
    severity: "medium",
    estimatedHours: 8,
    category: "complexity",
  },
];

export function scanTechnicalDebt(): DebtItem[] {
  return [...DEBT_CATALOG];
}

export function getDebtScore(items: DebtItem[]): number {
  if (items.length === 0) return 100;
  const penalty = items.reduce((sum, i) => {
    const w = i.severity === "high" ? 15 : i.severity === "medium" ? 8 : 3;
    return sum + w;
  }, 0);
  return Math.max(0, 100 - penalty);
}
