import { ShadowTradingDashboard } from "@/components/investment/ShadowTradingDashboard";
import type {
  ShadowDashboardReadModel,
  ShadowOperationRow,
} from "@/components/investment/shadow-dashboard.types";
import {
  createDefaultInvestmentMemoryRepository,
  createInvestmentMemoryService,
  type DecisionHistoryRecord,
} from "@/src/core/investment/server";

export const metadata = {
  title: "Shadow Trading",
  description: "Shadow trading dashboard with no-order-send guarantees.",
};

function isShadowRecord(record: DecisionHistoryRecord): boolean {
  if (record.kind !== "simulated_operation") return false;
  if (!record.payload || typeof record.payload !== "object") return false;
  return (record.payload as { mode?: string }).mode === "shadow";
}

function asShadowOperation(record: DecisionHistoryRecord): ShadowOperationRow | null {
  if (!isShadowRecord(record)) return null;
  const payload = record.payload as Record<string, unknown>;
  const hypotheticalOrder = payload.hypotheticalOrder as Record<string, unknown> | undefined;
  const simulatedFill = payload.simulatedFill as Record<string, unknown> | undefined;
  if (!hypotheticalOrder || !simulatedFill) return null;

  return {
    signalId: String(payload.signalId ?? record.id),
    symbol: String(hypotheticalOrder.symbol ?? "UNKNOWN"),
    side: hypotheticalOrder.side === "SELL" ? "SELL" : "BUY",
    expectedPrice: Number(hypotheticalOrder.expectedPrice ?? 0),
    achievablePrice: Number(hypotheticalOrder.achievablePrice ?? 0),
    fillPrice: Number(simulatedFill.fillPrice ?? 0),
    estimatedPnl: Number(payload.estimatedPnl ?? 0),
    slippageBps: Number(simulatedFill.slippageBps ?? 0),
    latencyMs: Number(payload.latencyMs ?? 0),
    rejected: String(simulatedFill.status ?? "").toUpperCase() === "REJECTED",
    missingData: Array.isArray(payload.missingData)
      ? (payload.missingData.map((item) => String(item)) as string[])
      : [],
    avoidedRisk: Array.isArray(payload.avoidedRisk)
      ? (payload.avoidedRisk.map((item) => String(item)) as string[])
      : [],
  };
}

async function buildReadModel(): Promise<ShadowDashboardReadModel> {
  const memory = createInvestmentMemoryService({
    repository: createDefaultInvestmentMemoryRepository(),
  });
  const records = await memory.queryDecisionHistory({ kind: "simulated_operation", limit: 500 });
  const operations = records.map(asShadowOperation).filter((item): item is ShadowOperationRow => item !== null);
  const totalPnl = operations.reduce((sum, row) => sum + row.estimatedPnl, 0);
  const avgLatencyMs =
    operations.length > 0
      ? operations.reduce((sum, row) => sum + row.latencyMs, 0) / operations.length
      : 0;
  const rejectedSignals = operations.filter((row) => row.rejected).map((row) => row.signalId);
  const avoidedRisk = [...new Set(operations.flatMap((row) => row.avoidedRisk))];
  const missingData = [...new Set(operations.flatMap((row) => row.missingData))];
  const paperVsRealDifferences = operations
    .map((row) => {
      const ref = records.find((record) => {
        if (record.kind !== "simulated_operation" || !record.payload || typeof record.payload !== "object") return false;
        return (record.payload as { signalId?: string }).signalId === row.signalId;
      });
      if (!ref || typeof ref.payload !== "object") return null;
      const diff = (ref.payload as { paperDifference?: Record<string, unknown> | null }).paperDifference;
      if (!diff) return null;
      const pnlDelta = Number(diff.pnlDelta ?? 0);
      const slippageDelta = Number(diff.slippageDeltaBps ?? 0);
      return `${row.signalId}: pnlDelta=${pnlDelta.toFixed(2)} slippageDeltaBps=${slippageDelta.toFixed(2)}`;
    })
    .filter((item): item is string => item !== null);

  return {
    safety: {
      shadowMode: process.env.SHADOW_MODE === "true",
      liveTradingEnabled: process.env.LIVE_TRADING_ENABLED === "true",
      minimumDurationMs: Number(process.env.SHADOW_MIN_DURATION_MS ?? 0),
    },
    hypotheticalOperations: operations,
    hypotheticalPnl: totalPnl,
    paperVsRealDifferences,
    rejectedSignals,
    avoidedRisk,
    avgLatencyMs,
    missingDataSummary: missingData,
  };
}

export default async function ShadowInvestmentPage() {
  const readModel = await buildReadModel();
  return <ShadowTradingDashboard readModel={readModel} />;
}
