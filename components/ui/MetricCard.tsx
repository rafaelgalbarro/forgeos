/** @deprecated Legacy wrapper — prefer @/components/ui/fhis/KpiBlock + Card */
import clsx from "clsx";
import { Card } from "@/components/ui/fhis/Card";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";

interface MetricCardProps {
  title: string;
  value: string | number;
  hint?: string;
  pending?: boolean;
  className?: string;
}

export function MetricCard({ title, value, hint, pending, className }: MetricCardProps) {
  return (
    <Card variant="elevated" padding="md" className={clsx("ui-metric-card", className)}>
      <KpiBlock label={title} value={value} className={pending ? "fhis-dashboard-metric-pending" : undefined} />
      {hint && <span className="ui-metric-hint">{hint}</span>}
    </Card>
  );
}
