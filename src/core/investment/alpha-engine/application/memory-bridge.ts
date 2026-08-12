import "server-only";

import { createInvestmentMemoryService } from "../../application/investment-memory-service";
import { createDefaultInvestmentMemoryRepository } from "../../infrastructure/investment-memory-filesystem";
import { ALPHA_MEMORY_SCENARIO } from "../domain/types";
import type { AlphaEngineSnapshot } from "./orchestrator";

export async function recordAlphaEngineSnapshotToMemory(
  snapshot: AlphaEngineSnapshot,
): Promise<{ recorded: true; id: string } | { recorded: false; reason: string }> {
  try {
    const service = createInvestmentMemoryService({
      repository: createDefaultInvestmentMemoryRepository(),
    });
    const record = await service.recordAnalysis({
      occurredAt: snapshot.generatedAt,
      provenance: {
        source: "alpha-engine",
        actor: "system",
        tags: ["alpha-engine", "analysis-only"],
      },
      indexes: {
        scenario: ALPHA_MEMORY_SCENARIO,
        strategy: snapshot.topOpportunities[0]?.strategy,
        symbol: snapshot.topOpportunities[0]?.asset,
      },
      payload: {
        kind: "alpha_engine_snapshot",
        topCount: snapshot.topOpportunities.length,
        rejectedCount: snapshot.rejectedOpportunities.length,
        rankingCount: snapshot.alphaRanking.length,
        committeeEscalations: snapshot.committeeEscalations.length,
        riskEscalations: snapshot.riskEscalations.length,
        ordersSubmitted: snapshot.ordersSubmitted,
        liveTradingEnabled: snapshot.liveTradingEnabled,
        goLive: snapshot.goLive,
        grades: snapshot.alphaRanking.map((o) => ({
          asset: o.asset,
          grade: o.grade,
          score: o.score,
          escalateToCommittee: o.escalateToCommittee,
        })),
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
