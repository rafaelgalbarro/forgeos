/** Compose all 6 brief types from mission snapshots. */

import type { Mission } from "../types";
import type { DigitalCEOBriefs } from "./types";
import { generateMorningBrief } from "./morning-brief";
import { generateMissionBrief } from "./mission-brief";
import { generateCEOBrief } from "./ceo-brief";
import { generateDailyPriorities } from "./daily-priorities";
import { generateWeeklyReview } from "./weekly-review";
import { generateExecutiveDigest } from "./executive-digest";
import { enrichBriefsWithModuleHints } from "./module-adapters";

export function composeAllBriefs(mission: Mission): DigitalCEOBriefs {
  const base: DigitalCEOBriefs = {
    morningBrief: generateMorningBrief(mission),
    missionBrief: generateMissionBrief(mission),
    ceoBrief: generateCEOBrief(mission),
    dailyPriorities: generateDailyPriorities(mission),
    weeklyReview: generateWeeklyReview(mission),
    executiveDigest: generateExecutiveDigest(mission),
  };

  return enrichBriefsWithModuleHints(mission, base);
}

export function buildOpeningMessage(briefs: DigitalCEOBriefs): string {
  const morning = briefs.morningBrief;
  const ceo = briefs.ceoBrief;
  const priority =
    briefs.dailyPriorities[0]?.title ?? ceo.topPriority ?? "Revisar estado de la misión";

  const parts = [
    morning.greeting,
    "",
    morning.headline,
    "",
    briefs.missionBrief.statusSummary,
  ];

  if (ceo.pendingDecisionsReminder) {
    parts.push("", ceo.pendingDecisionsReminder);
  }
  if (ceo.topRisk) {
    parts.push("", `⚠ Riesgo: ${ceo.topRisk}`);
  }

  parts.push("", `Mi recomendación para hoy: ${priority}`);

  return parts.join("\n");
}
