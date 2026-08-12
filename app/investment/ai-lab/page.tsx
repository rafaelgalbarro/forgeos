import { InvestmentRouteShell } from "@/components/investment/InvestmentRouteShell";
import { InvestmentDashboardDataProvider } from "@/components/investment/dashboard-data-coordinator";
import {
  AiStatusWidget,
  CommitteeSummaryWidget,
  ProviderHealthWidget,
  RuntimeHealthWidget,
} from "@/components/investment/investment-dashboard-widgets";
import {
  getInvestmentDashboardSnapshot,
  refreshInvestmentDashboardSnapshot,
} from "@/lib/investment/dashboard-snapshot";
import styles from "@/styles/investment/workspace.module.css";

export const metadata = {
  title: "AI Lab",
  description: "Investment Brain / Committee / provider lab — ANALYSIS_ONLY.",
};

export const dynamic = "force-dynamic";

export default function InvestmentAiLabPage() {
  const snapshot = getInvestmentDashboardSnapshot();
  void refreshInvestmentDashboardSnapshot({ preferCache: false });

  return (
    <InvestmentDashboardDataProvider initialSnapshot={snapshot}>
      <InvestmentRouteShell
        title="AI Lab"
        description="Investment Brain, Committee, and provider health — advisory only. Never unlocks live execution."
        moduleLabel="Investment Brain"
        metrics={[
          { label: "Brain", value: snapshot.brainStatus.data.status ?? "IDLE" },
          { label: "Mode", value: "ANALYSIS_ONLY" },
          { label: "AUTONOMOUS_LIVE", value: "LOCKED" },
          { label: "Orders", value: "disabled" },
        ]}
        links={[
          { href: "/investment/ai-committee", label: "AI Committee →" },
          { href: "/investment/signals", label: "Signals →" },
          { href: "/investment/strategies", label: "Strategies Laboratory →" },
        ]}
      />
      <div className={styles.grid} style={{ marginTop: 12 }}>
        <AiStatusWidget />
        <CommitteeSummaryWidget />
        <ProviderHealthWidget />
        <RuntimeHealthWidget />
      </div>
    </InvestmentDashboardDataProvider>
  );
}
