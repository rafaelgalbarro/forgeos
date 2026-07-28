import type { VentureWorkspaceSnapshot } from "@/lib/venture-workspace";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Progress } from "@/components/ui/fhis/Progress";
import { Status } from "@/components/ui/fhis/Status";
import { Badge } from "@/components/ui/fhis/Badge";
import { Stack } from "@/components/ui/fhis/Layout";

interface BuildSectionProps {
  data: VentureWorkspaceSnapshot;
}

export function BuildSection({ data }: BuildSectionProps) {
  const buildStatus = data?.buildStatus;
  const items = buildStatus?.items ?? [];

  if (!buildStatus) {
    return (
      <Panel id="build" className="fhis-vws-section">
        <SectionHeader title="Build" subtitle="Estado de construcción — sin detalles de runtime" />
        <p>Sin datos de build disponibles.</p>
      </Panel>
    );
  }

  return (
    <Panel id="build" className="fhis-vws-section">
      <SectionHeader title="Build" subtitle="Estado de construcción — sin detalles de runtime" />
      <div className="fhis-vws-status-row">
        <Status status="active" label={buildStatus.phase} />
        <Badge variant="blue">{buildStatus.progress}% completado</Badge>
      </div>
      <Progress value={buildStatus.progress} label="Progreso del paquete técnico" showValue />
      <Stack gap="sm">
        {items.map((item) => (
          <div key={item.label} className="fhis-vws-build-row">
            <span>{item.label}</span>
            <Badge variant={item.done ? "accent" : "default"}>{item.done ? "Listo" : "Pendiente"}</Badge>
          </div>
        ))}
      </Stack>
    </Panel>
  );
}
