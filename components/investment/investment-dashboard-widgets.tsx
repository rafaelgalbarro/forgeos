"use client";

import { useEffect, useState } from "react";
import styles from "@/styles/investment/workspace.module.css";
import {
  type InvestmentDashboardSnapshot,
  type InvestmentHealthState,
  type SnapshotSectionMeta,
  honestBrokerDataSource,
} from "@/lib/investment/dashboard-snapshot.types";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import { useInvestmentDashboardData } from "./dashboard-data-coordinator";

function fmtPct(value: number | undefined): string {
  return typeof value === "number" ? `${value.toFixed(2)}%` : "NO_DATA";
}

function fmtNumber(value: number | undefined): string {
  return typeof value === "number" ? value.toLocaleString("en-US") : "NO_DATA";
}

function StateBadge({ state }: { state: InvestmentHealthState | string }) {
  const tone =
    state === "CONNECTED" || state === "READY" || state === "ACTIVE"
      ? styles.monitorOk
      : state === "STALE" || state === "PARTIAL" || state === "IDLE"
        ? styles.monitorWarn
        : styles.monitorError;
  return <span className={tone}>{state}</span>;
}

function WidgetShell({
  title,
  meta,
  children,
  onRetry,
}: {
  title: string;
  meta?: SnapshotSectionMeta;
  children: React.ReactNode;
  onRetry?: () => void;
}) {
  return (
    <article className={styles.panel} data-panel-id={title.toLowerCase().replace(/\s+/g, "-")}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>{title}</h2>
        <div className={styles.monitorMeta}>
          {meta ? <StateBadge state={meta.state} /> : <StateBadge state="UNAVAILABLE" />}
          {onRetry ? (
            <button type="button" className={styles.retryBtn} onClick={onRetry}>
              Retry
            </button>
          ) : null}
        </div>
      </div>
      {meta?.error ? <p className={styles.monitorError}>{meta.error}</p> : null}
      <ul className={styles.panelList}>{children}</ul>
    </article>
  );
}

function Line({ children }: { children: React.ReactNode }) {
  return <li>{children}</li>;
}

export function InvestmentHeader() {
  const { lastFetchedAt, refreshing } = useInvestmentDashboardData();
  return (
    <header className={styles.header} data-panel-id="investment-header">
      <div>
        <h1 className={styles.title}>Overview</h1>
        <p className={styles.subtitle}>
          Portfolio · risk · signals · committee — analysis only, no order execution
        </p>
      </div>
      <p className={styles.monitorMetaText}>
        {refreshing ? "Refreshing…" : "Ready"}
        {lastFetchedAt ? ` · ${new Date(lastFetchedAt).toLocaleTimeString()}` : ""}
      </p>
    </header>
  );
}

export function OperatingModeBanner() {
  const { snapshot, error, retry } = useInvestmentDashboardData();
  const mode = snapshot?.mode ?? "ANALYSIS_ONLY";
  return (
    <article className={styles.hub} data-panel-id="operating-mode-banner">
      <div className={styles.hubGrid}>
        <div className={styles.hubItem}>
          <span className={styles.hubLabel}>Mode</span>
          <strong className={styles.hubValue}>{mode}</strong>
        </div>
        <div className={styles.hubItem}>
          <span className={styles.hubLabel}>Orders</span>
          <strong className={styles.hubValue}>{snapshot?.orderExecution ?? "disabled"}</strong>
        </div>
        <div className={styles.hubItem}>
          <span className={styles.hubLabel}>LIVE_TRADING_ENABLED</span>
          <strong className={styles.hubValue}>false</strong>
        </div>
        <div className={styles.hubItem}>
          <span className={styles.hubLabel}>Brain</span>
          <strong className={styles.hubValue}>{snapshot?.brainStatus.data.status ?? "IDLE"}</strong>
        </div>
      </div>
      {error ? <p className={styles.monitorError}>{error}</p> : null}
      <p className={styles.hubNote}>
        Orders disabled · READ_ONLY · ANALYSIS_ONLY ·{" "}
        <button type="button" className={styles.retryBtn} onClick={retry}>
          Retry dashboard
        </button>
      </p>
    </article>
  );
}

