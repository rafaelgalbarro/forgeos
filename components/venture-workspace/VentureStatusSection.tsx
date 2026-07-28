import type { VentureWorkspaceSnapshot } from "@/lib/venture-workspace";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Status } from "@/components/ui/fhis/Status";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Grid } from "@/components/ui/fhis/Layout";
import { FounderLifecyclePipeline } from "./FounderLifecyclePipeline";

interface VentureStatusSectionProps {
  data: VentureWorkspaceSnapshot;
}

export function VentureStatusSection({ data }: VentureStatusSectionProps) {
  return (
    <Panel id="estado" className="fhis-vws-section">
      <SectionHeader title="Estado del Venture" subtitle="Vista operativa del ciclo de vida" />
      <div className="fhis-vws-status-row">
        <Status status="active" label={data.currentState} />
        <span style={{ color: "var(--fhis-color-text-muted)" }}>
          Confianza: <strong>{data.confidenceLabel}</strong>
        </span>
      </div>
      <FounderLifecyclePipeline steps={data.founderLifecycle} />
      <Grid cols={3} gap="md">
        <KpiBlock label="Etapa de vida" value={data.lifeStageLabel} />
        <KpiBlock label="Estado" value={data.statusBadgeLabel} />
        <KpiBlock label="Última actualización" value={new Date(data.venture.updatedAt).toLocaleDateString("es-ES")} />
      </Grid>
    </Panel>
  );
}
