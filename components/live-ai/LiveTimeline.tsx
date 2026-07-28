"use client";

import { Badge } from "@/components/ui/fhis/Badge";
import { cn } from "@/lib/design-system/cn";
import type { LiveAiTimelineEvent } from "@/lib/live-ai";
import { SIMULATION_STAGES } from "@/lib/live-ai";

interface Props {
  events: LiveAiTimelineEvent[];
  currentStageId: string | null;
  running: boolean;
}

export function LiveTimeline({ events, currentStageId, running }: Props) {
  const eventByStage = new Map(events.map((e) => [e.stageId, e]));

  return (
    <div className="fhis-live-timeline">
      <div className="fhis-live-timeline-header">
        <strong>Pipeline</strong>
        {running && <Badge variant="accent">En vivo</Badge>}
      </div>
      <div className="fhis-live-timeline-track">
        {SIMULATION_STAGES.map((stage, i) => {
          const evt = eventByStage.get(stage.id);
          const isActive = currentStageId === stage.id;
          const isDone = evt?.status === "done";
          const isPending = !evt;

          return (
            <div key={stage.id} className="fhis-live-timeline-step-wrap">
              <div
                className={cn(
                  "fhis-live-timeline-step",
                  isActive && "fhis-live-timeline-step--active",
                  isDone && "fhis-live-timeline-step--done",
                  isPending && "fhis-live-timeline-step--pending",
                )}
              >
                <div className="fhis-live-timeline-dot" />
                <div className="fhis-live-timeline-label">{stage.label}</div>
                {evt && (
                  <div className="fhis-live-timeline-msg">{evt.message.slice(0, 60)}…</div>
                )}
              </div>
              {i < SIMULATION_STAGES.length - 1 && (
                <div
                  className={cn(
                    "fhis-live-timeline-connector",
                    isDone && "fhis-live-timeline-connector--done",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
