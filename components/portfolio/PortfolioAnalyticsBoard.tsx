import type { PortfolioAnalyticsBoardModel } from "@/src/core/application/portfolio-command-center";

function BreakdownTable({
  title,
  rows,
}: {
  title: string;
  rows: PortfolioAnalyticsBoardModel["byPosition"];
}) {
  return (
    <section className="pcc-table-wrap" aria-label={title}>
      <h3 className="mc-card-title">{title}</h3>
      <table className="pcc-table">
        <thead>
          <tr>
            <th>Bucket</th>
            <th>Peso</th>
            <th>Riesgo</th>
            <th>Exposicion</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4}>NOT_MEASURED</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={`${title}-${row.key}`}>
                <td>{row.label}</td>
                <td>{row.weight}</td>
                <td>{row.risk}</td>
                <td>{row.exposure}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}

export function PortfolioAnalyticsBoard({ analytics }: { analytics: PortfolioAnalyticsBoardModel }) {
  return (
    <section aria-label="Portfolio analytics dashboard">
      <div className="pcc-metrics-grid">
        {analytics.metrics.map((card) => (
          <article key={card.key} className="mc-card">
            <h2 className="mc-card-title">{card.label}</h2>
            <p className="pcc-metric-value">{card.value}</p>
            <p className="mc-card-body">{card.status}</p>
          </article>
        ))}
      </div>
      <div className="pcc-metrics-grid">
        {analytics.risks.map((card) => (
          <article key={card.key} className="mc-card">
            <h2 className="mc-card-title">{card.label}</h2>
            <p className="pcc-metric-value">{card.value}</p>
            <p className="mc-card-body">{card.status}</p>
          </article>
        ))}
      </div>
      <BreakdownTable title="Peso y riesgo por posicion" rows={analytics.byPosition} />
      <BreakdownTable title="Riesgo por sector" rows={analytics.bySector} />
      <BreakdownTable title="Riesgo por industria" rows={analytics.byIndustry} />
      <BreakdownTable title="Riesgo geografico" rows={analytics.byCountry} />
      <BreakdownTable title="Riesgo divisa" rows={analytics.byCurrency} />
    </section>
  );
}
