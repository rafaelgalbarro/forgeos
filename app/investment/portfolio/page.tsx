import { InvestmentRouteShell } from "@/components/investment/InvestmentRouteShell";
import { PortfolioManagementDashboard } from "@/components/investment/PortfolioManagementDashboard";
import { InvestmentDashboardDataProvider } from "@/components/investment/dashboard-data-coordinator";
import {
  getInvestmentDashboardSnapshot,
  refreshInvestmentDashboardSnapshot,
} from "@/lib/investment/dashboard-snapshot";
import { Suspense } from "react";

export const metadata = {
  title: "Portfolio",
  description:
    "Professional portfolio management — ANALYSIS_ONLY, read-only IBKR when available.",
};

export const dynamic = "force-dynamic";

export default function InvestmentPortfolioPage() {
  const snapshot = getInvestmentDashboardSnapshot();
  void refreshInvestmentDashboardSnapshot({ preferCache: false });

  return (
    <InvestmentDashboardDataProvider initialSnapshot={snapshot}>
      <InvestmentRouteShell
        title="Portfolio"
        description="Positions, allocation, risk, and Cartera Largo Plazo — Portfolio Analytics. ANALYSIS_ONLY."
        moduleLabel="Portfolio Analytics"
        metrics={[
          { label: "Module", value: "Portfolio Analytics" },
          { label: "Orders", value: "disabled" },
          { label: "LIVE_TRADING", value: "false" },
          { label: "IBKR_READ_ONLY", value: "true" },
        ]}
        panels={[
          {
            title: "Surface",
            state: "READY",
            lines: [
              "Summary · allocation charts · risk · positions",
              "Cartera Largo Plazo (6m–3y) · value · dividends · catalysts",
              "Missing metrics render NO_DATA — never invented",
            ],
          },
          {
            title: "Safety",
            state: "LOCKED",
            lines: [
              "ANALYSIS_ONLY",
              "No order path on this page",
              "LIVE_TRADING_ENABLED unchanged",
              "IBKR_READ_ONLY unchanged",
            ],
          },
        ]}
        links={[
          { href: "/investment/risk", label: "Risk →" },
          { href: "/investment/performance", label: "Performance →" },
          { href: "/investment/broker", label: "Broker →" },
          { href: "/investment", label: "Overview →" },
        ]}
      />
      <Suspense
        fallback={
          <section aria-label="Portfolio management loading">
            <p style={{ color: "#9fb4c9", fontSize: "0.75rem" }}>
              Loading portfolio management…
            </p>
          </section>
        }
      >
        <PortfolioManagementDashboard />
      </Suspense>
    </InvestmentDashboardDataProvider>
  );
}
