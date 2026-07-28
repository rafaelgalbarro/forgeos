/** ForgeOS RC6.5 — executive notifications. */

import type { ExecutiveNotification } from "./types";

export function getExecutiveNotifications(): ExecutiveNotification[] {
  const now = Date.now();
  return [
    {
      id: "notif-prio",
      title: "CEO propone 3 prioridades",
      body: "Briefing matutino listo. Requiere tu decisión: Aceptar, Modificar o Rechazar.",
      departmentId: "ceo",
      createdAt: new Date(now - 30 * 60_000).toISOString(),
      read: false,
    },
    {
      id: "notif-delegation",
      title: "Delegación automática activa",
      body: "Research → Product: validar vertical SaaS B2B. QA → Build: smoke test nocturno.",
      departmentId: "ceo",
      createdAt: new Date(now - 60 * 60_000).toISOString(),
      read: false,
    },
    {
      id: "notif-health",
      title: "Executive Health Score: 82/100",
      body: "Organización operativa. Riesgos QA bajan el score — revisar mitigaciones.",
      departmentId: "ceo",
      createdAt: new Date(now - 90 * 60_000).toISOString(),
      read: true,
    },
  ];
}
