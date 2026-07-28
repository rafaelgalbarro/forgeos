/** Program 2035 — Security review heuristics. */

export interface SecurityFinding {
  id: string;
  title: string;
  severity: "info" | "low" | "medium" | "high";
  category: "auth" | "secrets" | "dependencies" | "api" | "rbac";
  recommendation: string;
}

const FINDINGS: SecurityFinding[] = [
  {
    id: "sec-api-keys",
    title: "API keys en localStorage (demo)",
    severity: "medium",
    category: "secrets",
    recommendation: "Migrar a secure storage con cifrado.",
  },
  {
    id: "sec-rbac-gaps",
    title: "2 rutas sin verificación RBAC",
    severity: "low",
    category: "rbac",
    recommendation: "Añadir middleware de permisos en /lab/*.",
  },
  {
    id: "sec-dep-cve",
    title: "Dependencia con CVE conocido (demo)",
    severity: "info",
    category: "dependencies",
    recommendation: "Actualizar paquete en próximo sprint.",
  },
];

export function reviewSecurity(): SecurityFinding[] {
  return [...FINDINGS];
}

export function getSecurityScore(findings: SecurityFinding[]): number {
  const penalty = findings.reduce((sum, f) => {
    const w =
      f.severity === "high" ? 20 : f.severity === "medium" ? 10 : f.severity === "low" ? 5 : 2;
    return sum + w;
  }, 0);
  return Math.max(0, 100 - penalty);
}
