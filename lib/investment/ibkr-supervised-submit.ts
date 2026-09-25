/**
 * Supervised live submit — Telegram (or Execution Manager) is the human gate.
 * Completes IBKR FastAPI proposal → APPROVE → EXECUTE LIVE so TWS actually receives the order.
 */

import "server-only";

import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { getInvestmentRuntimeFlags } from "@/lib/investment/runtime-flags";
import { ensureIbkrBrokerConnected } from "@/lib/trading/ibkr-reconnect";
import { notifyOrderRejected } from "@/lib/notifications/telegram-bot";
import {
  IBKR_CRYPTO_EXCHANGE,
  IBKR_CRYPTO_SEC_TYPE,
  ibkrCryptoSymbol,
  isIbkrCryptoTicker,
} from "@/src/core/trading/crypto-ibkr";
import {
  recordIbkrNonTradable,
  shouldPersistIbkrNonTradable,
} from "@/lib/trading/ibkr-non-tradable";

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
  readonly ibkrStatus?: string | null;
  readonly ibkr_status?: string | null;
  readonly ibkrPermId?: number | null;
  readonly reject_reason?: string | null;
  readonly ibkrError?: string | null;
  readonly ibkrRejectCode?: number | null;
  readonly ibkrRejectMessage?: string | null;
  readonly symbol?: string;
};

type DecisionResponse = {
  readonly approvalToken?: string;
  readonly proposal?: ProposalResponse;
};

export type SupervisedSubmitResult = {
  readonly proposalId: string;
  readonly ibkrOrderId: string;
  readonly status: string;
  readonly ibkrStatus?: string;
  readonly ibkrPermId?: number;
};

/** Soft skip — reqContractDetails / IBKR timed out; do not count as cycle failure. */
export class IbkrSubmitTimeoutError extends Error {
  readonly symbol: string;
  readonly softSkip = true as const;

  constructor(symbol: string, detail?: string) {
    super(detail?.trim() || `IBKR timeout ${symbol}`);
    this.name = "IbkrSubmitTimeoutError";
    this.symbol = symbol;
  }
}

/** Hard reject — IBKR never accepted the order (not EXECUTED). */
export class IbkrOrderRejectedError extends Error {
  readonly symbol: string;
  readonly code: number | null;
  readonly ibkrStatus: string;

  constructor(symbol: string, message: string, code?: number | null, ibkrStatus?: string) {
    super(message);
    this.name = "IbkrOrderRejectedError";
    this.symbol = symbol;
    this.code = code ?? null;
    this.ibkrStatus = ibkrStatus ?? "REJECTED";
  }
}

function isTimeoutError(err: unknown): boolean {
  if (err instanceof IbkrSubmitTimeoutError) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /timeout|timed?\s*out|AbortError|aborted|ETIMEDOUT|deadline/i.test(msg);
}

