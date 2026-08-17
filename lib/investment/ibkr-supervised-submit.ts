/**
 * Supervised live submit — Telegram (or Execution Manager) is the human gate.
 * Completes IBKR FastAPI proposal → APPROVE → EXECUTE LIVE so TWS actually receives the order.
 */

import "server-only";

import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { getInvestmentRuntimeFlags } from "@/lib/investment/runtime-flags";

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

export async function submitSupervisedLiveLimitOrder(args: {
  readonly symbol: string;
  readonly side: "BUY" | "SELL";
  readonly quantity: number;
  readonly limitPrice: number;
  readonly outsideRth?: boolean;
  readonly rationale: string;
  readonly account?: string;
}): Promise<SupervisedSubmitResult> {
  const flags = getInvestmentRuntimeFlags();
  if (!flags.liveTradingEnabled || flags.ibkrReadOnly) {
    throw new Error(
      `Live IBKR submit blocked — LIVE_TRADING_ENABLED=${String(flags.liveTradingEnabled)} IBKR_READ_ONLY=${String(flags.ibkrReadOnly)}`,
    );
  }

  const rationale = (args.rationale.trim().length >= 10
    ? args.rationale
    : `${args.rationale} supervised live`
  ).slice(0, 4000);

  const proposal = await ibkrServiceFetch<ProposalResponse>("/api/proposals", {
    method: "POST",
    body: JSON.stringify({
      symbol: String(args.symbol).toUpperCase(),
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
  });

  const proposalId = proposal.id?.trim();
  if (!proposalId) {
    throw new Error("IBKR proposal missing id");
  }
  if (proposal.status === "BLOCKED") {
    const failed = (proposal.risk_checks ?? [])
      .filter((check) => check.passed === false)
      .map((check) => check.name ?? "risk")
      .join(", ");
    throw new Error(`IBKR proposal BLOCKED${failed ? `: ${failed}` : ""}`);
  }

  const decision = await ibkrServiceFetch<DecisionResponse>(
    `/api/proposals/${proposalId}/decision`,
    {
      method: "POST",
      body: JSON.stringify({
        decision: "APPROVE",
        confirmation_phrase: `APPROVE ${proposalId}`,
      }),
    },
  );

  const approvalToken = decision.approvalToken?.trim();
  if (!approvalToken) {
    throw new Error("IBKR approval token missing after supervised approve");
  }

  const executed = await ibkrServiceFetch<ProposalResponse>(
    `/api/proposals/${proposalId}/execute`,
    {
      method: "POST",
      body: JSON.stringify({
        approval_token: approvalToken,
        confirmation_phrase: `EXECUTE LIVE ${proposalId}`,
      }),
    },
  );

  const ibkrOrderId = executed.ibkr_order_id ?? executed.ibkrOrderId;
  if (ibkrOrderId == null || String(ibkrOrderId).trim() === "") {
    throw new Error("IBKR execute returned without ibkr_order_id");
  }

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
