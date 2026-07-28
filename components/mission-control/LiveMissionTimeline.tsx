"use client";

import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import type { MissionEvent } from "@/lib/mission-control/live-mission/types";
import type { TimelineEvent } from "@/lib/mission-control/types";
import type { LiveMissionUIEvent, LiveMissionUIEventType } from "@/lib/live-mission/types";
import { visibleStateLabel } from "@/lib/live-mission/live-mission-selector";

interface Props {
  events: MissionEvent[];
  timeline?: TimelineEvent[];
  uiEvents?: LiveMissionUIEvent[];
}

const UI_EVENT_ICONS: Partial<Record<LiveMissionUIEventType, string>> = {
  mission_created: "🚀",
  stage_started: "→",
  department_started: "🏢",
  task_queued: "📋",
  task_running: "⚙️",
  artifact_created: "📄",
  decision_requested: "❓",
  approval_required: "🔒",
  task_completed: "✅",
  task_failed: "⛔",
  stage_completed: "✅",
  mission_paused: "⏸️",
  mission_resumed: "▶️",
};

function eventIcon(ev: MissionEvent | TimelineEvent | LiveMissionUIEvent): string {
  if ("type" in ev && ev.type in UI_EVENT_ICONS) {
    return UI_EVENT_ICONS[ev.type as LiveMissionUIEventType] ?? "•";
  }
  if ("icon" in ev && ev.icon) return ev.icon;
  if ("type" in ev) {
    const icons: Record<string, string> = {
      user_message: "👤",
      ceo_response: "🎯",
      intention_classified: "💡",
      phase_advance: "→",
      factory_step: "🏭",
      deploy_stub: "☁️",
      decision_resolved: "⚖️",
      risk_detected: "⚠️",
      discovery: "🔍",
      execution: "⚙️",
      approval_required: "🔒",
      autonomous_paused: "⏸️",
      autonomous_resumed: "▶️",
    };
    return icons[ev.type as string] ?? "•";
  }
  return "•";
}

function formatEventTime(ts: string): string {
  if (/^\d{1,2}:\d{2}$/.test(ts)) return ts;
  try {
    return new Date(ts).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return ts;
  }
}

function uiEventTypeLabel(type: LiveMissionUIEventType): string {
  return type.replace(/_/g, " ");
}

export function LiveMissionTimeline({ events, timeline = [], uiEvents = [] }: Props) {
  const merged: Array<{
    id: string;
    timestamp: string;
    label: string;
    icon: string;
    uiType?: LiveMissionUIEventType;
  }> = [];

  for (const ev of uiEvents) {
    merged.push({
      id: ev.id,
      timestamp: formatEventTime(ev.timestamp),
      label: ev.label,
      icon: eventIcon(ev),
      uiType: ev.type,
    });
  }

  for (const ev of events) {
    if (!merged.some((m) => m.id === ev.id)) {
      merged.push({ id: ev.id, timestamp: formatEventTime(ev.timestamp), label: ev.label, icon: eventIcon(ev) });
    }
  }
  for (const tl of timeline) {
    if (!merged.some((m) => m.label === tl.label && m.timestamp === formatEventTime(tl.timestamp))) {
      merged.push({ id: tl.id, timestamp: formatEventTime(tl.timestamp), label: tl.label, icon: eventIcon(tl) });
    }
  }

  if (!merged.length) return null;

  return (
    <Panel className="fhis-mc-live-timeline" style={{ padding: 12 }}>
      <SectionHeader title="Live Timeline" subtitle="Eventos cronológicos en vivo" />
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexWrap: "wrap",
          gap: 0,
        }}
      >
        {merged.slice(0, 20).map((ev, i) => (
          <li
            key={ev.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 12px",
              borderRight: i < merged.length - 1 ? "1px solid var(--fhis-color-border)" : undefined,
              fontSize: "0.8125rem",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ color: "var(--fhis-color-text-muted)", fontVariantNumeric: "tabular-nums" }}>
              {ev.timestamp}
            </span>
            <span>{ev.icon}</span>
            <span>{ev.label}</span>
            {ev.uiType && (
              <span className="fhis-badge fhis-badge-default" style={{ fontSize: "0.65rem" }}>
                {uiEventTypeLabel(ev.uiType)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
