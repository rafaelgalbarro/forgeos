import type { PortfolioMetric } from "@/lib/portfolio";
import { Card } from "@/components/ui/fhis/Card";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { cn } from "@/lib/design-system/cn";

interface PortfolioMetricCardProps {
  metric: PortfolioMetric;
}

export function PortfolioMetricCard({ metric }: PortfolioMetricCardProps) {
  return (
    <Card variant="elevated" padding="md" className={cn("fhis-dashboard-metric-card", metric.pending && "fhis-dashboard-metric-pending")}>
      <KpiBlock label={metric.title} value={metric.value} />
      <span className="fhis-dashboard-metric-explanation">{metric.explanation}</span>
      {metric.microcopy && (
        <span className="fhis-dashboard-metric-microcopy">{metric.microcopy}</span>
      )}
      {metric.trend && <span className="fhis-dashboard-metric-trend">{metric.trend}</span>}
    </Card>
  );
}

interface PortfolioMetricsRowProps {
  metrics: PortfolioMetric[];
}

export function PortfolioMetricsRow({ metrics }: PortfolioMetricsRowProps) {
  return (
    <div className="fhis-dashboard-metrics">
      {metrics.map((metric) => (
        <PortfolioMetricCard key={metric.id} metric={metric} />
      ))}
    </div>
  );
}
