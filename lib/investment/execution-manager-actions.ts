/**
 * Mutation gate for Execution Manager actions.
 * Default posture: ANALYSIS_ONLY — never silently send real broker mutations.
 */

import {
  canAttemptCancel,
  canAttemptModify,
  type ExecutionManagerState,
} from "./execution-manager-status";

export type ExecutionMutationAction = "cancel" | "modify" | "duplicate";

export type ExecutionSafetyFlags = {
  readonly mode: "ANALYSIS_ONLY";
  readonly liveTradingEnabled: boolean;
  readonly liveTradingEnabledValue: string;
  readonly ibkrReadOnly: boolean;
  readonly killSwitchEnabled: boolean;
  readonly autonomousLock: "LOCKED" | "ACTIVE";
};

export type MutationGateResult = {
  readonly allowed: false;
  readonly posture: "LOCKED" | "DRY_RUN";
  readonly message: string;
  readonly wouldMutateBroker: false;
};

export function resolveExecutionSafetyFlags(env: {
  readonly LIVE_TRADING_ENABLED?: string;
  readonly IBKR_READ_ONLY?: string;
  readonly killSwitchEnabled?: boolean;
}): ExecutionSafetyFlags {
  const liveTradingEnabledValue = env.LIVE_TRADING_ENABLED ?? process.env.LIVE_TRADING_ENABLED ?? "false";
  const ibkrReadOnlyRaw = env.IBKR_READ_ONLY ?? process.env.IBKR_READ_ONLY ?? "true";
  const liveTradingEnabled = liveTradingEnabledValue === "true";
  const ibkrReadOnly = ibkrReadOnlyRaw !== "false";
  return {
    mode: "ANALYSIS_ONLY",
    liveTradingEnabled,
    liveTradingEnabledValue,
    ibkrReadOnly,
    killSwitchEnabled: Boolean(env.killSwitchEnabled),
    autonomousLock: liveTradingEnabled && !ibkrReadOnly ? "ACTIVE" : "LOCKED",
  };
}

export function isMutationLocked(flags: ExecutionSafetyFlags): boolean {
  return (
    flags.mode === "ANALYSIS_ONLY" ||
    !flags.liveTradingEnabled ||
    flags.ibkrReadOnly ||
    flags.killSwitchEnabled ||
    flags.autonomousLock === "LOCKED"
  );
}

/**
 * Cancel / Modify / Duplicate — always dry-run or locked.
 * Never returns allowed:true; broker place/cancel/modify is not wired from this surface.
 */
export function gateExecutionMutation(args: {
  readonly action: ExecutionMutationAction;
  readonly state: ExecutionManagerState;
  readonly flags: ExecutionSafetyFlags;
  readonly orderId?: string | number;
}): MutationGateResult {
  const locked = isMutationLocked(args.flags);
  const posture = locked ? "LOCKED" : "DRY_RUN";

  if (args.action === "cancel" && !canAttemptCancel(args.state)) {
    return {
      allowed: false,
      posture,
      message: `${posture} · CANCEL blocked — order already terminal (${args.state})`,
      wouldMutateBroker: false,
    };
  }
  if (args.action === "modify" && !canAttemptModify(args.state)) {
    return {
      allowed: false,
      posture,
      message: `${posture} · MODIFY blocked — state ${args.state} is not modifiable`,
      wouldMutateBroker: false,
    };
  }

  const idBit = args.orderId != null ? ` · orderId=${args.orderId}` : "";
  if (locked) {
    return {
      allowed: false,
      posture: "LOCKED",
      message: `LOCKED · ${args.action.toUpperCase()} dry-run only — LIVE_TRADING_ENABLED=${args.flags.liveTradingEnabledValue}, IBKR_READ_ONLY=${args.flags.ibkrReadOnly}, ANALYSIS_ONLY${idBit}. No broker mutation.`,
      wouldMutateBroker: false,
    };
  }

  return {
    allowed: false,
    posture: "DRY_RUN",
    message: `DRY_RUN · ${args.action.toUpperCase()} recorded locally only — order path not wired${idBit}. No broker mutation.`,
    wouldMutateBroker: false,
  };
}
