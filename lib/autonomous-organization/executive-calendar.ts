/** ForgeOS RC6.5 — executive calendar. */

import type { CalendarEvent } from "./types";
import { getWeeklyBoardMeeting } from "./meeting-engine";

export function getExecutiveCalendar(): CalendarEvent[] {
  const board = getWeeklyBoardMeeting();
  const now = new Date();
  const todayBriefing: CalendarEvent = {
    id: "cal-briefing-today",
    title: "Executive Daily Briefing",
    start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0).toISOString(),
    end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 30).toISOString(),
    departmentId: "ceo",
    type: "briefing",
  };

  return [
    todayBriefing,
    {
      id: "cal-board",
      title: "Weekly Board Meeting",
      start: board.scheduledAt,
      end: new Date(new Date(board.scheduledAt).getTime() + 90 * 60_000).toISOString(),
      type: "meeting",
    },
    {
      id: "cal-rc7-review",
      title: "RC7 scope review",
      start: new Date(now.getTime() + 2 * 86400_000).toISOString(),
      end: new Date(now.getTime() + 2 * 86400_000 + 60 * 60_000).toISOString(),
      departmentId: "build",
      type: "review",
    },
    {
      id: "cal-qa-deadline",
      title: "QA risk mitigation deadline",
      start: new Date(now.getTime() + 86400_000).toISOString(),
      end: new Date(now.getTime() + 86400_000).toISOString(),
      departmentId: "qa",
      type: "deadline",
    },
  ];
}
