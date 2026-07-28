import type { PortfolioValueRow } from "@/src/core/application/portfolio-command-center";

export function ValueBoard({ rows }: { rows: PortfolioValueRow[] }) {
  return (
    <section className="pcc-table-wrap" aria-label="Value board">
      <table className="pcc-table">
        <thead>
          <tr>
            <th>Venture</th>
            <th>Stage</th>
            <th>Evidence</th>
            <th>Milestone</th>
            <th>Economics</th>
            <th>Risk</th>
            <th>Confidence</th>
            <th>Recommendation</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.ventureId}>
              <td>{row.ventureName}</td>
              <td>{row.stage}</td>
              <td>{row.evidence}</td>
              <td>{row.milestone}</td>
              <td>{row.economics}</td>
              <td>{row.risk}</td>
              <td>{row.confidence.toFixed(2)}</td>
              <td>{row.recommendation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
