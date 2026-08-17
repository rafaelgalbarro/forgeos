/**
 * Mutation gate for Execution Manager actions.
 * OPEN when LIVE_TRADING_ENABLED=true and IBKR_READ_ONLY=false (supervised live).
 * Kill-switch metadata is displayed but does not lock this gate.
 */

import {
  canAttemptCancel,
  canAttemptModify,
  type ExecutionManagerState,
} from "./execution-manager-status";

export type ExecutionMutationAction = "cancel" | "modify" | "duplicate";

function parseEnvBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw == null || raw.trim() === "") return fallback;
  const v = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return fallback;
}

export type ExecutionSafetyFlags = {
  readonly mode: "ANALYSIS_ONLY" | "LIVE";
  readonly liveTradingEnabled: boolean;
  readonly liveTradingEnabledValue: string;
  readonly ibkrReadOnly: boolean;
  readonly killSwitchEnabled: boolean;
  readonly autonomousLock: "LOCKED" | "ACTIVE";
  readonly mutationsEnabled: boolean;
  readonly gate: "LOCKED" | "OPEN";
};

export type MutationGateResult =
  | {
      readonly allowed: true;
      readonly posture: "OPEN";
      readonly message: string;
      readonly wouldMutateBroker: true;
    }
  | {
      readonly allowed: false;
      readonly posture: "LOCKED" | "OPEN";
      readonly message: string;
      readonly wouldMutateBroker: false;
    };

export function resolveExecutionSafetyFlags(env: {
  readonly LIVE_TRADING_ENABLED?: string;
  readonly IBKR_READ_ONLY?: string;
  readonly killSwitchEnabled?: boolean;
}): ExecutionSafetyFlags {
  const liveTradingEnabledValue =
    env.LIVE_TRADING_ENABLED ?? process.env.LIVE_TRADING_ENABLED ?? "false";
  const ibkrReadOnlyRaw = env.IBKR_READ_ONLY ?? process.env.IBKR_READ_ONLY ?? "true";
  const liveTradingEnabled = parseEnvBool(liveTradingEnabledValue, false);
  const ibkrReadOnly = parseEnvBool(ibkrReadOnlyRaw, !liveTradingEnabled);
  const killSwitchEnabled = Boolean(env.killSwitchEnabled);
  const mutationsEnabled = liveTradingEnabled && !ibkrReadOnly;
  return {
    mode: mutationsEnabled ? "LIVE" : "ANALYSIS_ONLY",
    liveTradingEnabled,
    liveTradingEnabledValue,
    ibkrReadOnly,
    killSwitchEnabled,
    autonomousLock: mutationsEnabled ? "ACTIVE" : "LOCKED",
    mutationsEnabled,
    gate: mutationsEnabled ? "OPEN" : "LOCKED",
  };
}

export function isMutationLocked(flags: ExecutionSafetyFlags): boolean {
  return !flags.mutationsEnabled || flags.gate === "LOCKED";
}

/**
 * Cancel / Modify / Duplicate — OPEN when live flags allow real broker mutations.
 */
export function gateExecutionMutation(args: {
  readonly action: ExecutionMutationAction;
  readonly state: ExecutionManagerState;
  readonly flags: ExecutionSafetyFlags;
  readonly orderId?: string | number;
}): MutationGateResult {
  const locked = isMutationLocked(args.flags);
  const posture = locked ? "LOCKED" : "OPEN";
  const idBit = args.orderId != null ? ` · orderId=${args.orderId}` : "";

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

  if (locked) {
    return {
      allowed: false,
      posture: "LOCKED",
      message: `LOCKED · ${args.action.toUpperCase()} blocked — LIVE_TRADING_ENABLED=${args.flags.liveTradingEnabledValue}, IBKR_READ_ONLY=${args.flags.ibkrReadOnly}${idBit}.`,
      wouldMutateBroker: false,
    };
  }

  return {
    allowed: true,
    posture: "OPEN",
    message: `OPEN · ${args.action.toUpperCase()} allowed — LIVE_TRADING_ENABLED=true, IBKR_READ_ONLY=false${idBit}.`,
    wouldMutateBroker: true,
  };
}
