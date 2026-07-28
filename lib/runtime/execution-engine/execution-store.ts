/** ForgeOS Execution Engine — in-memory session store (Epic 4.5). */

import type { ExecutionSession } from "./types";

export class ExecutionStore {
  private sessions = new Map<string, ExecutionSession>();
  private byVenture = new Map<string, Set<string>>();

  add(session: ExecutionSession): void {
    this.sessions.set(session.sessionId, session);
    let ids = this.byVenture.get(session.ventureId);
    if (!ids) {
      ids = new Set();
      this.byVenture.set(session.ventureId, ids);
    }
    ids.add(session.sessionId);
  }

  update(sessionId: string, patch: Partial<ExecutionSession>): ExecutionSession | null {
    const existing = this.sessions.get(sessionId);
    if (!existing) return null;
    const updated = { ...existing, ...patch };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  get(sessionId: string): ExecutionSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  list(ventureId?: string): ExecutionSession[] {
    if (!ventureId) {
      return [...this.sessions.values()].sort((a, b) =>
        b.startedAt.localeCompare(a.startedAt),
      );
    }
    const ids = this.byVenture.get(ventureId);
    if (!ids) return [];
    return [...ids]
      .map((id) => this.sessions.get(id)!)
      .filter(Boolean)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  getActive(): ExecutionSession[] {
    return this.list().filter((s) => s.status === "ACTIVE");
  }

  clear(): void {
    this.sessions.clear();
    this.byVenture.clear();
  }
}

export function nextSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
