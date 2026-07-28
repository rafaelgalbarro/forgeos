"use client";

import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import type { TimelineEvent } from "@/lib/mission-control/types";

interface Props {
  events: TimelineEvent[];
}

export function MissionTimeline({ events }: Props) {
  if (!events.length) return null;

  return (
    <Panel className="fhis-mc-timeline" style={{ padding: 12 }}>
      <SectionHeader title="Timeline" subtitle="Eventos en vivo" />
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {events.slice(0, 10).map((ev) => (
          <li
            key={ev.id}
            style={{
              display: "flex",
              gap: 8,
              padding: "6px 0",
              borderBottom: "1px solid var(--fhis-color-border)",
              fontSize: "0.8125rem",
            }}
          >
            <span style={{ color: "var(--fhis-color-text-muted)", minWidth: 48 }}>{ev.timestamp}</span>
            <span>{ev.icon ?? "•"}</span>
            <span>{ev.label}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
