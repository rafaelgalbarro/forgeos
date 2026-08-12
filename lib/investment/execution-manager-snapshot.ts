import "server-only";

import { createIbkrBrokerEngine } from "@/lib/broker-engine";
import { getAuditTimeline, type AuditTimelineItem } from "@/lib/investment/audit-timeline";
import {
  gateExecutionMutation,
  resolveExecutionSafetyFlags,
  type ExecutionMutationAction,
  type ExecutionSafetyFlags,
  type MutationGateResult,
} from "@/lib/investment/execution-manager-actions";
import {
  mapBrokerOrderToRow,
  type ExecutionManagerOrderRow,
  type RawBrokerOrder,
} from "@/lib/investment/execution-manager-map";
import type { ExecutionManagerState } from "@/lib/investment/execution-manager-status";
import {
  InMemoryExecutionStorage,
  summarizeExecutionForDashboard,
} from "@/src/core/investment/live-execution";

export type ExecutionAuditEvent = {
  readonly id: string;
  readonly at: string;
  readonly actor: string;
  readonly event: string;
  readonly operationId: string;
};

export type ExecutionManagerSnapshot = {
  readonly generatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly safety: ExecutionSafetyFlags;
  readonly brokerConnected: boolean | null;
  readonly dataSource: "IBKR_LIVE_READ_ONLY" | "UNAVAILABLE";
  readonly orders: readonly ExecutionManagerOrderRow[];
  readonly auditItems: readonly AuditTimelineItem[];
  readonly executionAudit: readonly ExecutionAuditEvent[];
  readonly note: string;
  readonly error?: string;
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function readExecutionControlMeta(): {
  readonly auditTimeline: readonly ExecutionAuditEvent[];
  readonly killSwitchEnabled: boolean;
} {
  try {
    // Same source as /investment/execution-control — do not duplicate engine logic.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCompositionRoot } = require("@/src/core/composition") as {
      getCompositionRoot: () => { store: { meta: unknown } };
    };
    const fromMeta = asObject(asObject(getCompositionRoot().store.meta)?.investmentExecutionControl);
    const timeline = Array.isArray(fromMeta?.auditTimeline) ? fromMeta.auditTimeline : [];
    const auditTimeline = timeline
      .map((entry) => {
        const row = asObject(entry);
        if (!row) return null;
        return {
          id: typeof row.id === "string" ? row.id : `exec-${String(row.at ?? "")}`,
          at: typeof row.at === "string" ? row.at : new Date().toISOString(),
          actor: typeof row.actor === "string" ? row.actor : "system",
          event: typeof row.event === "string" ? row.event : "UNKNOWN",
          operationId: typeof row.operationId === "string" ? row.operationId : "NO_DATA",
        } satisfies ExecutionAuditEvent;
      })
      .filter((x): x is ExecutionAuditEvent => Boolean(x));
    return {
      auditTimeline,
      killSwitchEnabled: Boolean(fromMeta?.killSwitchEnabled),
    };
  } catch {
    return { auditTimeline: [], killSwitchEnabled: false };
  }
}

async function fetchBrokerOrders(): Promise<{
  orders: RawBrokerOrder[];
  connected: boolean | null;
  error?: string;
}> {
  try {
    const engine = createIbkrBrokerEngine();
    const [statusResult, ordersResult] = await Promise.allSettled([
      engine.request<{ connected?: boolean }>({ path: "/api/ibkr/status", method: "GET" }),
      engine.request<RawBrokerOrder[] | { orders?: RawBrokerOrder[] }>({
        path: "/api/ibkr/orders",
        method: "GET",
      }),
    ]);

    const connected =
      statusResult.status === "fulfilled" ? Boolean(statusResult.value?.connected) : null;

    if (ordersResult.status === "rejected") {
      return {
        orders: [],
        connected,
        error: ordersResult.reason instanceof Error ? ordersResult.reason.message : "Orders read failed",
      };
    }

    const body = ordersResult.value;
    const list = Array.isArray(body)
      ? body
      : Array.isArray((body as { orders?: RawBrokerOrder[] }).orders)
        ? (body as { orders: RawBrokerOrder[] }).orders
        : [];

    return { orders: list, connected };
  } catch (error) {
    return {
      orders: [],
      connected: null,
      error: error instanceof Error ? error.message : "Broker unavailable",
    };
  }
}

/**
 * Read-only Execution Manager snapshot.
 * Reuses IBKR broker engine for orders + Investment Memory audit + execution-control audit.
 * Never submits, cancels, or modifies broker orders.
 */
export async function buildExecutionManagerSnapshot(): Promise<ExecutionManagerSnapshot> {
  const safety = resolveExecutionSafetyFlags({});
  const controlMeta = readExecutionControlMeta();
  const storage = new InMemoryExecutionStorage();
  const execDash = summarizeExecutionForDashboard({
    approvals: [],
    operations: [],
    audit: await storage.listAudit(),
    now: new Date().toISOString(),
    liveTradingEnabledValue: safety.liveTradingEnabledValue,
    killSwitchEnabled: safety.killSwitchEnabled || controlMeta.killSwitchEnabled,
  });

  const executionAudit =
    controlMeta.auditTimeline.length > 0
      ? controlMeta.auditTimeline
      : execDash.auditTimeline.map((e) => ({
          id: e.id,
          at: e.at,
          actor: e.actor,
          event: e.event,
          operationId: e.operationId,
        }));

  const [broker, audit] = await Promise.all([fetchBrokerOrders(), getAuditTimeline({ limit: 40 })]);

  const orders = broker.orders.map(mapBrokerOrderToRow);
  const dataSource =
    broker.connected && !broker.error ? ("IBKR_LIVE_READ_ONLY" as const) : ("UNAVAILABLE" as const);

  return {
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    safety: {
      ...safety,
      killSwitchEnabled: safety.killSwitchEnabled || controlMeta.killSwitchEnabled,
    },
    brokerConnected: broker.connected,
    dataSource,
    orders,
    auditItems: audit.items,
    executionAudit,
    note:
      broker.error ??
      (orders.length === 0
        ? "No open orders from IBKR — NO_DATA (not fabricated). ANALYSIS_ONLY · mutations LOCKED."
        : `Showing ${orders.length} open order(s) · read-only · Cancel/Modify/Duplicate gated.`),
    error: broker.error,
  };
}

export function runExecutionManagerDryRunAction(args: {
  readonly action: ExecutionMutationAction;
  readonly state: ExecutionManagerState;
  readonly orderId?: string | number;
  readonly patch?: Readonly<Record<string, unknown>>;
}): MutationGateResult & {
  readonly action: ExecutionMutationAction;
  readonly recordedAt: string;
  readonly patch?: Readonly<Record<string, unknown>>;
} {
  const flags = resolveExecutionSafetyFlags({});
  const gate = gateExecutionMutation({
    action: args.action,
    state: args.state,
    flags,
    orderId: args.orderId,
  });
  return {
    ...gate,
    action: args.action,
    recordedAt: new Date().toISOString(),
    patch: args.patch,
  };
}
