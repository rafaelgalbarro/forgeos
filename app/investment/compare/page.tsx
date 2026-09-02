import { InvestmentRouteShell } from "@/components/investment/InvestmentRouteShell";
import { getPaperShadowComparison } from "@/lib/investment/paper-shadow-comparison";
import { getPaperRealComparison } from "@/lib/investment/paper-real-comparison";
import styles from "@/styles/investment/workspace.module.css";

export const metadata = {
  title: "Paper vs Shadow / Real",
  description: "Comparative PAPER vs SHADOW and PAPER vs REAL read-only — ANALYSIS_ONLY.",
};

export const dynamic = "force-dynamic";

function fmt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "NO_DATA";
  return n.toFixed(2);
}

export default async function InvestmentComparePage() {
  const [snap, paperReal] = await Promise.all([
    getPaperShadowComparison(),
    getPaperRealComparison(),
  ]);

  return (
    <>
      <InvestmentRouteShell
        title="Paper vs Shadow"
        description="Comparative report of PAPER fills vs SHADOW hypothetical ops. No real orders."
        moduleLabel="Portfolio Analytics / Compare"
        metrics={[
          {
            label: "Paper P&L",
            value: snap.paper.totalPnl == null ? "NO_DATA" : snap.paper.totalPnl.toFixed(2),
          },
          {
            label: "Shadow P&L",
            value:
              snap.shadow.hypotheticalPnl == null
                ? "NO_DATA"
                : snap.shadow.hypotheticalPnl.toFixed(2),
          },
          { label: "Rows", value: String(snap.rows.length) },
          { label: "Matched", value: String(snap.matchedCount) },
        ]}
        panels={[
          {
            title: "PAPER",
            state: snap.paper.tradeCount ? "READY" : "NO_DATA",
            lines: [`Trades: ${snap.paper.tradeCount}`, `Label: ${snap.paper.label}`],
          },
          {
            title: "SHADOW",
            state: snap.shadow.operationCount ? "READY" : "NO_DATA",
            lines: [
              `Operations: ${snap.shadow.operationCount}`,
              `Label: ${snap.shadow.label}`,
              "Hypothetical only",
            ],
          },
          {
            title: "Safety",
            state: "LOCKED",
            lines: [snap.note, "ANALYSIS_ONLY", "orderExecution disabled"],
          },
        ]}
        links={[
          { href: "/investment/performance", label: "Performance →" },
          { href: "/investment/paper", label: "Paper Trading →" },
          { href: "/investment/shadow", label: "Shadow Trading →" },
          { href: "/api/investment/compare/paper-real", label: "Paper vs Real API →" },
        ]}
      />

      <section className={styles.shellPage} aria-label="Paper vs real" style={{ marginTop: 8 }}>
        <div className={styles.grid}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Paper vs Real (simultaneous)</h2>
              <span className={styles.monitorMetaText}>{paperReal.note.slice(0, 48)}</span>
            </div>
            <ul className={styles.panelList}>
              <li>
                PAPER equity: {fmt(paperReal.paper.endingEquity)} · P&L {fmt(paperReal.paper.totalPnl)} ·
                trades {paperReal.paper.tradeCount} · {paperReal.paper.state}
              </li>
              <li>
                REAL NAV: {fmt(paperReal.real.navUSD)} · cash {fmt(paperReal.real.cashUSD)} · daily P&L{" "}
                {fmt(paperReal.real.dailyPnlUSD)} · positions{" "}
                {paperReal.real.openPositionsCount == null
                  ? "NO_DATA"
                  : String(paperReal.real.openPositionsCount)}{" "}
                · {paperReal.real.state}
              </li>
              <li>
                Δ equity: {fmt(paperReal.deltas.equityDelta)} · Δ pnl: {fmt(paperReal.deltas.pnlDelta)} ·
                Δ positions:{" "}
                {paperReal.deltas.positionCountDelta == null
                  ? "NO_DATA"
                  : String(paperReal.deltas.positionCountDelta)}
              </li>
              <li>{paperReal.real.note}</li>
              <li>{paperReal.deltas.note}</li>
              <li>ANALYSIS_ONLY · orderExecution disabled · no live orders from compare</li>
            </ul>
          </article>
        </div>
      </section>

      <section className={styles.shellPage} aria-label="Paper vs shadow rows" style={{ marginTop: 8 }}>
        <div className={styles.grid}>
          {snap.rows.length === 0 ? (
            <article className={styles.panel}>
              <ul className={styles.panelList}>
                <li>NO_DATA — {snap.note}</li>
              </ul>
            </article>
          ) : (
            snap.rows.slice(0, 50).map((row) => (
              <article key={row.signalId} className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>
                    {row.symbol} · {row.signalId}
                  </h2>
                  <span className={styles.monitorMetaText}>COMPARE</span>
                </div>
                <ul className={styles.panelList}>
                  <li>
                    SHADOW P&L: {row.shadowPnl == null ? "NO_DATA" : row.shadowPnl.toFixed(2)}
                  </li>
                  <li>PAPER P&L: {row.paperPnl == null ? "NO_DATA" : row.paperPnl.toFixed(2)}</li>
                  <li>
                    pnlDelta: {row.pnlDelta == null ? "NO_DATA" : row.pnlDelta.toFixed(2)} ·
                    slipΔbps:{" "}
                    {row.slippageDeltaBps == null ? "NO_DATA" : row.slippageDeltaBps.toFixed(2)} ·
                    fillΔ:{" "}
                    {row.fillPriceDelta == null ? "NO_DATA" : row.fillPriceDelta.toFixed(4)}
                  </li>
                  <li>{row.note}</li>
                </ul>
              </article>
            ))
          )}
        </div>
      </section>
    </>
  );
}
