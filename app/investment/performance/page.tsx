import { Suspense } from "react";
import { InvestmentRouteShell } from "@/components/investment/InvestmentRouteShell";
import { EquityCurveChart } from "@/components/investment/EquityCurveChart";
import { getPerformanceSnapshot } from "@/lib/investment/performance-snapshot";
import styles from "@/styles/investment/workspace.module.css";

export const metadata = {
  title: "Performance",
  description: "Performance analytics — ANALYSIS_ONLY.",
};

export const dynamic = "force-dynamic";

function AttributionPanel({
  title,
  label,
  buckets,
  emptyNote,
}: {
  title: string;
  label: string;
  buckets: ReadonlyArray<{ label: string; pnl: number; trades: number }>;
  emptyNote: string;
}) {
  return (
    <article className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>{title}</h2>
        <span className={buckets.length ? styles.monitorOk : styles.monitorWarn}>{label}</span>
      </div>
      {buckets.length === 0 ? (
        <p className={styles.hubNote}>{emptyNote}</p>
      ) : (
        <div className={styles.barChart}>
          {buckets.slice(0, 8).map((b) => {
            const max = Math.max(...buckets.map((x) => Math.abs(x.pnl)), 1);
            const pct = (Math.abs(b.pnl) / max) * 100;
            return (
              <div key={b.label} className={styles.barRow}>
                <span className={styles.barLabel}>{b.label}</span>
                <span className={styles.barTrack}>
                  <span className={styles.barFill} style={{ width: `${pct}%` }} />
                </span>
                <span className={styles.barValue}>
                  {b.pnl.toFixed(2)} · {b.trades}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

export default async function InvestmentPerformancePage() {
  const snap = await getPerformanceSnapshot();

  return (
    <>
      <InvestmentRouteShell
        title="Performance"
        description="PAPER equity + SHADOW hypothetical P&L + attribution. Benchmarks stay NO_DATA unless configured."
        moduleLabel="Portfolio Analytics"
        metrics={[
          {
            label: "Paper P&L",
            value: snap.paper.totalPnl == null ? "NO_DATA" : snap.paper.totalPnl.toFixed(2),
          },
          {
            label: "Win rate",
            value:
              snap.paper.winRate == null ? "NO_DATA" : `${(snap.paper.winRate * 100).toFixed(1)}%`,
          },
          {
            label: "Shadow P&L",
            value:
              snap.shadow.hypotheticalPnl == null
                ? "NO_DATA"
                : snap.shadow.hypotheticalPnl.toFixed(2),
          },
          { label: "Benchmark", value: snap.benchmark.label },
        ]}
        panels={[
          {
            title: "PAPER",
            state: snap.paper.equityCurve.length > 1 ? "READY" : "NO_DATA",
            lines: [
              snap.paper.note,
              `Trades: ${snap.paper.tradeCount}`,
              `Sharpe: ${snap.paper.sharpe == null ? "NO_DATA" : snap.paper.sharpe.toFixed(3)}`,
              `Max DD: ${snap.paper.maxDrawdownPct == null ? "NO_DATA" : `${snap.paper.maxDrawdownPct.toFixed(2)}%`}`,
            ],
          },
          {
            title: "SHADOW",
            state: snap.shadow.equityCurve.length > 1 ? "READY" : "NO_DATA",
            lines: [
              snap.shadow.note,
              `Operations: ${snap.shadow.operationCount}`,
              "Hypothetical only — not real money",
            ],
          },
          {
            title: "Beta / Alpha",
            state: snap.benchmark.beta != null || snap.benchmark.alpha != null ? "READY" : "NO_DATA",
            lines: [
              snap.benchmark.note,
              `Symbol: ${snap.benchmark.symbol ?? "NO_DATA"} · ${snap.benchmark.label}`,
              `Beta: ${snap.benchmark.beta == null ? "NO_DATA" : snap.benchmark.beta.toFixed(3)}`,
              `Alpha: ${snap.benchmark.alpha == null ? "NO_DATA" : snap.benchmark.alpha.toFixed(5)}`,
              `Corr: ${snap.benchmark.correlation == null ? "NO_DATA" : snap.benchmark.correlation.toFixed(3)}`,
              `TE: ${snap.benchmark.trackingError == null ? "NO_DATA" : snap.benchmark.trackingError.toFixed(5)}`,
              `IR: ${snap.benchmark.informationRatio == null ? "NO_DATA" : snap.benchmark.informationRatio.toFixed(3)}`,
              snap.multiBenchmarkNote,
            ],
          },
        ]}
        links={[
          { href: "/investment/compare", label: "Paper vs Shadow →" },
          { href: "/investment/paper", label: "Paper Trading →" },
          { href: "/investment/shadow", label: "Shadow Trading →" },
        ]}
      />

      <Suspense fallback={<p className={styles.hubNote}>Chart loading…</p>}>
        <div className={styles.grid} style={{ marginTop: 12 }}>
          <EquityCurveChart points={snap.paper.equityCurve} label="PAPER equity curve" />
          <EquityCurveChart
            points={snap.shadow.equityCurve}
            label="SHADOW cumulative P&L (hypothetical)"
          />
          <AttributionPanel
            title="PAPER attribution by session"
            label="PAPER"
            buckets={snap.paper.bySession}
            emptyNote="NO_DATA — no PAPER session buckets"
          />
          <AttributionPanel
            title="PAPER attribution by regime"
            label="PAPER"
            buckets={snap.paper.byRegime}
            emptyNote="NO_DATA — no PAPER regime buckets"
          />
          <AttributionPanel
            title="PAPER attribution by symbol"
            label="PAPER"
            buckets={snap.paper.bySymbol}
            emptyNote="NO_DATA — no PAPER symbol buckets"
          />
          <AttributionPanel
            title="SHADOW attribution by symbol"
            label="SHADOW"
            buckets={snap.shadow.bySymbol}
            emptyNote="NO_DATA — no SHADOW symbol buckets"
          />
          <AttributionPanel
            title="SHADOW attribution by strategy"
            label="SHADOW"
            buckets={snap.shadow.byStrategy}
            emptyNote="NO_DATA — no SHADOW strategy tags in memory"
          />
          {snap.benchmarks.map((row) => (
            <article key={row.symbol ?? row.note} className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>
                  Benchmark {row.symbol ?? "NO_DATA"}
                </h2>
                <span className={row.label === "MI" ? styles.monitorOk : styles.monitorWarn}>
                  {row.label}
                </span>
              </div>
              <ul className={styles.panelList}>
                <li>{row.note}</li>
                <li>
                  returns={row.returnCount} · β=
                  {row.beta == null ? "NO_DATA" : row.beta.toFixed(3)} · α=
                  {row.alpha == null ? "NO_DATA" : row.alpha.toFixed(5)}
                </li>
                <li>
                  corr=
                  {row.correlation == null ? "NO_DATA" : row.correlation.toFixed(3)} · TE=
                  {row.trackingError == null ? "NO_DATA" : row.trackingError.toFixed(5)} · IR=
                  {row.informationRatio == null ? "NO_DATA" : row.informationRatio.toFixed(3)}
                </li>
              </ul>
            </article>
          ))}
        </div>
      </Suspense>
    </>
  );
}
