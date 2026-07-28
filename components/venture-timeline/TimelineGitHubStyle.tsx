"use client";

import type { TimelineDateGroup } from "@/lib/venture-timeline";
import { TimelineEventCard } from "./TimelineEventCard";

interface TimelineGitHubStyleProps {
  dateGroups: TimelineDateGroup[];
}

export function TimelineGitHubStyle({ dateGroups }: TimelineGitHubStyleProps) {
  return (
    <div className="fhis-vtl-github">
      {dateGroups.map((group) => (
        <section key={group.dateKey} className="fhis-vtl-date-group">
          <div className="fhis-vtl-date-header">
            <span className="fhis-vtl-date-badge">{group.label}</span>
            <span className="fhis-vtl-date-count">
              {group.events.length} evento{group.events.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="fhis-vtl-date-events">
            {group.events.map((event) => (
              <TimelineEventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
