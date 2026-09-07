import styles from "@/styles/investment/paper-dashboard.module.css";
import type { PaperDashboardReadModel } from "./paper-dashboard.types";

interface Props {
  readonly readModel: PaperDashboardReadModel;
}

export function PaperTradingDashboard({ readModel }: Props) {
  return (
    <section className={styles.root} aria-label="Paper trading dashboard">
      <header className={styles.header}>
        <h1>Paper Trading Dashboard</h1>
        <p>
          Institutional simulated execution — entries, exits, fills, slippage, latency, commissions, stops, and
          certification gates. ANALYSIS_ONLY UI labels retained; no live activation.
        </p>
        <div className={styles.badges}>
          <span className={styles.badgeOk}>TRADING_MODE={readModel.safety.tradingMode}</span>
          <span className={styles.badgeDanger}>
            LIVE_TRADING_ENABLED={String(readModel.safety.liveTradingEnabled)}
          </span>
          <span className={styles.badgeNeutral}>SIMULATED_ONLY=true</span>
          <span className={styles.badgeNeutral}>ANALYSIS_ONLY UI</span>
          <span className={readModel.connected ? styles.badgeOk : styles.badgeNeutral}>
            broker={readModel.connected ? "connected" : "disconnected"}
          </span>
        </div>
      </header>

      <div className={styles.metrics}>
        <article>
          <h2>Total PnL</h2>
          <p>{readModel.performance.totalPnl}</p>
        </article>
        <article>
          <h2>Win rate</h2>
          <p>{readModel.performance.winRate}</p>
        </article>
        <article>
          <h2>Sharpe / Sortino</h2>
          <p>
            {readModel.performance.sharpe} / {readModel.performance.sortino}
          </p>
        </article>
        <article>
          <h2>Max drawdown</h2>
          <p>{readModel.performance.maxDrawdownPct}</p>
        </article>
      </div>

      <div className={styles.twoCol}>
        <article className={styles.panel}>
          <h2>Certification Report</h2>
          <p>
            Status:{" "}
            <strong>{readModel.certification.certified ? "CERTIFIED" : "NOT CERTIFIED"}</strong> · liveTradingEnabled=
            false
          </p>
          <ul>
            {readModel.certification.gates.map((gate) => (
              <li key={gate.name}>
                {gate.passed ? "[PASS]" : "[FAIL]"} {gate.name}: {gate.summary}
              </li>
            ))}
          </ul>
          <ul>
            {readModel.certification.performanceSummary.map((row) => (
              <li key={row.label}>
                {row.label}: {row.value}
              </li>
            ))}
          </ul>
        </article>

        <article className={styles.panel}>
          <h2>Performance Report</h2>
          <ul>
            <li>Trades: {readModel.performance.tradeCount}</li>
            <li>Avg latency: {readModel.performance.averageLatencyMs} ms</li>
            <li>Avg commission: {readModel.performance.averageCommission}</li>
            <li>Avg MAE: {readModel.performance.averageMae}</li>
            <li>Avg MFE: {readModel.performance.averageMfe}</li>
          </ul>
        </article>
      </div>

      <article className={styles.panel}>
        <h2>Open Orders (simulated)</h2>
        <ul>
          {readModel.openOrders.length === 0 ? (
            <li>NO_DATA</li>
          ) : (
            readModel.openOrders.map((order) => (
              <li key={order.id}>
                {order.symbol} {order.side} {order.intent} {order.status} qty:{order.quantity}/
                {order.remainingQuantity} exp:{order.expectedPrice.toFixed(2)} fill:
                {order.executedPrice == null ? "—" : order.executedPrice.toFixed(2)} slip:
                {order.slippage == null ? "—" : order.slippage.toFixed(4)} lat:{order.latencyMs}ms mae:
                {order.mae.toFixed(4)} mfe:{order.mfe.toFixed(4)}
              </li>
            ))
          )}
        </ul>
      </article>

      <article className={styles.panel}>
        <h2>Positions</h2>
        <ul>
          {readModel.positions.length === 0 ? (
            <li>NO_DATA</li>
          ) : (
            readModel.positions.map((pos) => (
              <li key={pos.symbol}>
                {pos.symbol} qty:{pos.quantity} avg:{pos.averageCost.toFixed(2)} realized:
                {pos.realizedPnl.toFixed(2)}
              </li>
            ))
          )}
        </ul>
      </article>

      <article className={styles.panel}>
        <h2>Recent Closed Trades</h2>
        <ul>
          {readModel.recentTrades.length === 0 ? (
            <li>NO_DATA</li>
          ) : (
            readModel.recentTrades.map((trade) => (
              <li key={trade.tradeId}>
                {trade.symbol} qty:{trade.quantity} entry:{trade.entryPrice.toFixed(2)} exit:
                {trade.exitPrice.toFixed(2)} pnl:{trade.pnl.toFixed(2)} mae:{trade.mae.toFixed(4)} mfe:
                {trade.mfe.toFixed(4)} sess:{trade.sessionTag} regime:{trade.regimeTag}{" "}
                {trade.exitReason ?? ""}
              </li>
            ))
          )}
        </ul>
      </article>

      <article className={styles.panel}>
        <h2>Journal</h2>
        <ul>
          {readModel.journal.length === 0 ? (
            <li>NO_DATA</li>
          ) : (
            readModel.journal.map((entry, index) => (
              <li key={`${entry.at}-${entry.type}-${index}`}>
                {entry.at} · {entry.type}
              </li>
            ))
          )}
        </ul>
      </article>
    </section>
  );
}