function isDisconnectError(err: unknown): boolean {
  if (isTimeoutError(err)) return false;
  const msg = err instanceof Error ? err.message : String(err);
  return /not connected|disconnected|ECONNREFUSED|fetch failed|unreachable|SERVICE_UNAVAILABLE|socket|reqContractDetails|IBKR.*offline/i.test(
    msg,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function notifyRejection(
  symbol: string,
  err: unknown,
  extra?: { code?: number | null; message?: string },
): Promise<void> {
  const payload =
    err instanceof Error && "payload" in err
      ? ((err as Error & { payload?: Record<string, unknown> }).payload ?? null)
      : err && typeof err === "object" && err !== null && "payload" in err
        ? ((err as { payload?: Record<string, unknown> }).payload ?? null)
        : null;
  const codeRaw =
    extra?.code ??
    (payload?.ibkrRejectCode != null ? Number(payload.ibkrRejectCode) : null) ??
    (err instanceof IbkrOrderRejectedError ? err.code : null);
  const code = Number.isFinite(codeRaw as number) ? (codeRaw as number) : null;
  const message =
    extra?.message ||
    (typeof payload?.ibkrRejectMessage === "string" && payload.ibkrRejectMessage) ||
    (typeof payload?.reject_reason === "string" && payload.reject_reason) ||
    (typeof payload?.ibkrError === "string" && payload.ibkrError) ||
    (typeof (err as { message?: string })?.message === "string" &&
      (err as { message: string }).message) ||
    (err instanceof Error ? err.message : String(err));
  const ibkrStatus =
    (typeof payload?.ibkrStatus === "string" && payload.ibkrStatus) ||
    (typeof payload?.ibkr_status === "string" && payload.ibkr_status) ||
    (err instanceof IbkrOrderRejectedError ? err.ibkrStatus : null);

  if (
    shouldPersistIbkrNonTradable({ code, ibkrStatus, message })
  ) {
    await recordIbkrNonTradable({
      symbol,
      code,
      message,
      ibkrStatus,
    }).catch((persistErr) =>
      console.warn(
        "[AutoExecute] recordIbkrNonTradable failed:",
        persistErr instanceof Error ? persistErr.message : persistErr,
      ),
    );
  } else {
    await notifyOrderRejected({
      ticker: symbol,
      code,
      message,
    }).catch((notifyErr) =>
      console.warn(
        "[AutoExecute] notifyOrderRejected failed:",
        notifyErr instanceof Error ? notifyErr.message : notifyErr,
      ),
    );
  }
}

function isOrderRejectedError(err: unknown): boolean {
  if (err instanceof IbkrOrderRejectedError) return true;
  const msg = err instanceof Error ? err.message : String(err);
  if (/ORDER_REJECTED|NO_ACK|Inactive|No trading permissions|422/i.test(msg)) return true;
  const status = err instanceof Error && "status" in err ? Number((err as { status?: number }).status) : 0;
  return status === 422;
}

async function ensureConnectedBeforeContractDetails(symbol: string): Promise<void> {
  const connected = await ensureIbkrBrokerConnected();
  if (connected) return;
  throw new Error(
    `IBKR desconectado — pulsa «Reconectar Broker» en el dashboard (${symbol})`,
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
    if (isTimeoutError(err)) {
      console.log(`[AutoExecute] ${symbol} → skip (timeout IBKR)`);
      throw new IbkrSubmitTimeoutError(symbol, err instanceof Error ? err.message : String(err));
    }
    if (!isDisconnectError(err)) throw err;
    // Wait/retry status only — never POST connect from order path
    console.warn(
      `[AutoExecute] ${symbol} → broker desconectado en ${step}, esperando status…`,
    );
    const ok = await ensureIbkrBrokerConnected();
    if (!ok) {
      throw new Error(
        `IBKR desconectado tras ${step} — pulsa «Reconectar Broker» en el dashboard`,
      );
    }
    console.log(`[AutoExecute] ${symbol} → status connected, reintentando ${step}…`);
    try {
      return await fn();
    } catch (retryErr) {
      if (isTimeoutError(retryErr)) {
        console.log(`[AutoExecute] ${symbol} → skip (timeout IBKR)`);
        throw new IbkrSubmitTimeoutError(
          symbol,
          retryErr instanceof Error ? retryErr.message : String(retryErr),
        );
      }
      throw retryErr;
    }
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
  const crypto = isIbkrCryptoTicker(args.symbol);
  const symbol = crypto
    ? (ibkrCryptoSymbol(args.symbol) ?? String(args.symbol).toUpperCase())
    : String(args.symbol).toUpperCase();
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
    throw new Error(
      `IBKR desconectado — pulsa «Reconectar Broker» en el dashboard (${symbol})`,
    );
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
        sec_type: crypto ? IBKR_CRYPTO_SEC_TYPE : "STK",
        currency: "USD",
        exchange: crypto ? IBKR_CRYPTO_EXCHANGE : "SMART",
        outside_rth: crypto ? true : args.outsideRth ?? false,
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

  // Paso 5 — Ejecutar orden (reqContractDetails en ibkr-broker)
  await ensureConnectedBeforeContractDetails(symbol);
  console.log(`[AutoExecute] ${symbol} → ejecutando orden IBKR…`);
  const executeBody = (skipContractDetails: boolean) =>
    ibkrServiceFetch<ProposalResponse>(`/api/proposals/${proposalId}/execute`, {
      method: "POST",
      body: JSON.stringify({
        approval_token: approvalToken,
        confirmation_phrase: `EXECUTE LIVE ${proposalId}`,
        skip_contract_details: skipContractDetails,
      }),
    });
  let executed: ProposalResponse;
  try {
    executed = await withBrokerRetry(symbol, "ejecutar orden", () => executeBody(false));
  } catch (err) {
    if (isOrderRejectedError(err)) {
      await notifyRejection(symbol, err);
      const payload =
        err instanceof Error && "payload" in err
          ? ((err as Error & { payload?: Record<string, unknown> }).payload ?? {})
          : {};
      throw new IbkrOrderRejectedError(
        symbol,
        err instanceof Error ? err.message : String(err),
        payload.ibkrRejectCode != null ? Number(payload.ibkrRejectCode) : null,
        String(payload.ibkrStatus ?? payload.ibkr_status ?? "REJECTED"),
      );
    }
    if (err instanceof IbkrSubmitTimeoutError || isTimeoutError(err)) {
      console.log(`[AutoExecute] ${symbol} → skip (timeout IBKR)`);
      throw err instanceof IbkrSubmitTimeoutError
        ? err
        : new IbkrSubmitTimeoutError(symbol, err instanceof Error ? err.message : String(err));
    }
    if (!isDisconnectError(err)) throw err;
    console.warn(
      `[AutoExecute] ${symbol} → reqContractDetails falló, reintento con contrato básico STK/SMART/USD`,
    );
    await ensureConnectedBeforeContractDetails(symbol);
    try {
      executed = await withBrokerRetry(symbol, "ejecutar orden (contrato básico)", () =>
        executeBody(true),
      );
    } catch (retryErr) {
      if (isOrderRejectedError(retryErr)) {
        await notifyRejection(symbol, retryErr);
        const payload =
          retryErr instanceof Error && "payload" in retryErr
            ? ((retryErr as Error & { payload?: Record<string, unknown> }).payload ?? {})
            : {};
        throw new IbkrOrderRejectedError(
          symbol,
          retryErr instanceof Error ? retryErr.message : String(retryErr),
          payload.ibkrRejectCode != null ? Number(payload.ibkrRejectCode) : null,
          String(payload.ibkrStatus ?? payload.ibkr_status ?? "REJECTED"),
        );
      }
      if (retryErr instanceof IbkrSubmitTimeoutError || isTimeoutError(retryErr)) {
        console.log(`[AutoExecute] ${symbol} → skip (timeout IBKR)`);
        throw retryErr instanceof IbkrSubmitTimeoutError
          ? retryErr
          : new IbkrSubmitTimeoutError(
              symbol,
              retryErr instanceof Error ? retryErr.message : String(retryErr),
            );
      }
      throw retryErr;
    }
  }

  if (String(executed.status ?? "").toUpperCase() === "REJECTED") {
    const reason =
      executed.reject_reason ||
      executed.ibkrError ||
      executed.ibkrRejectMessage ||
      "IBKR rejected";
    await notifyRejection(symbol, { payload: executed }, {
      code: executed.ibkrRejectCode ?? null,
      message: reason,
    });
    throw new IbkrOrderRejectedError(
      symbol,
      reason,
      executed.ibkrRejectCode ?? null,
      executed.ibkrStatus ?? executed.ibkr_status ?? "REJECTED",
    );
  }

  const ibkrOrderId = executed.ibkr_order_id ?? executed.ibkrOrderId;
  if (ibkrOrderId == null || String(ibkrOrderId).trim() === "") {
    throw new Error("IBKR execute returned without ibkr_order_id");
  }

  const ibkrStatus = executed.ibkrStatus ?? executed.ibkr_status ?? undefined;
  const accepted = new Set(["Submitted", "PreSubmitted", "Filled"]);
  if (ibkrStatus && !accepted.has(String(ibkrStatus))) {
    await notifyRejection(symbol, { payload: executed }, {
      code: executed.ibkrRejectCode ?? null,
      message: `IBKR status=${ibkrStatus}`,
    });
    throw new IbkrOrderRejectedError(
      symbol,
      `IBKR status=${ibkrStatus} — no EXECUTED`,
      executed.ibkrRejectCode ?? null,
      String(ibkrStatus),
    );
  }

  console.log(
    `[AutoExecute] ${symbol} → EJECUTADO ibkrId=${ibkrOrderId} status=${ibkrStatus ?? executed.status} ✅`,
  );
  return {
    proposalId,
    ibkrOrderId: String(ibkrOrderId),
    status: executed.status ?? "EXECUTED",
    ibkrStatus: ibkrStatus ?? undefined,
    ibkrPermId: executed.ibkrPermId ?? undefined,
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
