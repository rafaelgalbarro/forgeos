import { InvestmentDashboardDataProvider } from "@/components/investment/dashboard-data-coordinator";
import { RiskCenterDashboard } from "@/components/investment/RiskCenterDashboard";
import { RiskSummaryWidget } from "@/components/investment/investment-dashboard-widgets";
import {
  getInvestmentDashboardSnapshot,
  refreshInvestmentDashboardSnapshot,
} from "@/lib/investment/dashboard-snapshot";
import { getRiskCenterSnapshot } from "@/lib/investment/risk-center-snapshot";
import styles from "@/styles/investment/workspace.module.css";

export const metadata = {
  title: "Risk Center",
  description:
    "Professional risk analysis — exposure, drawdown, VaR, ES, beta, vol, liquidity, concentration, correlations. ANALYSIS_ONLY.",
};

export const dynamic = "force-dynamic";

export default async function InvestmentRiskPage() {
  const dashboard = getInvestmentDashboardSnapshot();
  void refreshInvestmentDashboardSnapshot({ preferCache: false });
  const risk = await getRiskCenterSnapshot();

  return (
    <section className={styles.shellPage} aria-label="Risk Center">
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Risk Center</h1>
          <p className={styles.subtitle}>
            Exposición, drawdown, VaR, ES, beta, volatilidad, liquidez, concentración y correlaciones.
          </p>
        </div>
      </header>
      <InvestmentDashboardDataProvider initialSnapshot={dashboard}>
        <RiskCenterDashboard snapshot={risk} />
        <div className={styles.grid} style={{ marginTop: 12 }}>
          <RiskSummaryWidget />
        </div>
      </InvestmentDashboardDataProvider>
    </section>
  );
}
