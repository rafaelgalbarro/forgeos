import type { PortfolioResourceRow } from "@/src/core/application/portfolio-command-center";

export function ResourceBoard({ rows }: { rows: PortfolioResourceRow[] }) {
  return (
    <section className="pcc-table-wrap" aria-label="Resource board">
      <table className="pcc-table">
        <thead>
          <tr>
            <th>Resource</th>
            <th>Actual</th>
            <th>Estimated</th>
            <th>Projected</th>
            <th>Limit</th>
            <th>Reserved</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.resourceType}>
              <td>{row.resourceType}</td>
              <td>{row.actual}</td>
              <td>{row.estimated}</td>
              <td>{row.projected}</td>
              <td>{row.limit}</td>
              <td>{row.reserved}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
