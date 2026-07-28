/** ForgeOS RC6.5 — dynamic priority planner. */

import type { ExecutivePriority } from "./types";

export function planExecutivePriorities(): ExecutivePriority[] {
  return [
    {
      id: "prio-1",
      rank: 1,
      title: "Aprobar avance a RC7 — Autonomous Build",
      rationale: "Build y Architecture alineados; preview pipeline listo",
      departmentId: "build",
      level: "critical",
    },
    {
      id: "prio-2",
      rank: 2,
      title: "Validar oportunidades Research en vertical SaaS B2B",
      rationale: "3 verticales con señal de mercado detectada anoche",
      departmentId: "research",
      level: "high",
    },
    {
      id: "prio-3",
      rank: 3,
      title: "Cerrar mitigación de riesgos QA antes del board",
      rationale: "2 riesgos high abiertos en /live y rutas principales",
      departmentId: "qa",
      level: "high",
    },
  ];
}
