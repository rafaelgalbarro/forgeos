/** Bridge to mission progress / factory outputs for product scope. */

import type { Mission } from "../../types";
import type { AdaptationRecommendation } from "../types";
import { generateAdaptationPlan } from "../strategy-adaptations";
import type { ExitStrategyType } from "../types";

export interface ProductoAdaptationContext {
  missionId: string;
  recommendations: AdaptationRecommendation[];
  buildScope: "mvp" | "platform" | "enterprise" | "maintenance";
  mvpSpeed: "fast" | "balanced" | "slow";
}

const BUILD_SCOPE: Record<ExitStrategyType, ProductoAdaptationContext["buildScope"]> = {
  venta: "platform",
  crecimiento_independiente: "mvp",
  dividendos: "maintenance",
  venture_capital: "enterprise",
  patrimonio_familiar: "maintenance",
};

const MVP_SPEED: Record<ExitStrategyType, ProductoAdaptationContext["mvpSpeed"]> = {
  venta: "balanced",
  crecimiento_independiente: "fast",
  dividendos: "slow",
  venture_capital: "fast",
  patrimonio_familiar: "slow",
};

export function buildProductoAdaptation(mission: Mission, strategy: ExitStrategyType): ProductoAdaptationContext {
  const plan = generateAdaptationPlan(strategy);
  const prodRecs = plan.recommendations.filter((r) => r.domain === "producto");

  return {
    missionId: mission.id,
    recommendations: prodRecs,
    buildScope: BUILD_SCOPE[strategy],
    mvpSpeed: MVP_SPEED[strategy],
  };
}

export function applyProductSnapshotAdjustments(
  mission: Mission,
  strategy: ExitStrategyType
): Mission {
  const plan = generateAdaptationPlan(strategy);
  const adjustments = plan.snapshotAdjustments.filter((a) =>
    ["prd", "application", "website", "architecture"].includes(a.domain)
  );

  if (!adjustments.length) return mission;

  const snapshots = mission.snapshots.map((s) => {
    const adj = adjustments.find((a) => a.domain === s.id);
    if (!adj) return s;
    const newProgress = Math.min(100, s.progress + adj.progressDelta);
    return {
      ...s,
      progress: newProgress,
      status: newProgress >= 100 ? ("completed" as const) : newProgress > 0 ? ("in_progress" as const) : s.status,
      summary: adj.summary,
    };
  });

  return { ...mission, snapshots };
}
