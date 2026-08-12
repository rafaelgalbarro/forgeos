import { ExecutionControlDashboard, type ExecutionControlDashboardModel } from "@/components/investment/ExecutionControlDashboard";
import { getCompositionRoot } from "@/src/core/composition";
import {
  InMemoryExecutionStorage,
  summarizeExecutionForDashboard,
} from "@/src/core/investment/live-execution";

export const metadata = {
  title: "Execution Control — ForgeOS",
  description: "Live Execution Engine v1 control panel with mandatory supervision safeguards.",
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function buildFallbackModel(): ExecutionControlDashboardModel {
  const storage = new InMemoryExecutionStorage();
  return summarizeExecutionForDashboard({
    approvals: [],
    operations: [],
    audit: [],
    now: new Date().toISOString(),
    liveTradingEnabledValue: process.env.LIVE_TRADING_ENABLED ?? "unset",
    killSwitchEnabled: false,
  }) as ExecutionControlDashboardModel;
}

export default async function ExecutionControlPage() {
  const root = getCompositionRoot();
  const meta = asObject(root.store.meta);
  const fromMeta = asObject(meta?.investmentExecutionControl);
  const baseModel = buildFallbackModel();

  const model: ExecutionControlDashboardModel = {
    liveTradingEnabledValue:
      typeof fromMeta?.liveTradingEnabledValue === "string"
        ? fromMeta.liveTradingEnabledValue
        : baseModel.liveTradingEnabledValue,
    killSwitchEnabled:
      typeof fromMeta?.killSwitchEnabled === "boolean"
        ? fromMeta.killSwitchEnabled
        : baseModel.killSwitchEnabled,
    pendingApprovals: Array.isArray(fromMeta?.pendingApprovals)
      ? (fromMeta.pendingApprovals as ExecutionControlDashboardModel["pendingApprovals"])
      : baseModel.pendingApprovals,
    whatIfResults: Array.isArray(fromMeta?.whatIfResults)
      ? (fromMeta.whatIfResults as ExecutionControlDashboardModel["whatIfResults"])
      : baseModel.whatIfResults,
    auditTimeline: Array.isArray(fromMeta?.auditTimeline)
      ? (fromMeta.auditTimeline as ExecutionControlDashboardModel["auditTimeline"])
      : baseModel.auditTimeline,
  };

  return <ExecutionControlDashboard model={model} />;
}
