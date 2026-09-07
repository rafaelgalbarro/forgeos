/**
 * Locked live order boundary.
 * ONLY LiveExecutionEngine may call BrokerEngine.submitOrder (when unlocked later).
 * This module never submits — dry-run / record only while LOCKED.
 */

import type { BrokerEngine } from "@/src/core/application/ports/broker-engine";

export interface LiveOrderSubmitRequest {
  readonly symbol: string;
  readonly side: "BUY" | "SELL";
  readonly qty: number;
  readonly orderType: "LMT";
  readonly lmtPrice: number;
  readonly tif: "DAY";
  readonly idempotencyKey: string;
  readonly stopPrice: number;
  readonly targetPrice: number;
}

export interface LiveOrderSubmitResult {
  readonly submitted: false;
  readonly blocked: true;
  readonly reason: string;
  readonly draft: LiveOrderSubmitRequest;
  readonly placeOrderInvoked: false;
  readonly submitOrderInvoked: false;
}

/**
 * Sole broker order-write entry point for AUTONOMOUS_LIVE while locked.
 * Never calls BrokerEngine.submitOrder / placeOrder / POST /orders.
 */
export class LockedLiveOrderGate {
  constructor(private readonly brokerEngine?: BrokerEngine) {}

  /**
   * Intentionally does not call the broker. Records a blocked submit.
   * LiveExecutionEngine.submitOrder is the only path that may submit when unlocked.
   */
  async submitOrder(_request: LiveOrderSubmitRequest): Promise<LiveOrderSubmitResult> {
    void this.brokerEngine;
    return {
      submitted: false,
      blocked: true,
      reason:
        "AUTONOMOUS_LIVE LOCKED: submitOrder blocked. Only LiveExecutionEngine may submit when unlocked; LIVE_TRADING_ENABLED=false, IBKR_READ_ONLY=true.",
      draft: _request,
      placeOrderInvoked: false,
      submitOrderInvoked: false,
    };
  }
}

/**
 * Boundary helper used by lint/tests: files outside live-execution must not call submitOrder on BrokerEngine.
 */
export const LIVE_ORDER_SUBMIT_BOUNDARY = {
  allowedCaller: "LiveExecutionEngine",
  allowedModule: "src/core/investment/live-execution",
  lockedModule: "src/core/investment/autonomous-live",
  forbiddenElsewhere: ["submitOrder", "placeOrder", "sendOrder"] as const,
} as const;
