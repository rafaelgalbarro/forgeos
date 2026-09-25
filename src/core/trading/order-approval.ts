/**
 * PENDING_APPROVAL gate — orders must be queued and approved before executeOrder.
 */

import {
  loadTradingState,
  updateTradingState,
  type PendingOrderRecord,
} from "./trading-state-store"

export type EnqueueOrderInput = Omit<
  PendingOrderRecord,
  "approvalId" | "status" | "createdAt" | "updatedAt" | "orderId"
>

export class OrderApprovalGate {
  private static instance: OrderApprovalGate

  static getInstance(): OrderApprovalGate {
    if (!OrderApprovalGate.instance) OrderApprovalGate.instance = new OrderApprovalGate()
    return OrderApprovalGate.instance
  }

  enqueue(input: EnqueueOrderInput): PendingOrderRecord {
    const now = new Date().toISOString()
    const record: PendingOrderRecord = {
      ...input,
      approvalId: `pending_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: "PENDING_APPROVAL",
      createdAt: now,
      updatedAt: now,
    }

    updateTradingState((state) => ({
      ...state,
      pendingOrders: [record, ...state.pendingOrders].slice(0, 200),
    }))

    return record
  }

  listPending(): PendingOrderRecord[] {
    return loadTradingState().pendingOrders.filter((o) => o.status === "PENDING_APPROVAL")
  }

  get(approvalId: string): PendingOrderRecord | undefined {
    return loadTradingState().pendingOrders.find((o) => o.approvalId === approvalId)
  }

  /** Mark PENDING_APPROVAL → APPROVED. Does not execute. */
  approve(approvalId: string): PendingOrderRecord {
    return this.transition(approvalId, "PENDING_APPROVAL", "APPROVED")
  }

  reject(approvalId: string): PendingOrderRecord {
    return this.transition(approvalId, "PENDING_APPROVAL", "REJECTED")
  }

  /** Mark APPROVED → EXECUTED after broker/paper submit. */
  markExecuted(approvalId: string, orderId: string): PendingOrderRecord {
    const now = new Date().toISOString()
    let updated: PendingOrderRecord | undefined
    updateTradingState((state) => ({
      ...state,
      pendingOrders: state.pendingOrders.map((o) => {
        if (o.approvalId !== approvalId) return o
        if (o.status !== "APPROVED") {
          throw new Error(`Cannot mark executed: status is ${o.status}`)
        }
        updated = { ...o, status: "EXECUTED", orderId, updatedAt: now }
        return updated
      }),
    }))
    if (!updated) throw new Error(`Approval not found: ${approvalId}`)
    return updated
  }

  assertApproved(approvalId: string): PendingOrderRecord {
    const record = this.get(approvalId)
    if (!record) throw new Error(`Approval not found: ${approvalId}`)
    if (record.status !== "APPROVED") {
      throw new Error(`Order ${approvalId} is ${record.status}; executeOrder requires APPROVED`)
    }
    return record
  }

  private transition(
    approvalId: string,
    from: PendingOrderRecord["status"],
    to: PendingOrderRecord["status"],
  ): PendingOrderRecord {
    const now = new Date().toISOString()
    let updated: PendingOrderRecord | undefined
    updateTradingState((state) => ({
      ...state,
      pendingOrders: state.pendingOrders.map((o) => {
        if (o.approvalId !== approvalId) return o
        if (o.status !== from) {
          throw new Error(`Cannot transition ${approvalId}: expected ${from}, got ${o.status}`)
        }
        updated = { ...o, status: to, updatedAt: now }
        return updated
      }),
    }))
    if (!updated) throw new Error(`Approval not found: ${approvalId}`)
    return updated
  }
}