export function BrokerStatusWidget() {
  const { snapshot, retry } = useInvestmentDashboardData();
  const section = snapshot?.brokerStatus;
  const data = section?.data;
  const dataSource = honestBrokerDataSource(
    data?.dataSource ?? section?.dataSource,
    Boolean(data?.connected),
  );
  const accounts =
    data?.maskedAccounts?.length
      ? data.maskedAccounts.join(", ")
      : data?.managedAccounts?.length
        ? data.managedAccounts.join(", ")
        : "NO_DATA";
  return (
    <WidgetShell title="Broker Status" meta={section} onRetry={retry}>
      <Line>DATA_SOURCE: {dataSource}</Line>
      <Line>STATUS: {section?.state ?? "UNAVAILABLE"}</Line>
      <Line>Connected: {data?.connected ? "yes" : "no"}</Line>
      <Line>Engine: {data?.engine ?? "NO_DATA"}</Line>
      <Line>ACCOUNT: {accounts}</Line>
      <Line>IBKR_READ_ONLY: {data?.ibkrReadOnly !== false ? "true" : "false"}</Line>
      <Line>LIVE_TRADING_ENABLED: {data?.liveTradingEnabled ? "true" : "false"}</Line>
    </WidgetShell>
  );
}

export function PortfolioSummaryWidget() {
  const { snapshot, retry } = useInvestmentDashboardData();
  const section = snapshot?.portfolioSummary;
  const account = snapshot?.accountSummary;
  const data = section?.data;
  const dataSource = honestBrokerDataSource(
    section?.dataSource ?? account?.dataSource ?? snapshot?.brokerStatus?.data?.dataSource,
    Boolean(snapshot?.brokerStatus?.data?.connected),
  );
  return (
    <WidgetShell title="Portfolio Summary" meta={section} onRetry={retry}>
      <Line>DATA_SOURCE: {dataSource}</Line>
      <Line>Total portfolio value: {fmtNumber(data?.totalValue ?? account?.data?.netLiquidation)}</Line>
      <Line>Currency: {data?.baseCurrency ?? account?.data?.currency ?? "NO_DATA"}</Line>
      <Line>Cash ratio: {fmtPct(data?.cashRatioPct)}</Line>
      <Line>Positions: {data?.positionCount ?? "NO_DATA"}</Line>
      <Line>Open orders (read-only): {data?.openOrderCount ?? "NO_DATA"}</Line>
      <Line>Daily P&L: NO_DATA</Line>
      <Line>Total P&L: NO_DATA</Line>
      <Line>Account state: {account?.state ?? "UNAVAILABLE"}</Line>
    </WidgetShell>
  );
}

export function AccountLiquidityWidget() {
  const { snapshot, retry } = useInvestmentDashboardData();
  const section = snapshot?.accountSummary;
  const data = section?.data;
  const risk = snapshot?.riskSummary?.data;
  return (
    <WidgetShell title="Liquidity & Exposure" meta={section} onRetry={retry}>
      <Line>Available liquidity (cash): {fmtNumber(data?.totalCashValue)}</Line>
      <Line>Buying power: {fmtNumber(data?.buyingPower)}</Line>
      <Line>Net liquidation: {fmtNumber(data?.netLiquidation)}</Line>
      <Line>Currency: {data?.currency ?? "NO_DATA"}</Line>
      <Line>Exposure / concentration: {fmtPct(risk?.concentrationRiskPct)}</Line>
      <Line>Total risk level: {risk?.level ?? "NO_DATA"}</Line>
    </WidgetShell>
  );
}

export function ActiveOpportunitiesWidget() {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const result = await safeJsonFetch<{
        opportunities?: unknown[];
        items?: unknown[];
        count?: number;
        error?: string;
      }>("/api/investment/opportunities", { cache: "no-store" });
      if (cancelled) return;
      if (!result.ok || !result.data) {
        setError(result.error ?? "Unavailable");
        return;
      }
      const list = result.data.opportunities ?? result.data.items;
      setCount(
        typeof result.data.count === "number"
          ? result.data.count
          : Array.isArray(list)
            ? list.length
            : null,
      );
      setUpdatedAt(new Date().toISOString());
      setError(result.data.error ?? "");
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const meta: SnapshotSectionMeta = {
    state: error ? "ERROR" : count === null ? "UNAVAILABLE" : "READY",
    updatedAt,
    stale: false,
    error: error || undefined,
    source: "live",
  };

  return (
    <WidgetShell title="Active Opportunities" meta={meta}>
      <Line>Active: {count === null ? "NO_DATA" : String(count)}</Line>
      <Line>Scanner: ANALYSIS_ONLY</Line>
      <Line>Orders: disabled</Line>
    </WidgetShell>
  );
}

