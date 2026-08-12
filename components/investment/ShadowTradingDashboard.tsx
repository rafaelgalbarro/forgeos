import styles from "@/styles/investment/shadow-dashboard.module.css";
import type { ShadowDashboardReadModel } from "./shadow-dashboard.types";

interface Props {
  readonly readModel: ShadowDashboardReadModel;
}

function fmt(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

export function ShadowTradingDashboard({ readModel }: Props) {
  return (
    <section className={styles.root} aria-label="Shadow trading dashboard">
      <header className={styles.header}>
        <h1>Shadow Trading Dashboard</h1>
        <p>Hypothetical execution against real market/account context with hard no-order-send guardrails.</p>
        <div className={styles.badges}>
          <span className={styles.badgeOk}>SHADOW_MODE={String(readModel.safety.shadowMode)}</span>
          <span className={styles.badgeDanger}>
            LIVE_TRADING_ENABLED={String(readModel.safety.liveTradingEnabled)}
          </span>
          <span className={styles.badgeNeutral}>
            minimumDurationMs={readModel.safety.minimumDurationMs}
          </span>
        </div>
      </header>

      <div className={styles.metrics}>
        <article>
          <h2>Hypothetical P&amp;L</h2>
          <p>{fmt(readModel.hypotheticalPnl)}</p>
        </article>
        <article>
          <h2>Rejected signals</h2>
          <p>{readModel.rejectedSignals.length}</p>
        </article>
        <article>
          <h2>Avoided risk events</h2>
          <p>{readModel.avoidedRisk.length}</p>
        </article>
        <article>
          <h2>Average latency (ms)</h2>
          <p>{fmt(readModel.avgLatencyMs)}</p>
        </article>
      </div>

      <article className={styles.panel}>
        <h2>Hypothetical Operations</h2>
        <ul>
          {readModel.hypotheticalOperations.length === 0 ? (
            <li>NO_DATA</li>
          ) : (
            readModel.hypotheticalOperations.map((row) => (
              <li key={row.signalId}>
                {row.symbol} {row.side} exp:{fmt(row.expectedPrice)} ach:{fmt(row.achievablePrice)} fill:
                {fmt(row.fillPrice)} pnl:{fmt(row.estimatedPnl)} slip:{fmt(row.slippageBps)}bps latency:
                {fmt(row.latencyMs)}ms {row.rejected ? "[REJECTED]" : ""}
              </li>
            ))
          )}
        </ul>
      </article>

      <article className={styles.panel}>
        <h2>Paper vs Shadow Differences</h2>
        <ul>
          {readModel.paperVsRealDifferences.length === 0 ? (
            <li>NO_DATA</li>
          ) : (
            readModel.paperVsRealDifferences.map((item) => <li key={item}>{item}</li>)
          )}
        </ul>
      </article>

      <article className={styles.panel}>
        <h2>Missing Data</h2>
        <ul>
          {readModel.missingDataSummary.length === 0 ? (
            <li>NO_DATA</li>
          ) : (
            readModel.missingDataSummary.map((item) => <li key={item}>{item}</li>)
          )}
        </ul>
      </article>
    </section>
  );
}
