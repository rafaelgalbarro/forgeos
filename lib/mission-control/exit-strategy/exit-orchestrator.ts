/** Main exit strategy coordinator — triggers adaptations across modules. */

import type { Mission } from "../types";
import type { ExitStrategyDelta, ExitStrategySelection, ExitStrategyType } from "./types";
import { getExitStrategyLabel } from "./exit-strategy-registry";
import {
  readExitStrategySelection,
  selectExitStrategy,
  type SelectStrategyResult,
} from "./exit-strategy-selector";
import { generateAdaptationPlan, adaptationDomainsChanged } from "./strategy-adaptations";
import { computeExitReadiness } from "./exit-readiness-scorer";
import { computeStrategicAlignment } from "./strategic-alignment";
import { computeDecisionImpacts } from "./decision-impact";
import { buildRoadmapAdaptation } from "./adapters/roadmap-adapter";
import { buildFinanzasAdaptation } from "./adapters/investor-adapter";
import { buildMarketingAdaptation } from "./adapters/gtm-adapter";
import { buildProductoAdaptation, applyProductSnapshotAdjustments } from "./adapters/product-adapter";
import { emitMissionEventAsync } from "../live-mission/event-emitter";
import { appendStrategyNote, readVentureMemory, writeVentureMemory } from "../pair-founder/venture-memory";
import { buildExitStrategySnapshot } from "./exit-snapshots";

export interface ExitOrchestrationResult {
  mission: Mission;
  selection: ExitStrategySelection;
  delta?: ExitStrategyDelta;
  impactWarning?: string;
  reply?: string;
}

export function getActiveExitStrategy(missionId: string): ExitStrategyType | null {
  return readExitStrategySelection(missionId)?.strategy ?? null;
}

export function shouldShowExitStrategy(mission: Mission): boolean {
  if (!mission.intention) return false;
  if (mission.intention === "DISCOVERY") {
    return !!mission.discoveryProfile?.selectedOpportunity;
  }
  return mission.intention === "VENTURE" || mission.intention === "WEBSITE" || mission.intention === "APPLICATION";
}

export function orchestrateExitStrategyChange(
  mission: Mission,
  strategy: ExitStrategyType
): ExitOrchestrationResult {
  const prev = readExitStrategySelection(mission.id);
  const { selection, isChange, impactWarning }: SelectStrategyResult = selectExitStrategy(mission.id, strategy);

  const plan = generateAdaptationPlan(strategy);
  let updated = applyProductSnapshotAdjustments(mission, strategy);

  for (const adj of plan.snapshotAdjustments) {
    updated = {
      ...updated,
      snapshots: updated.snapshots.map((s) => {
        if (s.id !== adj.domain) return s;
        const progress = Math.min(100, s.progress + adj.progressDelta);
        return {
          ...s,
          progress,
          status: progress >= 100 ? ("completed" as const) : progress > 0 ? ("in_progress" as const) : s.status,
          summary: adj.summary,
        };
      }),
    };
  }

  const roadmap = buildRoadmapAdaptation(updated, strategy);
  const finanzas = buildFinanzasAdaptation(updated, strategy);
  const marketing = buildMarketingAdaptation(updated, strategy);
  const producto = buildProductoAdaptation(updated, strategy);

  void roadmap;
  void finanzas;
  void marketing;
  void producto;

  const memory = readVentureMemory(mission.id);
  const note = `Exit strategy: ${getExitStrategyLabel(strategy)}`;
  if (!memory.strategyNotes.includes(note)) {
    writeVentureMemory(appendStrategyNote(memory, note));
  }

  updated = emitMissionEventAsync(
    updated,
    "system",
    `Estrategia de salida: ${getExitStrategyLabel(strategy)}`,
    { department: "CEO", icon: "🎯" }
  );

  let delta: ExitStrategyDelta | undefined;
  if (isChange && prev) {
    const changedDomains = adaptationDomainsChanged(prev.strategy, strategy);
    delta = {
      previousStrategy: prev.strategy,
      newStrategy: strategy,
      changedDomains,
      summary: `Roadmap, Finanzas, Marketing y Producto adaptados a ${getExitStrategyLabel(strategy)}.`,
    };
  }

  const reply = isChange
    ? `${impactWarning ?? ""}\n\nEstrategia actualizada a ${getExitStrategyLabel(strategy)}. Revisa alineación y readiness en CEO Insights.`
    : `Estrategia de salida definida: ${getExitStrategyLabel(strategy)}. Mission Control adaptará Roadmap, Finanzas, Marketing y Producto.`;

  return { mission: updated, selection, delta, impactWarning, reply };
}

export function buildExitMetrics(mission: Mission) {
  const selection = readExitStrategySelection(mission.id);
  if (!selection) return null;

  const readiness = computeExitReadiness(mission, selection.strategy);
  const alignment = computeStrategicAlignment(mission, selection.strategy);
  const decisionImpacts = computeDecisionImpacts(mission, selection.strategy);
  const adaptationPlan = generateAdaptationPlan(selection.strategy);

  return { selection, readiness, alignment, decisionImpacts, adaptationPlan };
}

export function refreshExitStrategyOnTurn(mission: Mission): Mission {
  const metrics = buildExitMetrics(mission);
  if (!metrics) return mission;

  return {
    ...mission,
    status: {
      ...mission.status,
      recommendations: [
        ...mission.status.recommendations.filter((r) => !r.startsWith("Exit:")),
        `Exit: ${metrics.readiness.recommendedNextStep}`,
      ].slice(-5),
    },
  };
}

export function buildFullExitSnapshot(mission: Mission) {
  return buildExitStrategySnapshot(mission);
}

export function detectExitStrategyIntent(input: string): boolean {
  return /\b(estrategia\s*de\s*salida|exit\s*strategy|tipo\s*de\s*exit|venta|dividendos|patrimonio|venture\s*capital|crecimiento\s*independiente)\b/i.test(
    input.trim()
  );
}
