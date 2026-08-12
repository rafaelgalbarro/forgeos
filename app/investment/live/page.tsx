import { LiveTradingDashboard } from "@/components/investment/LiveTradingDashboard";
import { buildLiveTradingDashboardReadModel } from "@/lib/investment/live-trading-snapshot";

export const metadata = {
  title: "Live Trading",
  description:
    "Investment OS LIVE control center — AUTONOMOUS_LIVE LOCKED until certification. Read-only IBKR. Zero orders.",
};

export default async function InvestmentLivePage() {
  const readModel = await buildLiveTradingDashboardReadModel();
  return <LiveTradingDashboard initialReadModel={readModel} />;
}
