"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import styles from "@/styles/investment/workspace.module.css";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import { useInvestmentStream } from "@/lib/investment/use-investment-stream";
import {
  type InvestmentDashboardSnapshot,
  honestBrokerDataSource,
} from "@/lib/investment/dashboard-snapshot.types";
import { InvestmentWorkspaceNav } from "./InvestmentWorkspaceNav";
import { InvestmentMobileApprovalSheet } from "./InvestmentMobileApprovalSheet";

function fmtMoney(value: number | undefined, currency = "USD"): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "NO_DATA";
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${currency}`;
}

/**
 * Product chrome for ForgeOS Investment.
 * Status strip is independent — never blocks page content on IBKR.
 * Emergency stop is UI-only dry-run (no broker mutation / no orders).
 */
export function InvestmentProductShell({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<InvestmentDashboardSnapshot | null>(null);
  const [statusError, setStatusError] = useState("");
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
      if (!result.ok || !result.data) {
        setStatusError(result.error ?? "Status unavailable");
        return;
      }
      setSnapshot(result.data);
      setStatusError(result.data.error ?? "");
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Status unavailable");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

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
  const sessionConnected =
    rawConnected && (broker?.state === "CONNECTED" || broker?.state == null) && !broker?.stale;
  const dataSource = honestBrokerDataSource(
    broker?.data?.dataSource ?? broker?.dataSource,
    rawConnected,
  );
  // Header "Broker status" follows IBKR connected flag (not the stricter LIVE dataSource gate).
  const connected = rawConnected;
  const lastSync = snapshot?.generatedAt ?? broker?.updatedAt ?? null;
  const dataFreshness =
    dataSource === "IBKR_LIVE_READ_ONLY" && sessionConnected
      ? "LIVE"
      : dataSource === "DEMO"
        ? "DEMO"
        : broker?.stale
          ? "DELAYED"
          : rawConnected
            ? "CONNECTED"
            : "UNAVAILABLE";

  function runEmergencyStop() {
    setConfirmHalt(false);
    setHalted(true);
    setHaltMessage(
      "EMERGENCY STOP armed · DRY_RUN · no broker mutation · no orders sent · ANALYSIS_ONLY remains",
    );
  }

  return (
    <div className={styles.productRoot} data-product="forgeos-investment">
      <header className={styles.productHeader} aria-label="ForgeOS Investment header">
        <div className={styles.productBrand}>
          <p className={styles.productKicker}>ForgeOS Product</p>
          <h1 className={styles.productTitle}>ForgeOS Investment</h1>
          <p className={styles.productTagline}>AI Investment Operating System</p>
        </div>
        <div className={styles.productActions}>
          <Link href="/os" className={styles.forgeosLink}>
            Volver a ForgeOS
          </Link>
          <button
            type="button"
            className={styles.retryBtn}
            disabled={refreshing}
            onClick={() => void refreshStatus()}
          >
            {refreshing ? "Sync…" : "Refresh"}
          </button>
          {!confirmHalt ? (
            <button
              type="button"
              className={styles.emergencyBtn}
              onClick={() => setConfirmHalt(true)}
              aria-label="Emergency stop"
            >
              Emergency Stop
            </button>
          ) : (
            <span className={styles.emergencyConfirm} role="alertdialog" aria-label="Confirm emergency stop">
              <span>Confirm halt? (no orders)</span>
              <button type="button" className={styles.emergencyBtn} onClick={runEmergencyStop}>
                Confirm
              </button>
              <button type="button" className={styles.retryBtn} onClick={() => setConfirmHalt(false)}>
                Cancel
              </button>
            </span>
          )}
        </div>
      </header>

      <div className={styles.statusStrip} aria-label="Operating status">
        <div className={styles.statusItem}>
          <span className={styles.hubLabel}>Broker status</span>
          <strong className={connected ? styles.hubValue : styles.monitorWarn}>
            {connected ? "CONNECTED" : "OFFLINE"}
          </strong>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.hubLabel}>Operating mode</span>
          <strong className={styles.hubValue}>{snapshot?.mode ?? "ANALYSIS_ONLY"}</strong>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.hubLabel}>Market data</span>
          <strong
            className={
              dataFreshness === "LIVE" ? styles.monitorOk : styles.monitorWarn
            }
          >
            {dataFreshness}
          </strong>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.hubLabel}>Data source</span>
          <strong className={styles.hubValue}>{dataSource}</strong>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.hubLabel}>Portfolio value</span>
          <strong className={styles.hubValue}>
            {fmtMoney(
              snapshot?.portfolioSummary?.data?.totalValue ?? account?.netLiquidation,
              account?.currency ?? snapshot?.portfolioSummary?.data?.baseCurrency ?? "USD",
            )}
          </strong>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.hubLabel}>Last sync</span>
          <strong className={styles.hubValue}>
            {lastSync ? new Date(lastSync).toLocaleTimeString() : "NO_DATA"}
          </strong>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.hubLabel}>Live stream</span>
          <strong className={streamConnected ? styles.monitorOk : styles.monitorWarn}>
            {streamConnected ? "SSE" : "OFFLINE"}
          </strong>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.hubLabel}>Orders</span>
          <strong className={styles.hubValue}>disabled</strong>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.hubLabel}>Emergency</span>
          <strong className={halted ? styles.monitorWarn : styles.hubValue}>
            {halted ? "ARMED" : "CLEAR"}
          </strong>
        </div>
        {statusError ? (
          <div className={styles.statusItem}>
            <span className={styles.hubLabel}>Status</span>
            <strong className={styles.monitorError} style={{ margin: 0, padding: "2px 6px" }}>
              Partial
            </strong>
          </div>
        ) : null}
      </div>

      {haltMessage ? <p className={styles.hubNote}>{haltMessage}</p> : null}

      <InvestmentWorkspaceNav />

      <div className={styles.productBody}>{children}</div>
      <InvestmentMobileApprovalSheet />
    </div>
  );
}
