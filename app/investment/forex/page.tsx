import { ForexDashboard } from "@/components/investment/ForexDashboard";
import { readForexEnabledAtRuntime } from "@/lib/investment/forex/server-env";

export const dynamic = "force-dynamic";

/** Server reads FOREX_ENABLED at request time — not build/static client bundle. */
export default function InvestmentForexPage() {
  const initialForexEnabled = readForexEnabledAtRuntime();
  return <ForexDashboard initialForexEnabled={initialForexEnabled} />;
}
