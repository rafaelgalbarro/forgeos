import Link from "next/link";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import type { PortfolioSnapshot } from "@/lib/ceo-workspace";

interface PortfolioStatusPanelProps {
  portfolio: PortfolioSnapshot;
}

export function PortfolioStatusPanel({ portfolio }: PortfolioStatusPanelProps) {
  return (
    <Panel className="ceo-ws-panel" id="ceo-estado-portfolio">
      <SectionHeader
        title="Estado del portfolio"
        description="Vista consolidada de startups y señales"
      />

      <div className="ceo-ws-kpi-row">
        <KpiBlock label="Startups" value={String(portfolio.ventureCount)} />
        <KpiBlock label="Activas" value={String(portfolio.activeCount)} />
        <KpiBlock label="Prioridad alta" value={String(portfolio.priorityActionCount)} />
      </div>

      <div className="ceo-ws-highlights">
        {portfolio.topVenture && (
          <p>
            <span className="ceo-ws-muted">Top venture:</span>{" "}
            <Link href={portfolio.topVenture.href}>{portfolio.topVenture.name}</Link>
          </p>
        )}
        {portfolio.criticalVenture && (
          <p>
            <span className="ceo-ws-muted">Mayor riesgo:</span>{" "}
            <Link href={portfolio.criticalVenture.href}>{portfolio.criticalVenture.name}</Link>
          </p>
        )}
        {portfolio.promisingVenture && (
          <p>
            <span className="ceo-ws-muted">Mayor potencial:</span>{" "}
            <Link href={portfolio.promisingVenture.href}>{portfolio.promisingVenture.name}</Link>
          </p>
        )}
      </div>

      {portfolio.ventures.length > 0 && (
        <table className="ceo-ws-table">
          <thead>
            <tr>
              <th>Startup</th>
              <th>Estado</th>
              <th>Siguiente paso</th>
              <th>Riesgo</th>
            </tr>
          </thead>
          <tbody>
            {portfolio.ventures.map((v) => (
              <tr key={v.id}>
                <td>
                  <Link href={v.href}>{v.name}</Link>
                </td>
                <td>{v.statusLabel}</td>
                <td>{v.nextAction}</td>
                <td>{v.riskLevel}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
