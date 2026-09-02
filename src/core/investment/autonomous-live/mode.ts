/**
 * Trading mode + AUTONOMOUS_LIVE lock state.
 * Never auto-unlocks. Flags must remain locked at implementation end.
 */

import type { AutonomousLiveLockState, TradingModeName } from "./domain";

export function resolveTradingMode(raw?: string): TradingModeName {
  const value = (raw ?? process.env.TRADING_MODE ?? "ANALYSIS_ONLY").trim();
  switch (value.toUpperCase()) {
    case "AUTONOMOUS_LIVE":
      return "AUTONOMOUS_LIVE";
    case "ANALYSIS_ONLY":
      return "ANALYSIS_ONLY";
    case "LIVE":
      return "live";
    case "PAPER":
      return "paper";
    default:
      return value.toLowerCase() === "paper" ? "paper" : "ANALYSIS_ONLY";
  }
}

export function isAutonomousLiveMode(mode?: TradingModeName): boolean {
  return (mode ?? resolveTradingMode()) === "AUTONOMOUS_LIVE";
}

/**
 * AUTONOMOUS_LIVE remains LOCKED until certification + explicit human unlock.
 * ACTIVE requires LIVE_TRADING_ENABLED=true AND IBKR_READ_ONLY=false AND no halt —
 * none of which are enabled in this implementation.
 */
export function resolveAutonomousLockState(args?: {
  readonly tradingMode?: TradingModeName;
  readonly liveTradingEnabled?: boolean;
  readonly ibkrReadOnly?: boolean;
  readonly halted?: boolean;
  readonly certificationUnlocked?: boolean;
}): AutonomousLiveLockState {
  const mode = args?.tradingMode ?? resolveTradingMode();
  const liveOn = args?.liveTradingEnabled ?? process.env.LIVE_TRADING_ENABLED === "true";
  const readOnly = args?.ibkrReadOnly ?? process.env.IBKR_READ_ONLY !== "false";
  const halted = args?.halted ?? process.env.EMERGENCY_STOP === "true";
  const certified = args?.certificationUnlocked === true;

  if (halted) return "HALTED";
  if (mode !== "AUTONOMOUS_LIVE") return "LOCKED";
  if (!certified || !liveOn || readOnly) return "LOCKED";
  return "ACTIVE";
}

export function assertFlagsRemainLocked(): void {
  if (process.env.LIVE_TRADING_ENABLED === "true") {
    throw new Error("Safety: LIVE_TRADING_ENABLED must remain false during AUTONOMOUS_LIVE build.");
  }
  if (process.env.IBKR_READ_ONLY === "false") {
    throw new Error("Safety: IBKR_READ_ONLY must remain true during AUTONOMOUS_LIVE build.");
  }
}

export function readSafetyFlags(): {
  readonly tradingMode: TradingModeName;
  readonly liveTradingEnabled: boolean;
  readonly ibkrReadOnly: boolean;
  readonly lockState: AutonomousLiveLockState;
} {
  const tradingMode = resolveTradingMode();
  const liveTradingEnabled = process.env.LIVE_TRADING_ENABLED === "true";
  const ibkrReadOnly = process.env.IBKR_READ_ONLY !== "false";
  return {
    tradingMode,
    liveTradingEnabled,
    ibkrReadOnly,
    lockState: resolveAutonomousLockState({
      tradingMode,
      liveTradingEnabled,
      ibkrReadOnly,
      certificationUnlocked: false,
    }),
  };
}

/** Hard rule: no auto-unlock of production flags. */
export function refuseAutoUnlock(): { unlocked: false; reason: string } {
  return {
    unlocked: false,
    reason: "Auto-unlock forbidden. Human certification unlock required. DO NOT UNLOCK.",
  };
}
