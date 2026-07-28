/**
 * PROGRAM 6100 — Preview lifecycle management.
 */

export type PreviewLifecycleState =
  | "PENDING"
  | "STARTING"
  | "READY"
  | "IDLE"
  | "HIBERNATED"
  | "STOPPED"
  | "EXPIRED"
  | "FAILED";

export interface PreviewSession {
  previewId: string;
  missionId: string;
  ventureId: string;
  state: PreviewLifecycleState;
  port?: number;
  startedAt?: string;
  lastActivityAt: string;
  hibernatedAt?: string;
  buildLogs?: string[];
}

const previewSessions = new Map<string, PreviewSession>();
const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const HIBERNATE_TIMEOUT_MS = 30 * 60 * 1000;

export function createPreviewSession(input: {
  previewId: string;
  missionId: string;
  ventureId: string;
  port?: number;
}): PreviewSession {
  const session: PreviewSession = {
    previewId: input.previewId,
    missionId: input.missionId,
    ventureId: input.ventureId,
    state: "PENDING",
    port: input.port,
    lastActivityAt: new Date().toISOString(),
  };
  previewSessions.set(input.previewId, session);
  return session;
}

export function transitionPreview(previewId: string, state: PreviewLifecycleState): PreviewSession | null {
  const session = previewSessions.get(previewId);
  if (!session) return null;
  session.state = state;
  session.lastActivityAt = new Date().toISOString();
  if (state === "HIBERNATED") {
    session.hibernatedAt = session.lastActivityAt;
    session.port = undefined;
  }
  if (state === "READY" || state === "STARTING") {
    session.startedAt = session.lastActivityAt;
  }
  return session;
}

export function touchPreview(previewId: string): void {
  const session = previewSessions.get(previewId);
  if (session) session.lastActivityAt = new Date().toISOString();
}

export function hibernateIdlePreviews(now = Date.now()): string[] {
  const hibernated: string[] = [];
  for (const session of previewSessions.values()) {
    const idle = now - new Date(session.lastActivityAt).getTime();
    if ((session.state === "READY" || session.state === "IDLE") && idle > IDLE_TIMEOUT_MS) {
      session.state = "HIBERNATED";
      session.hibernatedAt = new Date(now).toISOString();
      session.port = undefined;
      hibernated.push(session.previewId);
    }
    if (session.state === "HIBERNATED" && session.hibernatedAt) {
      const hibernatedFor = now - new Date(session.hibernatedAt).getTime();
      if (hibernatedFor > HIBERNATE_TIMEOUT_MS) {
        session.state = "EXPIRED";
      }
    }
  }
  return hibernated;
}

export function reactivatePreview(previewId: string): PreviewSession | null {
  const session = previewSessions.get(previewId);
  if (!session) return null;
  if (session.state === "HIBERNATED" || session.state === "STOPPED" || session.state === "EXPIRED") {
    session.state = "STARTING";
    session.lastActivityAt = new Date().toISOString();
    session.hibernatedAt = undefined;
  }
  return session;
}

export function getPreviewSession(previewId: string): PreviewSession | undefined {
  return previewSessions.get(previewId);
}

export function getActivePreviewCount(ventureId?: string): number {
  let count = 0;
  for (const session of previewSessions.values()) {
    if (ventureId && session.ventureId !== ventureId) continue;
    if (["READY", "STARTING", "IDLE"].includes(session.state)) count += 1;
  }
  return count;
}

export function resetPreviewSessions(): void {
  previewSessions.clear();
}
