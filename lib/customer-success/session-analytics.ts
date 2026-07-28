import type { SessionSummary } from "./types";
import { readStorage, writeStorage } from "@/lib/design-partners/storage";

const SESSION_KEY = "forgeos-cs-sessions";

interface SessionRecord {
  id: string;
  startedAt: string;
  endedAt?: string;
  pageViews: number;
  path: string;
}

let memorySessions: SessionRecord[] = [];

function read(): SessionRecord[] {
  if (typeof window === "undefined") return memorySessions;
  const stored = readStorage<SessionRecord[]>(SESSION_KEY, []);
  memorySessions = stored;
  return memorySessions;
}

function write(sessions: SessionRecord[]): void {
  memorySessions = sessions;
  writeStorage(SESSION_KEY, sessions);
}

export function trackSessionPageView(path: string): void {
  if (typeof window === "undefined") return;
  const sessions = read();
  const active = sessions.find((s) => !s.endedAt);
  const now = new Date().toISOString();

  if (active) {
    active.pageViews += 1;
    active.path = path;
    write(sessions);
    return;
  }

  write([
    ...sessions,
    {
      id: `sess-${Date.now()}`,
      startedAt: now,
      pageViews: 1,
      path,
    },
  ]);
}

export function endCurrentSession(): void {
  const sessions = read();
  const active = sessions.find((s) => !s.endedAt);
  if (!active) return;
  active.endedAt = new Date().toISOString();
  write(sessions);
}

export function getSessionSummary(): SessionSummary {
  const sessions = read();

  if (sessions.length === 0) {
    return {
      sessionCount: 0,
      avgDurationMinutes: 0,
      bounceRate: 0,
      pagesPerSession: 0,
    };
  }

  const durations = sessions
    .filter((s) => s.endedAt)
    .map((s) => (new Date(s.endedAt!).getTime() - new Date(s.startedAt).getTime()) / 60000);

  const avgDurationMinutes =
    durations.length > 0
      ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
      : 2.5;

  const bounces = sessions.filter((s) => s.pageViews <= 1).length;
  const bounceRate = Math.round((bounces / sessions.length) * 100);
  const pagesPerSession =
    Math.round((sessions.reduce((sum, s) => sum + s.pageViews, 0) / sessions.length) * 10) / 10;

  return {
    sessionCount: sessions.length,
    avgDurationMinutes,
    bounceRate,
    pagesPerSession,
  };
}
