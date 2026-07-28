import type { TimelineDepartmentGroup } from "@/lib/venture-timeline";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { TimelineEventCard } from "./TimelineEventCard";

interface TimelineDepartmentGroupProps {
  group: TimelineDepartmentGroup;
}

export function TimelineDepartmentGroupSection({ group }: TimelineDepartmentGroupProps) {
  return (
    <section className="fhis-vtl-dept-group">
      <div className="fhis-vtl-dept-group-header">
        <SectionHeader
          title={group.label}
          subtitle={`${group.events.length} evento${group.events.length === 1 ? "" : "s"}`}
        />
        <Badge variant="accent">{group.department}</Badge>
      </div>
      <div className="fhis-vtl-date-events">
        {group.events.map((event) => (
          <TimelineEventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
}
