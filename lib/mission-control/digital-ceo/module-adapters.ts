/** Optional module hints — GTM, investor, exit, autonomous company (read-only). */

import type { Mission } from "../types";
import type { DailyPriority, DigitalCEOBriefs } from "./types";

export function enrichBriefsWithModuleHints(mission: Mission, briefs: DigitalCEOBriefs): DigitalCEOBriefs {
  const extraItems: string[] = [];
  const extraPriorities: DailyPriority[] = [];

  try {
    if (mission.phase === "VALIDATE" || mission.phase === "DEPLOY" || mission.phase === "OPERATE") {
      extraItems.push("GTM: revisar entregables de lanzamiento");
      extraPriorities.push({
        rank: 0,
        title: "Revisar plan Go-To-Market",
        description: "Fase avanzada — validar entregables GTM",
        impact: "medium",
        source: "timeline",
      });
    }
  } catch {
    /* gtm optional */
  }

  try {
    const investorSnap = mission.snapshots.find((s) => s.id === "investorReadiness");
    if (investorSnap && investorSnap.progress < 50 && mission.phase !== "UNDERSTAND") {
      extraItems.push("Investor Mode: preparación para inversores incompleta");
    }
  } catch {
    /* investor optional */
  }

  try {
    if (mission.phase === "OPERATE" || mission.phase === "EVOLVE") {
      extraItems.push("Autonomous Company: revisar workspaces operativos");
    }
  } catch {
    /* autonomous company optional */
  }

  if (!extraItems.length && !extraPriorities.length) return briefs;

  return {
    ...briefs,
    morningBrief: {
      ...briefs.morningBrief,
      keyItems: [...briefs.morningBrief.keyItems, ...extraItems].slice(0, 6),
    },
    dailyPriorities: [...briefs.dailyPriorities, ...extraPriorities]
      .slice(0, 5)
      .map((p, i) => ({ ...p, rank: i + 1 })),
  };
}
