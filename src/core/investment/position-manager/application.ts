import type { BrokerEngine } from "@/src/core/application/ports/broker-engine";
import {
  assertPositionTransition,
  ensureExitDecision,
  isEmergencyReason,
  reasonPriority,
  type ContinuousEvaluation,
  type ExitDecision,
  type ExitOrderType,
  type ExitReason,
  type ExitUrgency,
  type PositionManagerEvent,
  type PositionManagerState,
  type PositionSnapshot,
  type ReconciliationStatus,
} from "./domain";

export interface EvaluationSignal {
  readonly reason: ExitReason;
  readonly triggered: boolean;
  readonly urgency: ExitUrgency;
  readonly suggestedQuantity?: number;
  readonly suggestedOrderType?: ExitOrderType;
  readonly limitPrice?: number;
  readonly expectedSlippage?: number;
  readonly evidence: readonly string[];
}

export interface PositionEvaluationContext {
  readonly position: PositionSnapshot;
  readonly evaluatedAt: string;
  readonly horizonMs: number;
}

export interface PositionEvaluator {
  readonly type: ContinuousEvaluation;
  evaluate(context: PositionEvaluationContext): Promise<EvaluationSignal | null>;
}

export interface PositionStateRepository {
  getById(positionId: string): Promise<PositionSnapshot | undefined>;
  listAll(): Promise<readonly PositionSnapshot[]>;
  upsert(position: PositionSnapshot): Promise<void>;
}

export interface PositionEventLog {
  append(event: PositionManagerEvent): Promise<void>;
  listByPosition(positionId: string): Promise<readonly PositionManagerEvent[]>;
}

export interface ExitOrderRecord {
  readonly orderId: string;
  readonly positionId: string;
  readonly reason: ExitReason;
  readonly quantity: number;
  readonly status: "PENDING" | "PARTIAL_FILLED" | "FILLED" | "CANCELLED" | "REJECTED";
  readonly submittedAt: string;
}

export interface ExitOrderRegistry {
  findOpenByPosition(positionId: string): Promise<ExitOrderRecord | undefined>;
  save(order: ExitOrderRecord): Promise<void>;
}

export interface BrokerPositionSnapshot {
  readonly positionId: string;
  readonly symbol: string;
  readonly quantity: number;
  readonly averagePrice: number;
  readonly source: "BROKER";
}

export interface BrokerPositionAdapter {
  fetchOpenPositions(): Promise<readonly BrokerPositionSnapshot[]>;
}

export interface ManualPositionPolicy {
  readonly allowAutomatedExits: boolean;
  readonly allowStateMutation: boolean;
}

export interface PositionManagerDependencies {
  readonly repository: PositionStateRepository;
  readonly eventLog: PositionEventLog;
  readonly exitOrderRegistry: ExitOrderRegistry;
  readonly brokerAdapter: BrokerPositionAdapter;
  readonly brokerEngine: BrokerEngine;
  readonly evaluators: readonly PositionEvaluator[];
  readonly now?: () => string;
  readonly manualPolicy: ManualPositionPolicy;
}

export interface ReconciliationSummary {
  readonly status: ReconciliationStatus;
  readonly localMissingAtBroker: readonly string[];
  readonly brokerMissingLocally: readonly string[];
  readonly manualPositionIds: readonly string[];
}

export interface EntryBlockStatus {
  readonly blocked: boolean;
  readonly reason: string;
  readonly status: ReconciliationStatus;
}

export class PositionManagerService {
  constructor(private readonly deps: PositionManagerDependencies) {}

