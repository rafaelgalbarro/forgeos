/** @deprecated Legacy wrapper — prefer @/components/ui/fhis/Timeline */
import type { LiveTimelineEvent } from "@/lib/live";
import { ActivityBadge } from "./ActivityBadge";

interface TimelineItemProps {
  event: LiveTimelineEvent;
}

export function TimelineItem({ event }: TimelineItemProps) {
  return (
    <li className="ui-timeline-item">
      <span className="ui-timeline-time">{event.time}</span>
      <div className="ui-timeline-body">
        <ActivityBadge department={event.department} label={event.departmentLabel} />
        <p>{event.message}</p>
        {event.ventureName && <span className="ui-timeline-venture">{event.ventureName}</span>}
      </div>
    </li>
  );
}
