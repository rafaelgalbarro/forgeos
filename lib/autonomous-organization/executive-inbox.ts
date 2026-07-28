/** ForgeOS RC6.5 — executive inbox. */

import type { ExecutiveInboxItem } from "./types";

export function getExecutiveInbox(): ExecutiveInboxItem[] {
  const now = Date.now();
  return [
    {
      id: "inbox-research",
      from: "research",
      subject: "3 oportunidades de mercado detectadas",
      preview: "SaaS B2B fleet management, AI ops tools, vertical fintech...",
      priority: "high",
      receivedAt: new Date(now - 5 * 3600_000).toISOString(),
      read: false,
    },
    {
      id: "inbox-qa",
      from: "qa",
      subject: "Riesgos en rutas principales",
      preview: "2 hallazgos high requieren decisión del CEO antes del board...",
      priority: "critical",
      receivedAt: new Date(now - 4 * 3600_000).toISOString(),
      read: false,
    },
    {
      id: "inbox-marketing",
      from: "marketing",
      subject: "Campaña founder beta completada",
      preview: "Assets listos. Growth propone activar loop de referidos...",
      priority: "medium",
      receivedAt: new Date(now - 3 * 3600_000).toISOString(),
      read: true,
    },
    {
      id: "inbox-build",
      from: "build",
      subject: "Recomendación RC7",
      preview: "Pipeline preview estable. Propongo avanzar a RC7 esta semana...",
      priority: "high",
      receivedAt: new Date(now - 2 * 3600_000).toISOString(),
      read: false,
    },
  ];
}
