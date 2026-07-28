"use client";

import type { TimelineEvent } from "@/lib/venture-timeline";
import { categoryColor } from "@/lib/venture-timeline";
import { Badge } from "@/components/ui/fhis/Badge";

interface TimelineEventCardProps {
  event: TimelineEvent;
}

export function TimelineEventCard({ event }: TimelineEventCardProps) {
  const dotColor = categoryColor(event.category);
  const time = new Date(event.timestamp).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <article className="fhis-vtl-event">
      <div className="fhis-vtl-event-rail">
        <span className="fhis-vtl-event-dot" style={{ borderColor: dotColor, background: dotColor }} />
        <span className="fhis-vtl-event-line" />
      </div>
      <div className="fhis-vtl-event-body">
        <header className="fhis-vtl-event-header">
          <h3 className="fhis-vtl-event-title">{event.title}</h3>
          <time className="fhis-vtl-event-time" dateTime={event.timestamp}>
            {time}
          </time>
        </header>
        {event.description && (
          <p className="fhis-vtl-event-desc">{event.description}</p>
        )}
        <div className="fhis-vtl-event-meta">
          <Badge variant="default">{event.category}</Badge>
          {event.actor && <Badge variant="accent">{event.actor}</Badge>}
          <Badge variant="blue">{event.source}</Badge>
        </div>
      </div>
    </article>
  );
}
