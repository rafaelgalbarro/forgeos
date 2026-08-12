"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "@/styles/investment/workspace.module.css";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import type { InvestmentDashboardSnapshot } from "@/lib/investment/dashboard-snapshot.types";

function fmtMoney(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "NO_DATA";
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

type OpportunitiesPayload = {
  opportunities?: unknown[];
  items?: unknown[];
  count?: number;
  error?: string;
};

/**
 * Large home card for ForgeOS main dashboard (/os).
 * Lightweight snapshot only — never blocks on IBKR connect.
 */
export function InvestmentHomeCard() {
  const [snapshot, setSnapshot] = useState<InvestmentDashboardSnapshot | null>(null);
  const [oppCount, setOppCount] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [dash, opps] = await Promise.all([
        safeJsonFetch<InvestmentDashboardSnapshot & { error?: string }>("/api/investment/dashboard", {
          cache: "no-store",
        }),
        safeJsonFetch<OpportunitiesPayload>("/api/investment/opportunities", { cache: "no-store" }),
      ]);
      if (cancelled) return;
      if (dash.ok && dash.data) {
        setSnapshot(dash.data);
        setError(dash.data.error ?? "");
      } else {
        setError(dash.error ?? "Snapshot unavailable");
      }
      if (opps.ok && opps.data) {
        const list = opps.data.opportunities ?? opps.data.items;
        setOppCount(
          typeof opps.data.count === "number"
            ? opps.data.count
            : Array.isArray(list)
              ? list.length
              : null,
        );
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const broker = snapshot?.brokerStatus;
  const connected = Boolean(broker?.data?.connected);
  const dataSource = broker?.data?.dataSource ?? broker?.dataSource ?? "UNAVAILABLE";
  const portfolio =
    snapshot?.portfolioSummary?.data?.totalValue ?? snapshot?.accountSummary?.data?.netLiquidation;
  const positions = snapshot?.portfolioSummary?.data?.positionCount;
  const riskLevel = snapshot?.riskSummary?.data?.level;
  const isDemo = dataSource === "DEMO";

  return (
    <Link href="/investment" className={styles.homeCard} data-panel-id="forgeos-investment-home-card">
      <div className={styles.homeCardHead}>
        <div>
          <p className={styles.productKicker}>Product</p>
          <h2 className={styles.homeCardTitle}>ForgeOS Investment</h2>
          <p className={styles.homeCardSubtitle}>AI Investment Operating System</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          <span className={styles.readOnlyTag}>ANALYSIS_ONLY</span>
          {isDemo ? <span className={styles.monitorWarn}>DEMO</span> : null}
        </div>
      </div>
      <div className={styles.homeCardGrid}>
        <div className={styles.hubItem}>
          <span className={styles.hubLabel}>Broker status</span>
          <strong className={styles.hubValue}>
            {connected ? "CONNECTED" : broker?.state ?? "DISCONNECTED"}
          </strong>
        </div>
        <div className={styles.hubItem}>
          <span className={styles.hubLabel}>Portfolio value</span>
          <strong className={styles.hubValue}>{fmtMoney(portfolio)}</strong>
        </div>
        <div className={styles.hubItem}>
          <span className={styles.hubLabel}>Daily P&L</span>
          <strong className={styles.hubValue}>NO_DATA</strong>
        </div>
        <div className={styles.hubItem}>
          <span className={styles.hubLabel}>Active opportunities</span>
          <strong className={styles.hubValue}>
            {oppCount === null ? "NO_DATA" : String(oppCount)}
          </strong>
        </div>
        <div className={styles.hubItem}>
          <span className={styles.hubLabel}>Operating mode</span>
          <strong className={styles.hubValue}>{snapshot?.mode ?? "ANALYSIS_ONLY"}</strong>
        </div>
        <div className={styles.hubItem}>
          <span className={styles.hubLabel}>Open positions</span>
          <strong className={styles.hubValue}>
            {typeof positions === "number" ? String(positions) : "NO_DATA"}
          </strong>
        </div>
        <div className={styles.hubItem}>
          <span className={styles.hubLabel}>Risk level</span>
          <strong className={styles.hubValue}>{riskLevel ?? "NO_DATA"}</strong>
        </div>
        <div className={styles.hubItem}>
          <span className={styles.hubLabel}>Data source</span>
          <strong className={styles.hubValue}>{dataSource}</strong>
        </div>
      </div>
      {error ? <p className={styles.homeCardNote}>Partial status · {error}</p> : null}
      <p className={styles.homeCardCta}>Open Investment OS →</p>
    </Link>
  );
}