export function TopPositionsWidget() {
  const { snapshot, retry } = useInvestmentDashboardData();
  const section = snapshot?.portfolioSummary;
  const count = section?.data?.positionCount;
  return (
    <WidgetShell title="Top Positions" meta={section} onRetry={retry}>
      <Line>
        Position count: {typeof count === "number" ? count : "NO_DATA"}
      </Line>
      <Line>Detail rows: see Portfolio monitor / Portfolio tab</Line>
      <Line>No synthetic holdings shown</Line>
    </WidgetShell>
  );
}

export function AlertsSummaryWidget() {
  const { snapshot, retry } = useInvestmentDashboardData();
  const risk = snapshot?.riskSummary;
  const factors = risk?.data?.factors ?? [];
  return (
    <WidgetShell title="Alerts" meta={risk} onRetry={retry}>
      {factors.length === 0 ? (
        <Line>NO_ALERTS / NO_DATA</Line>
      ) : (
        factors.slice(0, 5).map((f) => <Line key={f}>{f}</Line>)
      )}
      <Line>Live alert stream: Portfolio monitor below</Line>
    </WidgetShell>
  );
}

export function AiStatusWidget() {
  const { snapshot, retry } = useInvestmentDashboardData();
  const brain = snapshot?.brainStatus;
  return (
    <WidgetShell title="AI Status" meta={brain} onRetry={retry}>
      <Line>Brain: {brain?.data.status ?? "IDLE"}</Line>
      <Line>Committee: {snapshot?.committeeSummary?.data?.status ?? snapshot?.committeeSummary?.state ?? "IDLE"}</Line>
      <Line>Mode: ANALYSIS_ONLY</Line>
    </WidgetShell>
  );
}

export function RecentActivityWidget() {
  const { snapshot, retry } = useInvestmentDashboardData();
  const section = snapshot?.recentDecisions;
  const runtime = snapshot?.runtimeHealth?.data;
  const rows = section?.data ?? [];
  return (
    <WidgetShell title="Recent Activity" meta={section} onRetry={retry}>
      <Line>
        Last eval:{" "}
        {runtime?.lastEvaluatedAt
          ? new Date(runtime.lastEvaluatedAt).toLocaleString()
          : "NO_DATA"}
      </Line>
      <Line>Evaluations: {runtime?.evaluationCount ?? 0}</Line>
      {rows.length === 0 ? (
        <Line>NO_DATA</Line>
      ) : (
        rows.slice(0, 4).map((item) => (
          <Line key={item.label}>
            {item.label}
            {item.at ? ` · ${new Date(item.at).toLocaleString()}` : ""}
          </Line>
        ))
      )}
    </WidgetShell>
  );
}

export function RiskSummaryWidget() {
  const { snapshot, retry } = useInvestmentDashboardData();
  const section = snapshot?.riskSummary;
  const data = section?.data;
  return (
    <WidgetShell title="Risk Summary" meta={section} onRetry={retry}>
      <Line>Level: {data?.level ?? "NO_DATA"}</Line>
      <Line>Concentration: {fmtPct(data?.concentrationRiskPct)}</Line>
      <Line>Liquidity: {fmtPct(data?.liquidityRiskPct)}</Line>
      <Line>Expected drawdown: {fmtPct(data?.expectedDrawdownPct)}</Line>
      <Line>
        Factors:{" "}
        {data?.factors && data.factors.length > 0 ? data.factors.slice(0, 3).join(" · ") : "NO_DATA"}
      </Line>
    </WidgetShell>
  );
}

