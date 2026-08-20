/**
 * Supervised live submit — Telegram (or Execution Manager) is the human gate.
 * Completes IBKR FastAPI proposal → APPROVE → EXECUTE LIVE so TWS actually receives the order.
 */

import "server-only";

import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { getInvestmentRuntimeFlags } from "@/lib/investment/runtime-flags";
import { ensureIbkrBrokerConnected, reconnectIbkrBroker } from "@/lib/trading/ibkr-reconnect";

type RiskCheck = {
  readonly name?: string;
  readonly passed?: boolean;
  readonly detail?: unknown;
};

type ProposalResponse = {
  readonly id?: string;
  readonly status?: string;
  readonly risk_checks?: readonly RiskCheck[];
  readonly ibkr_order_id?: string | number | null;
  readonly ibkrOrderId?: string | number | null;
};

type DecisionResponse = {
  readonly approvalToken?: string;
  readonly proposal?: ProposalResponse;
};

export type SupervisedSubmitResult = {
  readonly proposalId: string;
  readonly ibkrOrderId: string;
  readonly status: string;
};

function isDisconnectError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /not connected|disconnected|ECONNREFUSED|fetch failed|unreachable|SERVICE_UNAVAILABLE|socket|timeout|IBKR.*offline/i.test(
    msg,
  );
}

async function withBrokerRetry<T>(
  symbol: string,
  step: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!isDisconnectError(err)) throw err;
    console.warn(
      `[AutoExecute] ${symbol} → broker desconectado en ${step}, reconectando…`,
    );
    const re = await reconnectIbkrBroker();
    if (!re.connected) {
      throw new Error(
        `IBKR reconnect failed after ${step}: ${re.error ?? "not connected"}`,
      );
    }
    console.log(`[AutoExecute] ${symbol} → reconectado, reintentando ${step}…`);
    return await fn();
  }
}

export async function submitSupervisedLiveLimitOrder(args: {
  readonly symbol: string;
  readonly side: "BUY" | "SELL";
  readonly quantity: number;
  readonly limitPrice: number;
  readonly outsideRth?: boolean;
  readonly rationale: string;
  readonly account?: string;
}): Promise<SupervisedSubmitResult> {
  const symbol = String(args.symbol).toUpperCase();
  const flags = getInvestmentRuntimeFlags();
  if (!flags.liveTradingEnabled || flags.ibkrReadOnly) {
    throw new Error(
      `Live IBKR submit blocked — LIVE_TRADING_ENABLED=${String(flags.liveTradingEnabled)} IBKR_READ_ONLY=${String(flags.ibkrReadOnly)}`,
    );
  }

  if (!(args.quantity > 0)) {
    throw new Error(`capital insuficiente — qty=${args.quantity}`);
  }
  if (!(args.limitPrice > 0)) {
    throw new Error(`precio inválido — limitPrice=${args.limitPrice}`);
  }

  const connected = await ensureIbkrBrokerConnected();
  if (!connected) {
    console.warn(`[AutoExecute] ${symbol} → broker no conectado, forzando reconnect…`);
    const re = await reconnectIbkrBroker();
    if (!re.connected) {
      throw new Error(`IBKR desconectado — no se pudo reconectar (${re.error ?? "unknown"})`);
    }
  }

  const rationale = (args.rationale.trim().length >= 10
    ? args.rationale
    : `${args.rationale} supervised live`
  ).slice(0, 4000);

  // Paso 3 — Crear propuesta
  console.log(
    `[AutoExecute] ${symbol} → creando propuesta ibkr-broker ` +
      `(${args.side} qty=${args.quantity} LMT=$${args.limitPrice} account=${args.account ?? "default"})…`,
  );
  const proposal = await withBrokerRetry(symbol, "crear propuesta", () =>
    ibkrServiceFetch<ProposalResponse>("/api/proposals", {
      method: "POST",
      body: JSON.stringify({
        symbol,
        side: args.side,
        quantity: Number(args.quantity),
        order_type: "LMT",
        limit_price: args.limitPrice,
        sec_type: "STK",
        currency: "USD",
        exchange: "SMART",
        outside_rth: args.outsideRth ?? false,
        rationale,
        strategy_id: "forgeos-trading-engine",
        account: args.account,
      }),
    }),
  );

  const proposalId = proposal.id?.trim();
  if (!proposalId) {
    throw new Error("IBKR proposal missing id");
  }
  console.log(`[AutoExecute] ${symbol} → propuesta creada: id=${proposalId}`);
  if (proposal.status === "BLOCKED") {
    const failed = (proposal.risk_checks ?? [])
      .filter((check) => check.passed === false)
      .map((check) => check.name ?? "risk")
      .join(", ");
    throw new Error(`IBKR proposal BLOCKED${failed ? `: ${failed}` : ""}`);
  }

  // Paso 4 — Aprobar propuesta
  console.log(`[AutoExecute] ${symbol} → aprobando propuesta…`);
  const decision = await withBrokerRetry(symbol, "aprobar propuesta", () =>
    ibkrServiceFetch<DecisionResponse>(`/api/proposals/${proposalId}/decision`, {
      method: "POST",
      body: JSON.stringify({
        decision: "APPROVE",
        confirmation_phrase: `APPROVE ${proposalId}`,
      }),
    }),
  );

  const approvalToken = decision.approvalToken?.trim();
  if (!approvalToken) {
    throw new Error("IBKR approval token missing after supervised approve");
  }
  console.log(
    `[AutoExecute] ${symbol} → propuesta aprobada: token=${approvalToken.slice(0, 12)}…`,
  );

  // Paso 5 — Ejecutar orden
  console.log(`[AutoExecute] ${symbol} → ejecutando orden IBKR…`);
  const executed = await withBrokerRetry(symbol, "ejecutar orden", () =>
    ibkrServiceFetch<ProposalResponse>(`/api/proposals/${proposalId}/execute`, {
      method: "POST",
      body: JSON.stringify({
        approval_token: approvalToken,
        confirmation_phrase: `EXECUTE LIVE ${proposalId}`,
      }),
    }),
  );

  const ibkrOrderId = executed.ibkr_order_id ?? executed.ibkrOrderId;
  if (ibkrOrderId == null || String(ibkrOrderId).trim() === "") {
    throw new Error("IBKR execute returned without ibkr_order_id");
  }

  console.log(`[AutoExecute] ${symbol} → EJECUTADO ibkrId=${ibkrOrderId} ✅`);
  return {
    proposalId,
    ibkrOrderId: String(ibkrOrderId),
    status: executed.status ?? "EXECUTED",
  };
}

export async function cancelIbkrOrder(orderId: string | number): Promise<void> {
  const flags = getInvestmentRuntimeFlags();
  if (!flags.liveTradingEnabled || flags.ibkrReadOnly) {
    throw new Error(
      `IBKR cancel blocked — LIVE_TRADING_ENABLED=${String(flags.liveTradingEnabled)} IBKR_READ_ONLY=${String(flags.ibkrReadOnly)}`,
    );
  }
  await ibkrServiceFetch<{ ok?: boolean }>(`/api/orders/${orderId}`, {
    method: "DELETE",
  });
}
