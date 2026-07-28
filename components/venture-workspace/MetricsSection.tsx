import type { VentureWorkspaceSnapshot } from "@/lib/venture-workspace";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Grid } from "@/components/ui/fhis/Layout";

interface MetricsSectionProps {
  data: VentureWorkspaceSnapshot;
}

export function MetricsSection({ data }: MetricsSectionProps) {
  return (
    <Panel id="metrics" className="fhis-vws-section">
      <SectionHeader title="Metrics" subtitle="Indicadores clave del venture" />
      <Grid cols={2} gap="md">
        {data.metrics.map((m) => (
          <div key={m.label}>
            <KpiBlock label={m.label} value={m.value} />
            <span className="fhis-vpc-score-label">{m.detail}</span>
          </div>
        ))}
      </Grid>
    </Panel>
  );
}
