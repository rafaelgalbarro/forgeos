import type { ExecutionSafetyFlags } from "@/lib/investment/execution-manager-actions";
import type { ExecutionManagerState } from "@/lib/investment/execution-manager-status";

/** Mirror of AuditTimelineItem — kept client-safe (no server-only import). */
export type ExecutionAuditTimelineItem = {
  readonly id: string;
  readonly kind: string;
  readonly occurredAt: string;
  readonly symbol: string;
  readonly summary: string;
  readonly provenance: string;
};

export type ExecutionManagerOrderRow = {
  readonly uuid: string;
  readonly orderId: string;
  readonly brokerId: string;
  readonly estado: ExecutionManagerState;
  readonly estadoLabel: string;
  readonly rawStatus: string;
  readonly statusMapped: boolean;
  readonly activo: string;
  readonly cuenta: string;
  readonly cuentaMasked: string;
  readonly precio: number | null;
  readonly cantidad: number;
  readonly tipo: string;
  readonly side: string;
  readonly stop: number | null;
  readonly takeProfit: number | null;
  readonly trailing: number | null;
  readonly fecha: string | null;
  readonly updatedAt: string | null;
  readonly responsable: string;
  readonly origen: string;
  readonly filled: number | null;
  readonly remaining: number | null;
  readonly avgFillPrice: number | null;
  readonly tif: string | null;
};

export type ExecutionManagerSnapshot = {
  readonly generatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly safety: ExecutionSafetyFlags;
  readonly brokerConnected: boolean | null;
  readonly dataSource: "IBKR_LIVE_READ_ONLY" | "UNAVAILABLE";
  readonly orders: readonly ExecutionManagerOrderRow[];
  readonly auditItems: readonly ExecutionAuditTimelineItem[];
  readonly executionAudit: ReadonlyArray<{
    readonly id: string;
    readonly at: string;
    readonly actor: string;
    readonly event: string;
    readonly operationId: string;
  }>;
  readonly note: string;
  readonly error?: string;
};

export type DryRunActionResult = {
  readonly allowed: false;
  readonly posture: "LOCKED" | "DRY_RUN";
  readonly message: string;
  readonly wouldMutateBroker: false;
  readonly action?: string;
  readonly recordedAt?: string;
};
