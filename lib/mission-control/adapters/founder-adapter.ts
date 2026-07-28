/** Thin adapter — Founder Zero public API. */

export interface FounderMissionResult {
  href: string;
  sessionStarted: boolean;
}

export async function createFounderMission(_idea: string): Promise<FounderMissionResult> {
  if (typeof window !== "undefined") {
    const { writeFounderZeroSession, touchFounderZeroSession } = await import("@/lib/founder-zero");
    const ventureId = `mc-${Date.now().toString(36)}`;
    writeFounderZeroSession({ ventureId, lastRunAt: new Date().toISOString(), runCount: 1 });
    touchFounderZeroSession(ventureId);
  }
  return { href: "/founder", sessionStarted: true };
}

export async function getFounderSnapshotHint(): Promise<{ available: boolean; href: string }> {
  return { available: true, href: "/founder" };
}
