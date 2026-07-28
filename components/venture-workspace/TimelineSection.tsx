import type { VentureWorkspaceSnapshot } from "@/lib/venture-workspace";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Timeline } from "@/components/ui/fhis/Timeline";

interface TimelineSectionProps {
  data: VentureWorkspaceSnapshot;
}

export function TimelineSection({ data }: TimelineSectionProps) {
  return (
    <Panel id="timeline" className="fhis-vws-section">
      <SectionHeader title="Timeline" subtitle="Actividad del venture" />
      <Timeline
        items={data.timeline.map((e) => ({
          title: e.title,
          time: e.relative,
          description: e.description,
        }))}
      />
    </Panel>
  );
}
