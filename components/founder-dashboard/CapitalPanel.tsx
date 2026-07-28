import Link from "next/link";
import type { FounderCapitalSection } from "@/lib/founder-dashboard/types";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";

interface CapitalPanelProps {
  capital: FounderCapitalSection;
}

const STATUS_LABEL: Record<"ready" | "progress" | "pending", string> = {
  ready: "Listo",
  progress: "En progreso",
  pending: "Pendiente",
};

const STATUS_VARIANT: Record<"ready" | "progress" | "pending", "accent" | "amber" | "default"> = {
  ready: "accent",
  progress: "amber",
  pending: "default",
};

export function CapitalPanel({ capital }: CapitalPanelProps) {
  return (
    <Panel className="fhis-founder-panel" id="founder-capital">
      <SectionHeader title="Capital" subtitle={capital.headline} />
      <div className="fhis-founder-capital-summary">
        <KpiBlock label="Preparación del portfolio" value={`${capital.portfolioScore}%`} />
        <p className="fhis-founder-prose">{capital.portfolioLabel}</p>
      </div>

      {capital.aggregateMetrics.length > 0 && (
        <ul className="fhis-founder-capital-metrics">
          {capital.aggregateMetrics.map((m) => (
            <li key={m.id} className="fhis-founder-capital-metric">
              <div className="fhis-founder-capital-metric-head">
                <span>{m.label}</span>
                <Badge variant={STATUS_VARIANT[m.status]}>{STATUS_LABEL[m.status]}</Badge>
              </div>
              <div className="fhis-founder-progress" aria-hidden>
                <div
                  className="fhis-founder-progress-bar"
                  style={{ width: `${m.maxScore > 0 ? (m.score / m.maxScore) * 100 : 0}%` }}
                />
              </div>
              <span className="fhis-founder-capital-detail">{m.detail}</span>
            </li>
          ))}
        </ul>
      )}

      {capital.ventures.length > 0 && (
        <ul className="fhis-founder-list fhis-founder-capital-ventures">
          {capital.ventures.map((v) => (
            <li key={v.id}>
              <Link href={v.href} className="fhis-founder-capital-venture">
                <strong>{v.name}</strong>
                <span>{v.overallScore}% — {v.overallLabel}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
