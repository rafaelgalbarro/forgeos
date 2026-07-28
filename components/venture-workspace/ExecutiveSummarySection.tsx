import type { VentureWorkspaceSnapshot } from "@/lib/venture-workspace";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { formatVentureType } from "@/lib/portfolio/venture-status";

interface ExecutiveSummarySectionProps {
  data: VentureWorkspaceSnapshot;
}

export function ExecutiveSummarySection({ data }: ExecutiveSummarySectionProps) {
  const { venture } = data;
  return (
    <Panel id="resumen" className="fhis-vws-section">
      <SectionHeader title="Resumen Ejecutivo" subtitle={formatVentureType(venture.category)} />
      <p className="fhis-vws-prose">{data.executiveSummary}</p>
      <div className="fhis-vws-tags">
        <Badge variant="default">{venture.targetAudience}</Badge>
        {venture.analysis?.tags?.slice(0, 4).map((t) => (
          <Badge key={t.id} variant="blue">
            {t.label}
          </Badge>
        ))}
      </div>
    </Panel>
  );
}
