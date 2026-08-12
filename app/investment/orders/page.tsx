import { ExecutionManagerDashboard } from "@/components/investment/ExecutionManagerDashboard";
import { buildExecutionManagerSnapshot } from "@/lib/investment/execution-manager-snapshot";

export const metadata = {
  title: "Orders — Execution Manager",
  description:
    "ForgeOS Investment Execution Manager — order visibility, audit, gated Cancel/Modify/Duplicate. ANALYSIS_ONLY.",
};

export const dynamic = "force-dynamic";

/**
 * Execution Manager — centralizes order visibility and control surfaces.
 * Reads via broker engine / IBKR open orders. Mutations always LOCKED / DRY_RUN.
 */
export default async function InvestmentOrdersPage() {
  const snapshot = await buildExecutionManagerSnapshot();
  return <ExecutionManagerDashboard initialSnapshot={snapshot} />;
}
