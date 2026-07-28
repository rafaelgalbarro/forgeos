import type { PortfolioHealthSnapshot } from "@/lib/health";
import { MetricCard } from "@/components/ui";

interface VentureHealthPanelProps {
  health: PortfolioHealthSnapshot;
}

export function VentureHealthPanel({ health }: VentureHealthPanelProps) {
  const items = health?.items ?? [];

  return (
    <section className="ceo-health glass">
      <h2>Salud del Portfolio</h2>
      <p className="ceo-section-sub">Vista ejecutiva del estado de tus startups.</p>
      <div className="ceo-health-grid">
        <MetricCard title="Sanas" value={health?.healthy ?? 0} hint="Avance coherente" />
        <MetricCard title="En riesgo" value={health?.atRisk ?? 0} hint="Requieren decisión" />
        <MetricCard title="Bloqueadas" value={health?.blocked ?? 0} hint="Discovery o bloqueo" />
        <MetricCard title="Operando" value={health?.operating ?? 0} hint="Con PRD activo" />
        <MetricCard title="Escalando" value={health?.scaling ?? 0} hint="Lista para crecer" />
      </div>
      {items.length > 0 && (
        <ul className="ceo-health-list">
          {items.slice(0, 5).map((item) => (
            <li key={item.ventureId}>
              <strong>{item.ventureName}</strong>
              <span>{item.categoryLabel}</span>
              <em>{item.reason}</em>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