  async evaluatePosition(positionId: string): Promise<ExitDecision | null> {
    const position = await this.deps.repository.getById(positionId);
    if (!position) {
      throw new Error(`Position ${positionId} not found.`);
    }

    if (position.origin === "MANUAL" && !this.deps.manualPolicy.allowAutomatedExits) {
      return null;
    }

    if (position.pendingExitOrderId) {
      return null;
    }
    const existingOrder = await this.deps.exitOrderRegistry.findOpenByPosition(position.positionId);
    if (existingOrder) {
      return null;
    }

    const evaluatedAt = this.deps.now?.() ?? new Date().toISOString();
    const context: PositionEvaluationContext = {
      position,
      evaluatedAt,
      horizonMs: 30_000,
    };
    const signals = (
      await Promise.all(
        this.deps.evaluators.map(async (evaluator) => {
          const signal = await evaluator.evaluate(context);
          return signal && signal.triggered ? signal : null;
        }),
      )
    ).filter((signal): signal is EvaluationSignal => Boolean(signal));

    if (signals.length === 0) {
      return null;
    }

    const sorted = signals.sort((a, b) => {
      const emergencyDiff = Number(isEmergencyReason(b.reason)) - Number(isEmergencyReason(a.reason));
      if (emergencyDiff !== 0) return emergencyDiff;
      return reasonPriority(a.reason) - reasonPriority(b.reason);
    });
    const selected = sorted[0];

    const quantity = Math.max(1, Math.min(position.quantity, selected.suggestedQuantity ?? position.quantity));
    const decision = ensureExitDecision({
      positionId: position.positionId,
      reason: selected.reason,
      urgency: isEmergencyReason(selected.reason) ? "EMERGENCY" : selected.urgency,
      quantity,
      orderType: selected.suggestedOrderType ?? "MARKET",
      limitPrice: selected.limitPrice,
      expectedSlippage: selected.expectedSlippage ?? 0,
      evidence: selected.evidence,
      generatedAt: evaluatedAt,
      expiresAt: new Date(Date.parse(evaluatedAt) + context.horizonMs).toISOString(),
    });

    await this.transition(position.positionId, "EXIT_PENDING", `Exit requested due to ${decision.reason}.`, {
      decision,
    });
    return decision;
  }

  async registerExitOrder(order: ExitOrderRecord): Promise<void> {
    const existingOrder = await this.deps.exitOrderRegistry.findOpenByPosition(order.positionId);
    if (existingOrder) {
      return;
    }
    await this.deps.exitOrderRegistry.save(order);
    const position = await this.deps.repository.getById(order.positionId);
    if (!position) {
      return;
    }
    await this.deps.repository.upsert({
      ...position,
      state: "EXIT_PENDING",
      pendingExitOrderId: order.orderId,
      updatedAt: this.deps.now?.() ?? new Date().toISOString(),
    });
  }

  async registerFill(positionId: string, fill: { fillId: string; quantity: number; price: number; at: string }): Promise<void> {
    const position = await this.deps.repository.getById(positionId);
    if (!position) {
      throw new Error(`Position ${positionId} not found.`);
    }
    const remaining = Math.max(0, position.quantity - fill.quantity);
    const nextState: PositionManagerState = remaining === 0 ? "CLOSED" : "REDUCING";
    const updated: PositionSnapshot = {
      ...position,
      quantity: remaining,
      state: nextState,
      updatedAt: fill.at,
      fills: [...position.fills, fill],
      pendingExitOrderId: remaining === 0 ? undefined : position.pendingExitOrderId,
    };
    await this.deps.repository.upsert(updated);
    if (remaining > 0) {
      await this.deps.eventLog.append({
        eventId: `${positionId}:partial-fill:${fill.fillId}`,
        positionId,
        type: "PARTIAL_FILL_DETECTED",
        at: fill.at,
        payload: {
          filledQuantity: fill.quantity,
          remainingQuantity: remaining,
        },
      });
    }
  }

