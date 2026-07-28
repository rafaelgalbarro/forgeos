/** Mission status one-pager brief. */

import type { Mission } from "../types";
import type { MissionBrief } from "./types";
import { phaseLabelEs } from "../mission-flow";
import { executionProgressPercent } from "../live-execution";
import { combinedProgress } from "../live-mission/mission-progress";

export function generateMissionBrief(mission: Mission): MissionBrief {
  const snapProgress = mission.snapshots.map((s) => s.progress);
  const execPct = executionProgressPercent(mission.liveExecution);
  const progressPercent = combinedProgress(mission.phase, snapProgress, execPct);

  const activeDomains = mission.snapshots
    .filter((s) => s.status === "in_progress" || s.progress > 0)
    .map((s) => s.label)
    .slice(0, 5);

  let statusSummary = `Fase ${phaseLabelEs(mission.phase)} — ${progressPercent}% de progreso combinado.`;
  if (mission.factoryRoute) {
    statusSummary += ` Proyecto vinculado en factory.`;
  }
  if (mission.autoPilot.enabled) {
    statusSummary += mission.autoPilot.pausedForDecision
      ? " Auto-pilot pausado por decisión."
      : " Auto-pilot activo.";
  }

  return {
    missionId: mission.id,
    title: mission.title,
    phase: mission.phase,
    phaseLabel: phaseLabelEs(mission.phase),
    intention: mission.intention,
    progressPercent,
    activeDomains,
    statusSummary,
    generatedAt: new Date().toISOString(),
  };
}

export function formatMissionBriefText(brief: MissionBrief): string {
  const domains =
    brief.activeDomains.length > 0 ? brief.activeDomains.join(", ") : "Sin dominios activos aún";
  return `**${brief.title}** — ${brief.phaseLabel}\n${brief.statusSummary}\nDominios: ${domains}`;
}
