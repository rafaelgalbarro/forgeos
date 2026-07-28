import type { VentureWorkspaceSnapshot } from "@/lib/venture-workspace";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Stack } from "@/components/ui/fhis/Layout";

interface MemorySectionProps {
  data: VentureWorkspaceSnapshot;
}

export function MemorySection({ data }: MemorySectionProps) {
  const { memory } = data;
  return (
    <Panel id="memory" className="fhis-vws-section">
      <SectionHeader title="Memory" subtitle="Resumen de memoria del venture — alto nivel" />
      <p className="fhis-vws-prose">{memory.headline}</p>
      {memory.milestones.length > 0 && (
        <Stack gap="sm">
          <strong>Hitos</strong>
          {memory.milestones.map((m) => (
            <div key={m} className="fhis-vws-memory-row">
              <Badge variant="accent">◆</Badge>
              <span>{m}</span>
            </div>
          ))}
        </Stack>
      )}
      {memory.decisions.length > 0 && (
        <Stack gap="sm">
          <strong>Decisiones</strong>
          {memory.decisions.map((d, i) => (
            <p key={i} className="fhis-vws-prose" style={{ margin: 0 }}>
              {d}
            </p>
          ))}
        </Stack>
      )}
      {memory.learnings.length > 0 && (
        <Stack gap="sm">
          <strong>Aprendizajes</strong>
          {memory.learnings.map((l, i) => (
            <p key={i} className="fhis-vws-prose" style={{ margin: 0 }}>
              {l}
            </p>
          ))}
        </Stack>
      )}
    </Panel>
  );
}
