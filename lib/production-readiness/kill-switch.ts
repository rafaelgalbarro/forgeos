/** Program 6500 — Emergency kill switch (env-gated, default off) */

import { isKillSwitchEnabled } from "./config";
import type { KillSwitchState } from "./types";

const AFFECTED_SYSTEMS = [
  "real-ai-execution",
  "real-build-flow",
  "real-connections",
  "stripe-billing",
  "webhook-dispatch",
];

export function getKillSwitchState(): KillSwitchState {
  const enabled = isKillSwitchEnabled();
  return {
    enabled,
    envGated: true,
    affectedSystems: enabled ? AFFECTED_SYSTEMS : [],
    activatedAt: enabled ? process.env.KILL_SWITCH_ACTIVATED_AT : undefined,
    reason: enabled ? process.env.KILL_SWITCH_REASON ?? "Activado vía ENABLE_KILL_SWITCH=true" : undefined,
  };
}

export function wouldBlockSystem(systemId: string): boolean {
  const state = getKillSwitchState();
  return state.enabled && state.affectedSystems.includes(systemId);
}
