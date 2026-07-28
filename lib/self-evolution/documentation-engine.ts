/** Program 2035 — Documentation gap analysis. */

export interface DocGap {
  id: string;
  path: string;
  title: string;
  daysSinceUpdate: number;
  priority: "low" | "medium" | "high";
}

const GAPS: DocGap[] = [
  { id: "doc-vf", path: "docs/venture-factory/", title: "Venture Factory docs", daysSinceUpdate: 90, priority: "medium" },
  { id: "doc-mesh", path: "docs/executive-mesh/", title: "Executive Mesh docs", daysSinceUpdate: 45, priority: "low" },
  { id: "doc-api", path: "docs/api/", title: "API reference incompleta", daysSinceUpdate: 120, priority: "high" },
  { id: "doc-self-evo", path: "docs/self-evolution/", title: "Self Evolution (nuevo)", daysSinceUpdate: 0, priority: "low" },
];

export function reviewDocumentation(): DocGap[] {
  return [...GAPS];
}

export function getDocumentationScore(gaps: DocGap[]): number {
  const penalty = gaps.reduce((sum, g) => {
    const age = g.daysSinceUpdate > 60 ? 8 : g.daysSinceUpdate > 30 ? 4 : 1;
    const pri = g.priority === "high" ? 2 : 1;
    return sum + age * pri * 0.5;
  }, 0);
  return Math.max(0, Math.round(100 - penalty));
}
