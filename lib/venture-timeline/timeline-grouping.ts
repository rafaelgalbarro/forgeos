/** Venture Timeline — group events by department or date (Epic 7.3). */

import type { TimelineDateGroup, TimelineDepartment, TimelineDepartmentGroup, TimelineEvent } from "./types";
import { DEPARTMENT_LABELS } from "./event-registry";

const DEPT_ORDER: TimelineDepartment[] = [
  "executive",
  "research",
  "product",
  "engineering",
  "build",
  "qa",
  "growth",
  "finance",
  "capital",
  "memory",
];

export function groupTimelineByDepartment(events: TimelineEvent[]): TimelineDepartmentGroup[] {
  const map = new Map<TimelineDepartment, TimelineEvent[]>();

  for (const event of events) {
    const list = map.get(event.department) ?? [];
    list.push(event);
    map.set(event.department, list);
  }

  return DEPT_ORDER.filter((d) => map.has(d)).map((department) => ({
    department,
    label: DEPARTMENT_LABELS[department],
    events: (map.get(department) ?? []).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ),
  }));
}

export function groupTimelineByDate(events: TimelineEvent[]): TimelineDateGroup[] {
  const map = new Map<string, TimelineEvent[]>();

  for (const event of events) {
    const dateKey = event.timestamp.slice(0, 10);
    const list = map.get(dateKey) ?? [];
    list.push(event);
    map.set(dateKey, list);
  }

  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, groupEvents]) => ({
      dateKey,
      label: formatDateGroupLabel(dateKey),
      events: groupEvents.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    }));
}

function formatDateGroupLabel(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`);
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  if (dateKey === todayKey) return "Hoy";
  if (dateKey === yesterdayKey) return "Ayer";

  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
