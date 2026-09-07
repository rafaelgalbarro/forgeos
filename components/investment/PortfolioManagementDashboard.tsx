"use client";

import { useEffect, useRef, useState } from "react";
import { EquityCurveChart } from "@/components/investment/EquityCurveChart";
import { LivePositionPnlPanel } from "@/components/investment/LivePositionPnlPanel";
import { LongTermPortfolioPanel } from "@/components/investment/LongTermPortfolioPanel";
import { PortfolioMonitorLive } from "@/components/investment/PortfolioMonitorLive";
import { useInvestmentDashboardData } from "@/components/investment/dashboard-data-coordinator";
import {
  AllocationHeatmap,
  AllocationPieChart,
  AllocationTimeline,
  AllocationTreemap,
} from "@/components/investment/portfolio-allocation-charts";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import type {
  MetricDisplay,
  PortfolioManagementSnapshot,
} from "@/lib/investment/portfolio-management.types";
import styles from "@/styles/investment/portfolio-management.module.css";

const POLL_CONNECTED_MS = 10_000;
const POLL_DISCONNECTED_MS = 45_000;

function fmtNum(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "NO_DATA";
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function pnlClass(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n === 0) return "";
  return n > 0 ? styles.pnlPos : styles.pnlNeg;
}

function MetricCard({ metric }: { metric: MetricDisplay }) {
  return (
    <article className={styles.metricCard}>
      <p className={styles.metricLabel}>{metric.label}</p>
      <p
        className={`${styles.metricValue} ${
          metric.status === "NO_DATA" ? styles.metricValueNodata : ""
        } ${pnlClass(metric.value)}`}
      >
        {metric.display}
      </p>
      {metric.note && metric.status === "NO_DATA" ? (
        <p className={styles.metricNote}>{metric.note}</p>
      ) : null}
    </article>
  );
}

function mergeAccountOverlay(
  snap: PortfolioManagementSnapshot,
  dashboard: ReturnType<typeof useInvestmentDashboardData>["snapshot"],
): PortfolioManagementSnapshot {
  if (!dashboard) return snap;
  const account = dashboard.accountSummary?.data;
  const portfolio = dashboard.portfolioSummary?.data;
  if (!account && !portfolio) return snap;
  const overlayStatus = snap.dataSource === "DEMO" ? "ESTIMATED" : "MEASURED";

  const patchMetric = (
    current: MetricDisplay,
    value: number | undefined,
    label = current.label,
  ): MetricDisplay => {
    if (typeof value !== "number" || !Number.isFinite(value)) return current;
    return {
      ...current,
      label,
      value,
      display: value.toLocaleString("en-US", { maximumFractionDigits: 2 }),
      status: overlayStatus,
    };
  };

  return {
    ...snap,
    summary: {
      ...snap.summary,
      portfolioValue: patchMetric(
        snap.summary.portfolioValue,
        account?.netLiquidation ?? portfolio?.totalValue,
      ),
      cash: patchMetric(snap.summary.cash, account?.totalCashValue),
      buyingPower: patchMetric(snap.summary.buyingPower, account?.buyingPower),
      capitalLibre: patchMetric(
        snap.summary.capitalLibre,
        account?.totalCashValue ?? snap.summary.capitalLibre.value ?? undefined,
      ),
      positionCount:
        typeof portfolio?.positionCount === "number"
          ? {
              ...snap.summary.positionCount,
              value: portfolio.positionCount,
              display: String(portfolio.positionCount),
              status: overlayStatus,
            }
          : snap.summary.positionCount,
    },
    baseCurrency:
      snap.baseCurrency !== "UNKNOWN"
        ? snap.baseCurrency
        : account?.currency ?? portfolio?.baseCurrency ?? snap.baseCurrency,
  };
}

/**
 * Professional portfolio management UI — ANALYSIS_ONLY / read-only.
 * Polls /api/investment/portfolio + reuses dashboard coordinator for account overlays.
 * Never places orders.
 */
