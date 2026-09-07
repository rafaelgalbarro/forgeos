import { InvestmentRouteShell } from "@/components/investment/InvestmentRouteShell";
import { InvestmentDashboardDataProvider } from "@/components/investment/dashboard-data-coordinator";
import { SignalsWidget } from "@/components/investment/investment-dashboard-widgets";
import {
  getInvestmentDashboardSnapshot,
  refreshInvestmentDashboardSnapshot,
} from "@/lib/investment/dashboard-snapshot";
import styles from "@/styles/investment/workspace.module.css";

export const metadata = {
  title: "Signals",
  description: "Latest investment signals — ANALYSIS_ONLY.",
};

export const dynamic = "force-dynamic";

export default function InvestmentSignalsPage() {
  const snapshot = getInvestmentDashboardSnapshot();
  void refreshInvestmentDashboardSnapshot({ preferCache: false });

  return (
    <InvestmentDashboardDataProvider initialSnapshot={snapshot}>
      <InvestmentRouteShell
        title="Signals"
        description="Market and strategy signals from Investment Brain — advisory only."
        moduleLabel="Investment Brain / Signals"
        links={[
          { href: "/investment/opportunities", label: "Opportunities →" },
          { href: "/investment/ai-committee", label: "AI Committee →" },
          { href: "/investment/strategies", label: "Strategies →" },
        ]}
      />
      <div className={styles.grid} style={{ marginTop: 12 }}>
        <SignalsWidget />
      </div>
    </InvestmentDashboardDataProvider>
  );
}
