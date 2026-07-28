import type { VentureWorkspaceSnapshot } from "@/lib/venture-workspace";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Stack } from "@/components/ui/fhis/Layout";

interface ActivitySectionProps {
  data: VentureWorkspaceSnapshot;
}

export function ActivitySection({ data }: ActivitySectionProps) {
  return (
    <Panel id="activity" className="fhis-vws-section">
      <SectionHeader title="Activity" subtitle="Eventos recientes del venture" />
      <Stack gap="sm">
        {data.activity.map((item) => (
          <div key={item.id} className="fhis-vws-activity-row">
            <span>{item.label}</span>
            <Badge variant="default">{item.relative}</Badge>
          </div>
        ))}
      </Stack>
    </Panel>
  );
}
