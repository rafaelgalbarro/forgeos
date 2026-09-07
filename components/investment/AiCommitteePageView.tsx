import { Suspense } from "react";
import { InvestmentRouteShell } from "@/components/investment/InvestmentRouteShell";
import { InvestmentDashboardDataProvider } from "@/components/investment/dashboard-data-coordinator";
import {
  CommitteeSummaryWidget,
  RecentDecisionsWidget,
} from "@/components/investment/investment-dashboard-widgets";
import { CommitteeReplayFilterBar } from "@/components/investment/CommitteeReplayFilterBar";
import { AiCommitteePanel } from "@/components/investment/AiCommitteePanel";
import {
  getInvestmentDashboardSnapshot,
  refreshInvestmentDashboardSnapshot,
} from "@/lib/investment/dashboard-snapshot";
import { getCommitteePanelSnapshot } from "@/lib/investment/committee-panel-snapshot";
import styles from "@/styles/investment/workspace.module.css";

export type CommitteePageParams = {
  symbol?: string;
  risk?: string;
  analytics?: string;
  q?: string;
};

/**
 * Shared AI Committee page body — used by /investment/committee (primary)
 * and /investment/ai-committee (alias). ANALYSIS_ONLY; no manual decision UI.
 */
export async function AiCommitteePageView({
  searchParams,
}: {
  searchParams?: Promise<CommitteePageParams> | CommitteePageParams;
}) {
  const params = searchParams instanceof Promise ? await searchParams : searchParams;
  const snapshot = getInvestmentDashboardSnapshot();
  void refreshInvestmentDashboardSnapshot({ preferCache: false });
  const panel = await getCommitteePanelSnapshot({
    symbol: params?.symbol,
    risk: params?.risk,
    analytics: params?.analytics,
    q: params?.q,
    limit: 40,
  });
  const readyAgents = panel.agents.filter((a) => a.state === "READY").length;

  return (
    <InvestmentDashboardDataProvider initialSnapshot={snapshot}>
      <InvestmentRouteShell
        title="AI Committee"
        description="AI Investment Committee — advisory stances from the agent ecosystem. Fully automatic. Never unlocks live execution."
        moduleLabel="Investment Committee"
        metrics={[
          { label: "Agents", value: `${readyAgents}/${panel.agents.length}` },
          { label: "Replay", value: String(panel.replay.count) },
          { label: "Orders", value: "disabled" },
          { label: "LIVE", value: "false" },
        ]}
        panels={[
          {
            title: "Panel",
            state: readyAgents ? "READY" : "NO_DATA",
            lines: [panel.note, panel.symbol ? `Focus: ${panel.symbol}` : "Symbol: NO_DATA"],
          },
          {
            title: "Safety",
            state: "LOCKED",
            lines: [
              "ANALYSIS_ONLY",
              "Automatic committee only — no manual decisions",
              "Read-only memory / continuous analysis",
              "Zero order path",
            ],
          },
        ]}
        links={[
          { href: "/investment/signals", label: "Signals →" },
          { href: "/investment/risk", label: "Risk →" },
          { href: "/investment/audit?kind=decision", label: "Audit (decision) →" },
          { href: "/investment/scanner", label: "Scanner →" },
        ]}
      />

      <div className={styles.grid} style={{ marginTop: 12 }}>
        <CommitteeSummaryWidget />
        <RecentDecisionsWidget />
      </div>

      <Suspense fallback={<p className={styles.hubNote}>Loading filters…</p>}>
        <CommitteeReplayFilterBar
          symbols={panel.replay.availableSymbols}
          riskLevels={panel.replay.availableRiskLevels}
        />
      </Suspense>

      <AiCommitteePanel panel={panel} />
    </InvestmentDashboardDataProvider>
  );
}
