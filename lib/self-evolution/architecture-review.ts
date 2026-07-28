/** Program 2035 — Architecture review heuristics. */

export interface ArchFinding {
  id: string;
  title: string;
  type: "circular-dep" | "layer-violation" | "god-module" | "coupling";
  severity: "low" | "medium" | "high";
  modules: string[];
  recommendation: string;
}

const FINDINGS: ArchFinding[] = [
  {
    id: "arch-circ-cap-skills",
    title: "Dependencia circular capabilities ↔ skills",
    type: "circular-dep",
    severity: "medium",
    modules: ["lib/capabilities", "lib/skills"],
    recommendation: "Extraer contratos compartidos a lib/contracts.",
  },
  {
    id: "arch-ui-lib",
    title: "Component importa lib interno directamente",
    type: "layer-violation",
    severity: "low",
    modules: ["components/lab", "lib/runtime/internal"],
    recommendation: "Usar barrel exports públicos únicamente.",
  },
  {
    id: "arch-mesh-god",
    title: "Executive Mesh módulo > 800 líneas",
    type: "god-module",
    severity: "medium",
    modules: ["lib/executive-mesh"],
    recommendation: "Dividir en sub-módulos por departamento.",
  },
];

export function reviewArchitecture(): ArchFinding[] {
  return [...FINDINGS];
}

export function getArchitectureScore(findings: ArchFinding[]): number {
  const penalty = findings.reduce(
    (sum, f) => sum + (f.severity === "high" ? 15 : f.severity === "medium" ? 8 : 4),
    0
  );
  return Math.max(0, 100 - penalty);
}
