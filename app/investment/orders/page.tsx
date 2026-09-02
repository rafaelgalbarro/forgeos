import { ExecutionManagerDashboard } from "@/components/investment/ExecutionManagerDashboard";
import { buildExecutionManagerSnapshot } from "@/lib/investment/execution-manager-snapshot";

export const metadata = {
  title: "Orders — Execution Manager",
  description:
    "ForgeOS Investment Execution Manager — order visibility, audit, Cancel/Modify/Duplicate when Gate OPEN.",
};

export const dynamic = "force-dynamic";

/**
 * Execution Manager — centralizes order visibility and control surfaces.
 * Gate OPEN when LIVE_TRADING_ENABLED=true and IBKR_READ_ONLY=false.
 */
export default async function InvestmentOrdersPage() {
  const snapshot = await buildExecutionManagerSnapshot();
  return <ExecutionManagerDashboard initialSnapshot={snapshot} />;
}