export function CommitteeSummaryWidget() {
  const { snapshot, retry } = useInvestmentDashboardData();
  const section = snapshot?.committeeSummary;
  const data = section?.data;
  return (
    <WidgetShell title="Committee Summary" meta={section} onRetry={retry}>
      <Line>Status: {data?.status ?? section?.state ?? "IDLE"}</Line>
      <Line>Recommendation: {data?.recommendation ?? "NO_DATA"}</Line>
      <Line>
        Confidence:{" "}
        {typeof data?.confidence === "number" ? fmtPct(data.confidence * 100) : "NO_DATA"}
      </Line>
      <Line>
        Reasoning:{" "}
        {data?.reasoning && data.reasoning.length > 0
          ? data.reasoning.slice(0, 2).join(" · ")
          : "NO_DATA"}
      </Line>
    </WidgetShell>
  );
}

export function SignalsWidget() {
  const { snapshot, retry } = useInvestmentDashboardData();
  const section = snapshot?.recentSignals;
  const rows = section?.data ?? [];
  return (
    <WidgetShell title="Signals" meta={section} onRetry={retry}>
      {rows.length === 0 ? (
        <Line>NO_DATA</Line>
      ) : (
        rows.slice(0, 5).map((s) => (
          <Line key={`${s.name}-${s.direction}-${s.strength}`}>
            {s.name ?? "signal"} {s.direction ?? "?"} ({s.strength ?? "?"}) {s.timeframe ?? ""}
          </Line>
        ))
      )}
    </WidgetShell>
  );
}

export function ProviderHealthWidget() {
  const { snapshot, retry } = useInvestmentDashboardData();
  const section = snapshot?.providerStatus;
  const data = section?.data;
  return (
    <WidgetShell title="Provider Health" meta={section} onRetry={retry}>
      <Line>Market providers: {data?.marketProviderStatus ?? "NO_DATA"}</Line>
      <Line>Section state: {section?.state ?? "UNAVAILABLE"}</Line>
      <Line>Source: {section?.source ?? "fallback"}</Line>
    </WidgetShell>
  );
}

export function RuntimeHealthWidget() {
  const { snapshot, retry } = useInvestmentDashboardData();
  const section = snapshot?.runtimeHealth;
  const data = section?.data;
  return (
    <WidgetShell title="Runtime Health" meta={section} onRetry={retry}>
      <Line>Monitor: {data?.monitorRunning ? "RUNNING" : "IDLE"}</Line>
      <Line>Evaluations: {data?.evaluationCount ?? 0}</Line>
      <Line>
        Last eval:{" "}
        {data?.lastEvaluatedAt ? new Date(data.lastEvaluatedAt).toLocaleTimeString() : "NO_DATA"}
      </Line>
      <Line>{data?.note ?? "ANALYSIS_ONLY"}</Line>
    </WidgetShell>
  );
}

export function RecentDecisionsWidget() {
  const { snapshot, retry } = useInvestmentDashboardData();
  const section = snapshot?.recentDecisions;
  const rows = section?.data ?? [];
  return (
    <WidgetShell title="Recent Decisions" meta={section} onRetry={retry}>
      {rows.length === 0 ? (
        <Line>NO_DATA</Line>
      ) : (
        rows.slice(0, 5).map((item) => (
          <Line key={item.label}>
            {item.label}
            {item.at ? ` · ${new Date(item.at).toLocaleString()}` : ""}
          </Line>
        ))
      )}
    </WidgetShell>
  );
}

/** Optional SSR seed so first paint is not empty while coordinator boots. */
export function InvestmentDashboardWidgets({
  initialSnapshot,
}: {
  initialSnapshot?: InvestmentDashboardSnapshot | null;
}) {
  void initialSnapshot;
  return (
    <div className={styles.grid} data-panel-id="investment-widgets">
      <BrokerStatusWidget />
      <PortfolioSummaryWidget />
      <AccountLiquidityWidget />
      <RiskSummaryWidget />
      <CommitteeSummaryWidget />
      <SignalsWidget />
      <ActiveOpportunitiesWidget />
      <TopPositionsWidget />
      <AlertsSummaryWidget />
      <AiStatusWidget />
      <ProviderHealthWidget />
      <RuntimeHealthWidget />
      <RecentDecisionsWidget />
      <RecentActivityWidget />
    </div>
  );
}
