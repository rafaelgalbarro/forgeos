/** Lightweight SSR snapshot for exit strategy. */

import type { Mission } from "../types";
import type { ExitStrategySnapshot } from "./types";
import { EXIT_STRATEGY_VERSION } from "./types";
import { readExitStrategySelection } from "./exit-strategy-selector";
import { computeExitReadiness } from "./exit-readiness-scorer";
import { computeStrategicAlignment } from "./strategic-alignment";
import { computeDecisionImpacts } from "./decision-impact";
import { generateAdaptationPlan } from "./strategy-adaptations";

export function buildEmptyExitSnapshot(missionId: string): ExitStrategySnapshot {
  return {
    version: EXIT_STRATEGY_VERSION,
    missionId,
    generatedAt: new Date().toISOString(),
    selection: null,
    readiness: null,
    alignment: null,
    adaptationPlan: null,
    decisionImpacts: [],
    phase: "UNDERSTAND",
  };
}

export function buildExitStrategySnapshot(mission: Mission): ExitStrategySnapshot {
  const selection = readExitStrategySelection(mission.id);

  if (!selection) {
    return { ...buildEmptyExitSnapshot(mission.id), phase: mission.phase };
  }

  const strategy = selection.strategy;
  return {
    version: EXIT_STRATEGY_VERSION,
    missionId: mission.id,
    generatedAt: new Date().toISOString(),
    selection,
    readiness: computeExitReadiness(mission, strategy),
    alignment: computeStrategicAlignment(mission, strategy),
    adaptationPlan: generateAdaptationPlan(strategy),
    decisionImpacts: computeDecisionImpacts(mission, strategy),
    phase: mission.phase,
  };
}

export function exitSnapshotSummary(snapshot: ExitStrategySnapshot): string {
  if (!snapshot.selection) return "Sin estrategia de salida definida";
  const label = snapshot.readiness?.score ?? 0;
  const align = snapshot.alignment?.score ?? 0;
  return `Readiness ${label}% · Alineación ${align}%`;
}
