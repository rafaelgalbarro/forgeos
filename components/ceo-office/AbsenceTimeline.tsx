import type { LiveTimelineEvent } from "@/lib/live";
import { TimelineItem } from "@/components/ui";

interface AbsenceTimelineProps {
  events: LiveTimelineEvent[];
}

export function AbsenceTimeline({ events }: AbsenceTimelineProps) {
  return (
    <section className="ceo-absence-timeline glass">
      <h2>Lo que ocurrió mientras no estabas</h2>
      <p className="ceo-section-sub">Tu equipo siguió trabajando en segundo plano.</p>
      {events.length === 0 ? (
        <p className="ceo-empty">Sin actividad reciente todavía.</p>
      ) : (
        <ul className="ui-timeline-list">
          {events.map((event) => (
            <TimelineItem key={event.id} event={event} />
          ))}
        </ul>
      )}
    </section>
  );
}
