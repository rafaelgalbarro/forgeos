import { PaperTradingDashboard } from "@/components/investment/PaperTradingDashboard";
import type { PaperDashboardReadModel } from "@/components/investment/paper-dashboard.types";
import { createPaperBrokerEngine } from "@/lib/broker-engine/paper-broker-engine";
import {
  createDefaultPaperTradingOrchestrator,
  createPaperTradingConfigFromEnv,
  summarizeDashboard,
  type PaperTradingDashboardModel,
} from "@/src/core/investment/paper-trading";

export const metadata = {
  title: "Paper Trading",
  description: "Institutional paper trading dashboard — simulated only, certification mandatory before live.",
};

function toReadModel(model: PaperTradingDashboardModel): PaperDashboardReadModel {
  const summarized = summarizeDashboard(model);
  return {
    safety: model.safety,
    connected: model.connected,
    openOrders: model.openOrders.map((order) => ({
      id: order.id,
      symbol: order.symbol,
      side: order.side,
      intent: order.intent,
      status: order.status,
      quantity: order.quantity,
      remainingQuantity: order.remainingQuantity,
      expectedPrice: order.metrics.expectedPrice,
      executedPrice: order.metrics.executedPrice,
      slippage: order.metrics.slippage,
      latencyMs: order.metrics.latencyMs,
      mae: order.metrics.mae,
      mfe: order.metrics.mfe,
    })),
    positions: model.positions,
    recentTrades: model.recentTrades.map((trade) => ({
      tradeId: trade.tradeId,
      symbol: trade.symbol,
      quantity: trade.quantity,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice,
      pnl: trade.pnl,
      commission: trade.commission,
      mae: trade.mae,
      mfe: trade.mfe,
      sessionTag: trade.sessionTag,
      regimeTag: trade.regimeTag,
      exitReason: trade.exitReason,
      closedAt: trade.closedAt,
    })),
    journal: model.journal,
    certification: summarized.certification,
    performance: {
      ...summarized.performance,
      averageLatencyMs: model.performance.averageLatencyMs.toFixed(2),
      averageCommission: model.performance.averageCommission.toFixed(4),
    },
  };
}

async function buildReadModel(): Promise<PaperDashboardReadModel> {
  const orchestrator = createDefaultPaperTradingOrchestrator({
    brokerEngine: createPaperBrokerEngine(),
    config: createPaperTradingConfigFromEnv(),
  });
  const model = await orchestrator.getDashboardModel();
  return toReadModel(model);
}

export default async function PaperInvestmentPage() {
  const readModel = await buildReadModel();
  return <PaperTradingDashboard readModel={readModel} />;
}
