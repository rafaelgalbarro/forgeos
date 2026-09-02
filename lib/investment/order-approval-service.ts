/**
 * Semi-automatic order approval — Telegram founder gate + timeout expiry.
 */

import "server-only";

import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";
import { publishInvestmentEvent } from "@/lib/notifications/investment-events";
import { OrderApprovalGate } from "@/src/core/trading/order-approval";
import { TRADING_CONFIG } from "@/src/core/trading/trading.config";
import { updateTradingState, loadTradingState } from "@/src/core/trading/trading-state-store";
import {
  executeApprovedForexOrder,
  isForexPending,
} from "@/lib/investment/forex/approval";
import { recordForexTradeEvent } from "@/lib/investment/forex/goals";
import { ensureIbkrBrokerConnected } from "@/lib/trading/ibkr-reconnect";

type TradingEngineInstance = import("@/src/core/trading/trading-engine").TradingEngine;
let enginePromise: Promise<TradingEngineInstance> | null = null;
const approvalInFlight = new Set<string>();

async function getTradingEngine(): Promise<TradingEngineInstance> {
  if (!enginePromise) {
    enginePromise = import("@/src/core/trading/trading-engine").then(
      ({ TradingEngine }) => new TradingEngine(),
    );
  }
  return enginePromise;
}

export type ApprovalAction = "approve" | "reject";

export type ApprovalProcessResult = {
  ok: boolean;
  action: ApprovalAction;
  approvalId: string;
  error?: string;
  ticker?: string;
  direction?: string;
  status?: string;
  orderId?: string;
};

/** Only TELEGRAM_CHAT_ID (founder) may approve/reject. */
export function isFounderTelegramChat(chatId: string | number | undefined | null): boolean {
  const expected = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!expected || chatId == null) return false;
  return String(chatId) === expected;
}

export function approvalTimeoutMs(): number {
  return TRADING_CONFIG.semiAutomatic.approvalTimeoutMinutes * 60_000;
}

/** Mark PENDING_APPROVAL older than timeout as EXPIRED; notify Telegram. */
export async function expireStalePendingApprovals(): Promise<number> {
  const timeoutMs = approvalTimeoutMs();
  const now = Date.now();
  const expiredRecords: Array<{ approvalId: string; ticker: string }> = [];

  updateTradingState((state) => ({
    ...state,
    pendingOrders: state.pendingOrders.map((o) => {
      if (o.status !== "PENDING_APPROVAL") return o;
      const age = now - new Date(o.createdAt).getTime();
      if (age <= timeoutMs) return o;
      expiredRecords.push({ approvalId: o.approvalId, ticker: o.ticker });
      return { ...o, status: "EXPIRED", updatedAt: new Date().toISOString() };
    }),
  }));

  for (const rec of expiredRecords) {
    const mins = TRADING_CONFIG.semiAutomatic.approvalTimeoutMinutes;
    await sendTelegramMessage(
      `⏱ <b>TIMEOUT</b> — Orden ${rec.approvalId} (${rec.ticker}) cancelada tras ${mins} min sin respuesta`,
    );
    publishInvestmentEvent({
      type: "approval_expired",
      at: new Date().toISOString(),
      payload: rec,
    });
  }

  return expiredRecords.length;
}

let expiryTimer: ReturnType<typeof setInterval> | null = null;

/** Poll every 30s for expired pending approvals. */
export function startApprovalExpiryMonitor(): void {
  if (expiryTimer) return;
  void expireStalePendingApprovals();
  expiryTimer = setInterval(() => void expireStalePendingApprovals(), 30_000);
}

/**
 * Approve or reject a pending order (Telegram semi-automatic flow).
 * Requires founder chat when chatId is supplied.
 */
