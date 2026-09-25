import "server-only";

import { createInvestmentMemoryService } from "../../application/investment-memory-service";
import { createDefaultInvestmentMemoryRepository } from "../../infrastructure/investment-memory-filesystem";
import { STRATEGY_LAB_MEMORY_SCENARIO } from "../domain/types";
import type { StrategyLabSnapshot } from "./orchestrator";

/**
 * Persist Strategy Lab snapshot summary into Investment Memory.
 * Never records order payloads; training remains disabled.
 */
export async function recordStrategyLabSnapshotToMemory(
  snapshot: StrategyLabSnapshot,
): Promise<{ recorded: true; id: string } | { recorded: false; reason: string }> {
  try {
    const service = createInvestmentMemoryService({
      repository: createDefaultInvestmentMemoryRepository(),
    });
    const record = await service.recordAnalysis({
      occurredAt: snapshot.generatedAt,
      provenance: {
        source: "strategy-lab",
        actor: "system",
        tags: ["strategy-lab", "analysis-only"],
      },
      indexes: {
        scenario: STRATEGY_LAB_MEMORY_SCENARIO,
        strategy: snapshot.ranking[0]?.strategyId,
      },
      payload: {
        kind: "strategy_lab_snapshot",
        libraryCount: snapshot.library.length,
        topStrategy: snapshot.ranking[0]?.strategyId ?? null,
        certificationVerdicts: snapshot.certifications.map((c) => ({
          strategyId: c.strategyId,
          verdict: c.verdict,
          livePromotionAllowed: c.livePromotionAllowed,
        })),
        aiImprovements: snapshot.aiImprovements.flat().length,
        goLive: snapshot.goLive,
        productionMutation: snapshot.productionMutation,
      },
    });
    return { recorded: true, id: record.id };
  } catch (error) {
    return {
      recorded: false,
      reason: error instanceof Error ? error.message : "memory_write_failed",
    };
  }
}