  async reconcile(): Promise<ReconciliationSummary> {
    const local = await this.deps.repository.listAll();
    const broker = await this.deps.brokerAdapter.fetchOpenPositions();
    const localById = new Map(local.map((position) => [position.positionId, position]));
    const brokerById = new Map(broker.map((position) => [position.positionId, position]));

    const localMissingAtBroker: string[] = [];
    const brokerMissingLocally: string[] = [];
    const manualPositionIds: string[] = [];

    for (const localPosition of local) {
      const brokerPosition = brokerById.get(localPosition.positionId);
      if (!brokerPosition) {
        localMissingAtBroker.push(localPosition.positionId);
        continue;
      }
      if (Math.abs(brokerPosition.quantity - localPosition.quantity) > 0.000001) {
        localMissingAtBroker.push(localPosition.positionId);
      }
      if (localPosition.origin === "MANUAL") {
        manualPositionIds.push(localPosition.positionId);
      }
    }

    for (const brokerPosition of broker) {
      if (!localById.has(brokerPosition.positionId)) {
        brokerMissingLocally.push(brokerPosition.positionId);
        const detectedAt = this.deps.now?.() ?? new Date().toISOString();
        await this.deps.eventLog.append({
          eventId: `${brokerPosition.positionId}:manual-detected:${detectedAt}`,
          positionId: brokerPosition.positionId,
          type: "MANUAL_POSITION_DETECTED",
          at: detectedAt,
          payload: brokerPosition as unknown as Readonly<Record<string, unknown>>,
        });
      }
    }

    const status: ReconciliationStatus =
      localMissingAtBroker.length > 0 || brokerMissingLocally.length > 0 ? "RECONCILIATION_REQUIRED" : "OK";

    for (const localPosition of local) {
      const mustFlag = status === "RECONCILIATION_REQUIRED";
      await this.deps.repository.upsert({
        ...localPosition,
        reconciliationStatus: mustFlag ? "RECONCILIATION_REQUIRED" : "OK",
        state:
          mustFlag && localPosition.state !== "CLOSED" && localPosition.state !== "MANUAL_INTERVENTION"
            ? "UNKNOWN"
            : localPosition.state,
        updatedAt: this.deps.now?.() ?? new Date().toISOString(),
      });
    }

    if (status === "RECONCILIATION_REQUIRED") {
      for (const positionId of [...localMissingAtBroker, ...brokerMissingLocally]) {
        await this.deps.eventLog.append({
          eventId: `${positionId}:recon-required:${this.deps.now?.() ?? new Date().toISOString()}`,
          positionId,
          type: "RECONCILIATION_MISMATCH_DETECTED",
          at: this.deps.now?.() ?? new Date().toISOString(),
          payload: {
            localMissingAtBroker,
            brokerMissingLocally,
          },
        });
      }
    }

    return {
      status,
      localMissingAtBroker,
      brokerMissingLocally,
      manualPositionIds,
    };
  }

  async getEntryBlockStatus(): Promise<EntryBlockStatus> {
    const positions = await this.deps.repository.listAll();
    const blocked = positions.some((position) => position.reconciliationStatus === "RECONCILIATION_REQUIRED");
    return {
      blocked,
      status: blocked ? "RECONCILIATION_REQUIRED" : "OK",
      reason: blocked
        ? "New entries blocked until position reconciliation is completed."
        : "Reconciliation status is healthy.",
    };
  }

  async syncManualPosition(position: PositionSnapshot): Promise<void> {
    if (position.origin !== "MANUAL") {
      await this.deps.repository.upsert(position);
      return;
    }
    if (!this.deps.manualPolicy.allowStateMutation) {
      await this.deps.repository.upsert({
        ...position,
        state: "MANUAL_INTERVENTION",
        reconciliationStatus: "RECONCILIATION_REQUIRED",
      });
      return;
    }
    await this.deps.repository.upsert(position);
  }

  private async transition(
    positionId: string,
    to: PositionManagerState,
    reason: string,
    payload: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    const position = await this.deps.repository.getById(positionId);
    if (!position) {
      throw new Error(`Position ${positionId} not found.`);
    }
    assertPositionTransition({ from: position.state, to });
    const at = this.deps.now?.() ?? new Date().toISOString();
    await this.deps.repository.upsert({
      ...position,
      state: to,
      updatedAt: at,
    });
    await this.deps.eventLog.append({
      eventId: `${positionId}:${position.state}->${to}:${at}`,
      positionId,
      type: "POSITION_STATE_CHANGED",
      at,
      payload: {
        from: position.state,
        to,
        reason,
        ...payload,
      },
    });
  }
}