export async function processOrderApproval(params: {
  approvalId: string;
  action: ApprovalAction;
  chatId?: string | number | null;
  skipFounderCheck?: boolean;
}): Promise<ApprovalProcessResult> {
  const { approvalId, action } = params;

  if (!approvalId?.trim()) {
    return { ok: false, action, approvalId: "", error: "approvalId required" };
  }

  if (params.chatId != null && !params.skipFounderCheck && !isFounderTelegramChat(params.chatId)) {
    return { ok: false, action, approvalId, error: "Solo el founder (TELEGRAM_CHAT_ID) puede aprobar" };
  }

  const gate = OrderApprovalGate.getInstance();
  const pending = gate.get(approvalId);
  if (!pending) {
    return { ok: false, action, approvalId, error: `Approval not found: ${approvalId}` };
  }
  if (pending.status === "EXPIRED") {
    return { ok: false, action, approvalId, error: "Orden expirada por timeout" };
  }
  if (pending.status !== "PENDING_APPROVAL") {
    return {
      ok: false,
      action,
      approvalId,
      error: `Orden en estado ${pending.status}`,
      ticker: pending.ticker,
      direction: pending.direction,
      status: pending.status,
    };
  }

  if (approvalInFlight.has(approvalId)) {
    return { ok: false, action, approvalId, error: "Aprobación ya en curso" };
  }
  approvalInFlight.add(approvalId);

  try {
  if (isForexPending(pending)) {
    if (action === "reject") {
      gate.reject(approvalId);
      await sendTelegramMessage(
        `❌ <b>RECHAZADA</b> — FOREX ${pending.ticker} ${pending.direction} (${approvalId})`,
      );
      publishInvestmentEvent({
        type: "approval_rejected",
        at: new Date().toISOString(),
        payload: { approvalId, ticker: pending.ticker },
      });
      return {
        ok: true,
        action,
        approvalId,
        ticker: pending.ticker,
        direction: pending.direction,
        status: "REJECTED",
      };
    }

    gate.approve(approvalId);
    try {
      await ensureIbkrBrokerConnected();
      const submitted = await executeApprovedForexOrder(pending);
      gate.markExecuted(approvalId, submitted.orderId);
      const price = pending.limitPrice ?? pending.price;
      await sendTelegramMessage(
        submitted.staged
          ? `✅ FOREX staged: ${pending.ticker} ${pending.direction} ${pending.shares}@${price.toFixed(5)} · IBKR #${submitted.orderId}`
          : `✅ Orden ejecutada: ${pending.ticker} ${pending.shares}@${price.toFixed(5)} · IBKR #${submitted.orderId}`,
      );
      recordForexTradeEvent({
        style: pending.reason.toLowerCase().includes("scalp") ? "SCALPING" : "INTRADAY",
        pipsDelta: 0,
        opened: true,
      });
      publishInvestmentEvent({
        type: "order_executed",
        at: new Date().toISOString(),
        payload: { approvalId, ticker: pending.ticker, orderId: submitted.orderId },
      });
      return {
        ok: true,
        action,
        approvalId,
        ticker: pending.ticker,
        direction: pending.direction,
        status: "EXECUTED",
        orderId: submitted.orderId,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "FOREX execute failed";
      await sendTelegramMessage(`❌ FOREX ${pending.ticker}: ${message}`);
      return {
        ok: false,
        action,
        approvalId,
        ticker: pending.ticker,
        direction: pending.direction,
        error: message,
      };
    }
  }

  const engine = await getTradingEngine();

  if (action === "reject") {
    await engine.rejectPending(approvalId);
    await sendTelegramMessage(
      `❌ <b>RECHAZADA</b> — ${pending.ticker} ${pending.direction} (${approvalId})`,
    );
    publishInvestmentEvent({
      type: "approval_rejected",
      at: new Date().toISOString(),
      payload: { approvalId, ticker: pending.ticker },
    });
    return {
      ok: true,
      action,
      approvalId,
      ticker: pending.ticker,
      direction: pending.direction,
      status: "REJECTED",
    };
  }

  const result = await engine.approveAndExecute(approvalId, { skipPreTradeRecheck: true });
  if (result.status === "EXECUTED") {
    await sendTelegramMessage(
      `✅ Orden ejecutada: ${result.ticker ?? pending.ticker} ${pending.shares}@$${(result.price ?? pending.price).toFixed(2)}` +
        (result.orderId ? ` · IBKR #${result.orderId}` : ""),
    );
    publishInvestmentEvent({
      type: "order_executed",
      at: new Date().toISOString(),
      payload: result,
    });
  } else {
    await sendTelegramMessage(
      `❌ ${pending.ticker}: ${result.reason ?? result.status ?? "no ejecutada"}`,
    );
  }

  return {
    ok: result.status === "EXECUTED",
    action,
    approvalId,
    ticker: result.ticker,
    direction: result.direction,
    status: result.status,
    orderId: result.orderId,
    error: result.status !== "EXECUTED" ? result.reason : undefined,
  };
  } finally {
    approvalInFlight.delete(approvalId);
  }
}

export function countPendingApprovals(): number {
  return loadTradingState().pendingOrders.filter((o) => o.status === "PENDING_APPROVAL").length;
}
