import type { PortfolioExecutionRow } from "@/src/core/application/portfolio-command-center";

export function ExecutionBoard({ rows }: { rows: PortfolioExecutionRow[] }) {
  const grouped = {
    running: rows.filter((r) => r.status === "running"),
    queued: rows.filter((r) => r.status === "queued"),
    paused: rows.filter((r) => r.status === "paused"),
    blocked: rows.filter((r) => r.status === "blocked"),
    failed: rows.filter((r) => r.status === "failed"),
    completed: rows.filter((r) => r.status === "completed"),
  };

  return (
    <section className="pcc-board" aria-label="Execution board">
      {Object.entries(grouped).map(([status, items]) => (
        <article key={status} className="mc-card">
          <h3 className="mc-card-title">
            {status.toUpperCase()} ({items.length})
          </h3>
          <ul className="mc-list">
            {items.map((row) => (
              <li key={row.id}>
                {row.ventureName} · {row.priority}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
