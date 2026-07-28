"use client";

import { Timeline } from "@/components/ui/fhis/Timeline";
import { Badge } from "@/components/ui/fhis/Badge";
import type { PipelineTimelineEvent } from "@/lib/build-pipeline/types";

interface DeploymentTimelineProps {
  events: PipelineTimelineEvent[];
}

function statusVariant(
  status: string
): "default" | "accent" | "amber" | "red" {
  if (status === "completed") return "accent";
  if (status === "blocked" || status === "failed") return "red";
  if (status === "pending" || status === "running") return "amber";
  return "default";
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function DeploymentTimeline({ events }: DeploymentTimelineProps) {
  if (!events.length) {
    return <p className="fhis-text-muted">Sin eventos en la línea temporal.</p>;
  }

  const items = events.map((event) => ({
    title: event.label,
    time: formatTime(event.timestamp),
    description: event.message,
  }));

  return (
    <div>
      <div className="fhis-stack fhis-stack-gap-sm" style={{ marginBottom: 12 }}>
        {events.slice(0, 6).map((event) => (
          <div
            key={event.id}
            style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
          >
            <Badge variant={statusVariant(event.status)}>{event.status}</Badge>
            {event.provider && (
              <Badge variant="blue">{event.provider}</Badge>
            )}
            <span style={{ fontSize: 12, color: "var(--fhis-color-text-muted)" }}>
              {formatTime(event.timestamp)}
            </span>
          </div>
        ))}
      </div>
      <Timeline items={items} />
    </div>
  );
}
