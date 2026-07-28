/**
 * PROGRAM 6040 — Bridge Live Mission → canonical bus without replacing emitter.
 * Keeps Live Mission showing real activity; adds audit/projection trail.
 */

import { registerMissionEventListener } from "@/lib/mission-control/live-mission/event-emitter";
import type { MissionEvent } from "@/lib/mission-control/live-mission/types";
import {
  getSharedCanonicalEventBus,
  type CanonicalEventBus,
} from "../bus";
import { adaptLiveMissionEvent } from "./live-mission-adapter";

export interface LiveMissionBridgeOptions {
  readonly bus?: CanonicalEventBus;
  readonly workspaceId?: string;
  /** Resolve mission id from event metadata or fallback */
  readonly resolveMissionId?: (event: MissionEvent) => string;
}

let wired = false;
let unsubscribe: (() => void) | null = null;

/**
 * Idempotent wire-up — safe to call from Live Mission store / lab pages.
 * Does not invent events; only mirrors real MissionEvent emissions.
 */
export function ensureLiveMissionCanonicalBridge(
  options: LiveMissionBridgeOptions = {}
): () => void {
  if (wired && unsubscribe) return unsubscribe;

  const bus = options.bus ?? getSharedCanonicalEventBus();
  const resolveMissionId =
    options.resolveMissionId ??
    ((event: MissionEvent) => event.metadata?.missionId ?? "mission:unknown");

  unsubscribe = registerMissionEventListener((event) => {
    const missionId = resolveMissionId(event);
    void bus.publish(
      adaptLiveMissionEvent(event, {
        missionId,
        workspaceId: options.workspaceId,
      })
    );
  });
  wired = true;
  return unsubscribe;
}

export function resetLiveMissionCanonicalBridge(): void {
  unsubscribe?.();
  unsubscribe = null;
  wired = false;
}
