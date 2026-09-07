"use client";

import dynamic from "next/dynamic";
import styles from "@/styles/investment/workspace.module.css";
import type { InvestmentDashboardSnapshot } from "@/lib/investment/dashboard-snapshot.types";
import { InvestmentDashboardDataProvider } from "./dashboard-data-coordinator";
import { InvestmentTerminalDashboard } from "./InvestmentTerminalDashboard";
import { InvestmentOverviewBoard } from "./InvestmentOverviewBoard";

const PortfolioMonitorLive = dynamic(
  () => import("./PortfolioMonitorLive").then((m) => m.PortfolioMonitorLive),
  {
    ssr: false,
    loading: () => (
      <section className={styles.monitorSection} aria-label="Portfolio monitor loading">
        <p className={styles.monitorMetaText}>Portfolio monitor loading…</p>
      </section>
    ),
  },
);

interface InvestmentWorkspaceProps {
  readonly initialSnapshot?: InvestmentDashboardSnapshot | null;
}

/**
 * Dashboard client shell — overview board + trading-terminal + live portfolio monitor.
 * Product chrome/nav lives in InvestmentProductShell (layout).
 */
export function InvestmentWorkspace({ initialSnapshot = null }: InvestmentWorkspaceProps) {
  return (
    <InvestmentDashboardDataProvider initialSnapshot={initialSnapshot}>
      <section className={styles.workspace} aria-label="ForgeOS Investment Dashboard">
        <InvestmentOverviewBoard />
        <InvestmentTerminalDashboard />
        <PortfolioMonitorLive />
      </section>
    </InvestmentDashboardDataProvider>
  );
}
