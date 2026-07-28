import type { PortfolioAlert } from "@/src/core/application/portfolio-command-center";

export function PortfolioAlerts({ alerts }: { alerts: PortfolioAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <section className="mc-card" aria-label="Portfolio alerts">
      <h2 className="mc-card-title">Portfolio alerts</h2>
      <ul className="mc-list">
        {alerts.map((alert) => (
          <li key={alert.id}>
            <strong>[{alert.severity}]</strong> {alert.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
