/**
 * Normalize IBKR/TWS + paper/broker-engine order statuses for Execution Manager UI.
 * Unmapped raw values keep their source string and a best-effort normalized label.
 */

export const EXECUTION_MANAGER_STATES = [
  "Draft",
  "Validated",
  "Pending",
  "Submitted",
  "Accepted",
  "Working",
  "Partially Filled",
  "Filled",
  "Cancelled",
  "Rejected",
  "Expired",
] as const;

export type ExecutionManagerState = (typeof EXECUTION_MANAGER_STATES)[number];

export type NormalizedOrderStatus = {
  readonly state: ExecutionManagerState;
  readonly raw: string;
  readonly mapped: boolean;
  readonly label: string;
};

const EXACT: Record<string, ExecutionManagerState> = {
  draft: "Draft",
  draft_created: "Draft",
  validated: "Validated",
  risk_revalidated: "Validated",
  whatif_completed: "Validated",
  pendingsubmit: "Pending",
  apipending: "Pending",
  pending: "Pending",
  pendingcancel: "Pending",
  presubmitted: "Submitted",
  submitted: "Working",
  order_submitted: "Submitted",
  accepted: "Accepted",
  acknowledged: "Accepted",
  order_acknowledged: "Accepted",
  ack: "Accepted",
  working: "Working",
  active: "Working",
  partiallyfilled: "Partially Filled",
  partialfilled: "Partially Filled",
  partially_filled: "Partially Filled",
  partial_fill: "Partially Filled",
  filled: "Filled",
  cancelled: "Cancelled",
  canceled: "Cancelled",
  apicancelled: "Cancelled",
  apicanceled: "Cancelled",
  rejected: "Rejected",
  inactive: "Rejected",
  blocked: "Rejected",
  expired: "Expired",
};

function canonicalize(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

/**
 * Map broker/IBKR status string → Execution Manager estado.
 * Prefer filled/remaining hints when status alone is ambiguous (e.g. Submitted).
 */
export function normalizeOrderStatus(
  rawStatus: string | null | undefined,
  hints?: { readonly filled?: number | null; readonly remaining?: number | null; readonly quantity?: number | null },
): NormalizedOrderStatus {
  const raw = (rawStatus ?? "").trim() || "UNKNOWN";
  const key = canonicalize(raw);
  let state = EXACT[key];
  let mapped = Boolean(state);

  if (!state && key.includes("partial")) {
    state = "Partially Filled";
    mapped = true;
  } else if (!state && key.includes("cancel")) {
    state = "Cancelled";
    mapped = true;
  } else if (!state && key.includes("reject")) {
    state = "Rejected";
    mapped = true;
  } else if (!state && key.includes("expir")) {
    state = "Expired";
    mapped = true;
  } else if (!state && key.includes("fill") && !key.includes("partial")) {
    state = "Filled";
    mapped = true;
  }

  if (!state) {
    const filled = hints?.filled;
    const remaining = hints?.remaining;
    const qty = hints?.quantity;
    if (typeof filled === "number" && filled > 0 && typeof remaining === "number" && remaining > 0) {
      state = "Partially Filled";
      mapped = false;
    } else if (typeof filled === "number" && typeof qty === "number" && filled >= qty && qty > 0) {
      state = "Filled";
      mapped = false;
    } else {
      state = "Working";
      mapped = false;
    }
  }

  // IBKR "Submitted" after partial fill often stays Submitted — prefer fill hints.
  if (state === "Working" || state === "Submitted") {
    const filled = hints?.filled;
    const remaining = hints?.remaining;
    if (typeof filled === "number" && filled > 0 && typeof remaining === "number" && remaining > 0) {
      state = "Partially Filled";
    } else if (typeof filled === "number" && filled > 0 && remaining === 0) {
      state = "Filled";
    }
  }

  return {
    state,
    raw,
    mapped,
    label: mapped ? state : `${state} (${raw})`,
  };
}

export function isTerminalState(state: ExecutionManagerState): boolean {
  return state === "Filled" || state === "Cancelled" || state === "Rejected" || state === "Expired";
}

export function canAttemptCancel(state: ExecutionManagerState): boolean {
  return !isTerminalState(state) && state !== "Draft";
}

export function canAttemptModify(state: ExecutionManagerState): boolean {
  return state === "Working" || state === "Submitted" || state === "Accepted" || state === "Pending" || state === "Partially Filled";
}
