import type { PortfolioQuickViewModel } from "@/src/core/application/portfolio-command-center";

export function PortfolioQuickView({ model }: { model: PortfolioQuickViewModel }) {
  const metrics = [
    ["Ventures", model.totalVentures],
    ["Active", model.activeVentures],
    ["Paused", model.pausedVentures],
    ["At risk", model.atRiskVentures],
    ["Executions", model.activeExecutions],
    ["Blockers", model.blockers],
    ["Approvals", model.approvals],
    ["Actual spend", model.actualSpend],
    ["Estimated spend", model.estimatedSpend],
    ["Known current value", model.knownCurrentValue ?? "UNKNOWN"],
  ] as const;

  return (
    <section className="pcc-quick" aria-label="Quick portfolio view">
      <header className="pcc-headline">
        <p className="pcc-kicker">PROGRAM 6130 · Portfolio Command Center</p>
        <h1>{model.portfolioName}</h1>
        <p>Next milestone: {model.nextMilestone}</p>
      </header>
      <div className="pcc-metrics-grid">
        {metrics.map(([label, value]) => (
          <article key={label} className="mc-card">
            <h2 className="mc-card-title">{label}</h2>
            <p className="pcc-metric-value">{value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
