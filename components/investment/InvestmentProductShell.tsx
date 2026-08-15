"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "@/styles/investment/workspace.module.css";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import { useInvestmentStream } from "@/lib/investment/use-investment-stream";
import {
  type InvestmentDashboardSnapshot,
} from "@/lib/investment/dashboard-snapshot.types";
import { InvestmentWorkspaceNav } from "./InvestmentWorkspaceNav";
import { InvestmentMobileApprovalSheet } from "./InvestmentMobileApprovalSheet";
import { InvestmentTerminalHeader } from "./InvestmentTerminalHeader";
import { warmInvestmentDataCaches } from "@/lib/investment/client-last-known";

/**
 * Product chrome for ForgeOS Investment.
 * Compact terminal header — never blocks page content on IBKR.
 * Emergency stop is UI-only dry-run (no broker mutation / no orders).
 */
export function InvestmentProductShell({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<InvestmentDashboardSnapshot | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [halted, setHalted] = useState(false);
  const [haltMessage, setHaltMessage] = useState("");
  const [confirmHalt, setConfirmHalt] = useState(false);

  const refreshStatus = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await safeJsonFetch<InvestmentDashboardSnapshot & { error?: string }>(
        "/api/investment/dashboard",
        { cache: "no-store" },
      );
      if (!result.ok || !result.data) return;
      setSnapshot(result.data);
    } catch {
      /* status strip is non-blocking */
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
    warmInvestmentDataCaches();
  }, [refreshStatus]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.forgeosSurface = "investment";
    return () => {
      delete root.dataset.forgeosSurface;
    };
  }, []);

  const { connected: streamConnected } = useInvestmentStream((event) => {
    if (
      event.type === "signal" ||
      event.type === "order_executed" ||
      event.type === "circuit_breaker" ||
      event.type === "cycle_complete" ||
      event.type === "position_closed"
    ) {
      void refreshStatus();
    }
  });

  const broker = snapshot?.brokerStatus;
  const account = snapshot?.accountSummary?.data;
  const rawConnected = Boolean(broker?.data?.connected);
  const connected = rawConnected;

  function runEmergencyStop() {
    setConfirmHalt(false);
    setHalted(true);
    setHaltMessage(
      "EMERGENCY STOP armed · DRY_RUN · no broker mutation · no orders sent · ANALYSIS_ONLY remains",
    );
  }

  return (
    <div className={styles.productRoot} data-product="forgeos-investment">
      <InvestmentTerminalHeader
        connected={connected}
        streamConnected={streamConnected}
        refreshing={refreshing}
        halted={halted}
        confirmHalt={confirmHalt}
        onRefresh={() => void refreshStatus()}
        onArmHalt={() => setConfirmHalt(true)}
        onCancelHalt={() => setConfirmHalt(false)}
        onConfirmHalt={runEmergencyStop}
        fallbackNav={
          snapshot?.portfolioSummary?.data?.totalValue ?? account?.netLiquidation
        }
        currency={
          account?.currency ?? snapshot?.portfolioSummary?.data?.baseCurrency ?? "USD"
        }
      />

      {haltMessage ? <p className={styles.hubNote}>{haltMessage}</p> : null}

      <InvestmentWorkspaceNav />

      <div className={styles.productBody}>{children}</div>
      <InvestmentMobileApprovalSheet />
    </div>
  );
}