export function PortfolioManagementDashboard() {
  const { snapshot: dashboard, refreshing, lastFetchedAt, retry } =
    useInvestmentDashboardData();
  const brokerConnected = Boolean(dashboard?.brokerStatus?.data?.connected);
  const [payload, setPayload] = useState<PortfolioManagementSnapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function refresh() {
      if (inFlight.current) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      inFlight.current = true;
      try {
        const result = await safeJsonFetch<PortfolioManagementSnapshot & { error?: string }>(
          "/api/investment/portfolio",
          { cache: "no-store" },
        );
        if (cancelled) return;
        if (!result.ok || !result.data) {
          setError(result.error ?? "Portfolio refresh failed");
          return;
        }
        if (!result.data.summary || !result.data.risk || !result.data.allocations) {
          setError(result.data.error ?? "NO_DATA — incomplete portfolio snapshot");
          return;
        }
        setPayload(result.data);
        setError(result.data.error ?? "");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Portfolio refresh failed");
        }
      } finally {
        inFlight.current = false;
        if (!cancelled) setLoading(false);
      }
    }

    void refresh();
    const interval = brokerConnected ? POLL_CONNECTED_MS : POLL_DISCONNECTED_MS;
    timer = setInterval(() => {
      if (cancelled) return;
      if (document.visibilityState === "hidden") return;
      void refresh();
    }, interval);

    function onVisibility() {
      if (document.visibilityState === "visible") void refresh();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [brokerConnected]);

  const base = payload;
  const snap = base ? mergeAccountOverlay(base, dashboard) : null;

  const summaryMetrics: MetricDisplay[] = snap
    ? [
        snap.summary.portfolioValue,
        snap.summary.pnlDaily,
        snap.summary.pnlWeekly,
        snap.summary.pnlMonthly,
        snap.summary.pnlAnnual,
        snap.summary.cash,
        snap.summary.buyingPower,
        snap.summary.capitalInvested,
        snap.summary.capitalLibre,
        snap.summary.unrealizedPnl,
        snap.summary.positionCount,
      ]
    : [];

  const riskMetrics: MetricDisplay[] = snap
    ? [
        snap.risk.var95,
        snap.risk.drawdown,
        snap.risk.sharpe,
        snap.risk.sortino,
        snap.risk.calmar,
        snap.risk.volatility,
        snap.risk.beta,
        snap.risk.correlations,
        snap.risk.concentration,
        snap.risk.stressTest,
      ]
    : [];

  return (
    <div className={styles.page} data-panel-id="portfolio-management">
      <div className={styles.metaBar}>
        <div className={styles.metaLeft}>
          <span className={styles.badge}>ANALYSIS_ONLY</span>
          <span className={brokerConnected ? styles.badge : styles.badgeWarn}>
            {brokerConnected ? "IBKR CONNECTED" : "IBKR IDLE"}
          </span>
          <span className={styles.metaText}>
            {snap?.dataSource ?? "LOADING"} · {snap?.baseCurrency ?? "—"}
          </span>
        </div>
        <div className={styles.metaRight}>
          <span className={styles.metaText}>
            {loading || refreshing ? "Refreshing…" : (snap?.dataSource ?? "UNAVAILABLE")}
            {lastFetchedAt ? ` · dash ${new Date(lastFetchedAt).toLocaleTimeString()}` : ""}
            {snap?.generatedAt
              ? ` · port ${new Date(snap.generatedAt).toLocaleTimeString()}`
              : ""}
          </span>
          <button
            type="button"
            className={styles.retryBtn}
            onClick={() => {
              retry();
              void safeJsonFetch("/api/investment/portfolio", { cache: "no-store" }).then((r) => {
                if (r.ok && r.data) setPayload(r.data as PortfolioManagementSnapshot);
              });
            }}
          >
            Retry
          </button>
        </div>
      </div>

      {error ? <p className={styles.errorText}>{error}</p> : null}

      <section className={styles.section} aria-label="Summary metrics">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Resumen de cartera</h2>
          <p className={styles.sectionNote}>
            {snap?.note ?? "Waiting for first portfolio snapshot…"}
          </p>
        </div>
        {snap ? (
          <div className={styles.metricsGrid}>
            {summaryMetrics.map((m) => (
              <MetricCard key={m.label} metric={m} />
            ))}
          </div>
        ) : (
          <p className={styles.chartEmpty}>NO_DATA — loading portfolio summary…</p>
        )}
        {snap?.committeeRecommendation ? (
          <p className={styles.sectionNote} style={{ marginTop: 10 }}>
            Recomendación comité: {snap.committeeRecommendation}
          </p>
        ) : null}
      </section>

      {snap ? (
        <LivePositionPnlPanel
          positions={snap.positions}
          portfolioValue={snap.summary.portfolioValue.value}
          equityCurve={snap.equityCurve}
          generatedAt={snap.generatedAt}
        />
      ) : null}

      <section className={styles.section} aria-label="Allocation distribution">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Distribución / Allocation</h2>
          <p className={styles.sectionNote}>Pie · Treemap · Heatmap · Timeline</p>
        </div>
        {snap ? (
          <div className={styles.chartsGrid}>
            <AllocationPieChart title="Sectores" buckets={snap.allocations.bySector} />
            <AllocationTreemap title="Países" buckets={snap.allocations.byCountry} />
            <AllocationHeatmap title="Divisas" buckets={snap.allocations.byCurrency} />
            <AllocationPieChart title="Mercados (exchange)" buckets={snap.allocations.byMarket} />
            <AllocationTreemap title="Productos (secType)" buckets={snap.allocations.byProduct} />
            <AllocationTimeline title="Equity timeline (return series)" points={snap.equityCurve} />
            <div className={styles.chartPanelFull}>
              <EquityCurveChart points={snap.equityCurve} label="Portfolio equity curve" />
            </div>
          </div>
        ) : (
          <p className={styles.chartEmpty}>NO_DATA</p>
        )}
      </section>

      <section className={styles.section} aria-label="Risk block">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Riesgo</h2>
          <p className={styles.sectionNote}>
            Measured from return series when available — otherwise NO_DATA
          </p>
        </div>
        {snap ? (
          <>
            <div className={styles.riskGrid}>
              {riskMetrics.map((m) => (
                <article key={m.label} className={styles.riskCard}>
                  <p className={styles.riskLabel}>{m.label}</p>
                  <p
                    className={`${styles.riskValue} ${
                      m.status === "NO_DATA" ? styles.metricValueNodata : ""
                    }`}
                  >
                    {m.display}
                  </p>
                </article>
              ))}
            </div>
            <ul className={styles.stressList}>
              {snap.risk.stressLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className={styles.chartEmpty}>NO_DATA</p>
        )}
      </section>

      <section className={styles.section} aria-label="Positions table">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Posiciones</h2>
          <p className={styles.sectionNote}>
            {snap ? `${snap.positions.length} rows · read-only` : "NO_DATA"}
          </p>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Nombre</th>
                <th>Cantidad</th>
                <th>Precio medio</th>
                <th>Precio actual</th>
                <th>Beneficio</th>
                <th>Rentabilidad</th>
                <th>Peso cartera</th>
                <th>Riesgo</th>
                <th>Recomendación IA</th>
              </tr>
            </thead>
            <tbody>
              {!snap || snap.positions.length === 0 ? (
                <tr>
                  <td colSpan={10}>NO_DATA — no open positions</td>
                </tr>
              ) : (
                snap.positions.map((row) => (
                  <tr key={`${row.ticker}-${row.currency}-${row.secType}`}>
                    <td>{row.ticker}</td>
                    <td>{row.name}</td>
                    <td>{fmtNum(row.quantity, 4)}</td>
                    <td>{fmtNum(row.avgPrice)}</td>
                    <td>{fmtNum(row.currentPrice)}</td>
                    <td className={pnlClass(row.pnl)}>{fmtNum(row.pnl)}</td>
                    <td className={pnlClass(row.returnPct)}>
                      {row.returnPct == null ? "NO_DATA" : `${row.returnPct.toFixed(2)}%`}
                    </td>
                    <td>
                      {row.weightPct == null ? "NO_DATA" : `${row.weightPct.toFixed(2)}%`}
                    </td>
                    <td>{row.risk}</td>
                    <td>{row.aiRecommendation}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <PortfolioMonitorLive />

      <LongTermPortfolioPanel />
    </div>
  );
}
