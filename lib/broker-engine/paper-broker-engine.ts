import fs from "node:fs";
import path from "node:path";
import type { BrokerEngine, BrokerEngineRequest } from "@/src/core/application/ports/broker-engine";
import type { AccountMap, BrokerHealth, BrokerStatus, OpenOrder, Position, Proposal } from "./types";
import { normalizePath, parseJsonBody, routeNotSupported } from "./utils";

type ProposalDecision = { decision: "APPROVE" | "REJECT"; confirmation_phrase: string };
type ExecutePayload = { approval_token?: string; confirmation_phrase?: string };
type PaperOrderIntent = "ENTRY" | "EXIT" | "STOP" | "TARGET" | "TRAILING_STOP";
type PaperOrderStatus = "PENDING" | "PARTIALLY_FILLED" | "FILLED" | "CANCELED" | "REJECTED" | "EXPIRED" | "REPLACED";
type PaperEventType = "CREATED" | "DECISIONED" | "SENT" | "PARTIAL_FILL" | "FILLED" | "CANCELED" | "REJECTED" | "EXPIRED" | "REPLACED" | "TRAIL_UPDATED" | "RECONNECTED" | "RECONCILED_AFTER_RESTART";

type MarketSnapshot = {
  bid: number;
  ask: number;
  expectedPrice: number;
};

type PaperOperationMetrics = {
  originalSignal: Record<string, unknown>;
  decisionTime: string;
  sendTime: string;
  bid: number;
  ask: number;
  expectedPrice: number;
  executedPrice: number | null;
  slippage: number | null;
  commission: number;
  latencyMs: number;
  mae: number;
  mfe: number;
  pnl: number;
  exitReason: string | null;
};

type PaperOrderEvent = { type: PaperEventType; at: string; detail?: Record<string, unknown> };

type PaperOrder = {
  id: string;
  orderId: number;
  symbol: string;
  side: "BUY" | "SELL";
  intent: PaperOrderIntent;
  quantity: number;
  remainingQuantity: number;
  status: PaperOrderStatus;
  currency: string;
  exchange: string;
  sessionTag: string;
  regimeTag: string;
  market: MarketSnapshot;
  trailingOffset: number | null;
  trailingAnchor: number | null;
  createdAt: string;
  metrics: PaperOperationMetrics;
  events: PaperOrderEvent[];
  replacedBy: string | null;
};

type ClosedTrade = {
  tradeId: string;
  symbol: string;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  commission: number;
  mae: number;
  mfe: number;
  latencyMs: number;
  sessionTag: string;
  regimeTag: string;
  exitReason: string | null;
  closedAt: string;
  signalId?: string;
};

type PaperPositionState = { quantity: number; averageCost: number; realizedPnl: number };

type PaperState = {
  connected: boolean;
  nextOrderId: number;
  proposals: Proposal[];
  orders: PaperOrder[];
  closedTrades: ClosedTrade[];
  positions: Record<string, PaperPositionState>;
  journal: PaperOrderEvent[];
};

type PaperOrderCreatePayload = {
  signal?: Record<string, unknown>;
  symbol?: string;
  side?: "BUY" | "SELL";
  intent?: PaperOrderIntent;
  quantity?: number;
  currency?: string;
  exchange?: string;
  decisionTime?: string;
  sendTime?: string;
  bid?: number;
  ask?: number;
  expectedPrice?: number;
  sessionTag?: string;
  regimeTag?: string;
  trailingOffset?: number | null;
};

type PaperOrderEventPayload = {
  type:
    | "decision"
    | "send"
    | "fill"
    | "cancel"
    | "reject"
    | "expire"
    | "replace"
    | "mark"
    | "update_trailing";
  decisionTime?: string;
  sendTime?: string;
  price?: number;
  quantity?: number;
  commission?: number;
  reason?: string;
  expectedPrice?: number;
  replacement?: Partial<PaperOrderCreatePayload>;
  markPrice?: number;
  trailingOffset?: number;
  /** Optional event timestamp — used to backdate closed trades for certification windows. */
  at?: string;
};

export type PaperTradingCertificationReport = {
  type: "PaperTradingCertificationReport";
  generatedAt: string;
  tradingMode: "paper";
  liveTradingEnabled: false;
  evaluationWindow: { days: number; from: string; to: string };
  gates: {
    minimumClosedTrades: { required: number; actual: number; passed: boolean };
    minimumEvaluationDays: { required: number; actual: number; passed: boolean };
    multipleSessions: { required: number; actual: number; passed: boolean };
    multipleRegimes: { required: number; actual: number; passed: boolean };
  };
  performance: {
    totalPnl: number;
    averagePnl: number;
    winRate: number;
    averageLatencyMs: number;
    averageSlippage: number;
    averageCommission: number;
    averageMae: number;
    averageMfe: number;
    sharpe: number | null;
    sortino: number | null;
    maxDrawdownPct: number | null;
  };
  certified: boolean;
  closedTrades: ClosedTrade[];
};

export type PaperTradingPerformanceReport = {
  type: "PaperTradingPerformanceReport";
  generatedAt: string;
  tradingMode: "paper";
  liveTradingEnabled: false;
  startingEquity: number;
  endingEquity: number;
  totalPnl: number;
  winRate: number;
  tradeCount: number;
  averageLatencyMs: number;
  averageSlippage: number;
  averageCommission: number;
  averageMae: number;
  averageMfe: number;
  sharpe: number | null;
  sortino: number | null;
  maxDrawdownPct: number | null;
  equityCurve: number[];
};

const DEFAULT_STORE_PATH = path.resolve(process.cwd(), ".forgeos/registry/paper-trading-state.json");

function nowIso(): string {
  return new Date().toISOString();
}

function clampPositiveNumber(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value) || value === undefined || value <= 0) return fallback;
  return value;
}

function buildInitialState(): PaperState {
  return {
    connected: false,
    nextOrderId: 1,
    proposals: [],
    orders: [],
    closedTrades: [],
    positions: {},
    journal: [],
  };
}

function getStorePath(): string {
  return process.env.PAPER_TRADING_STORE_PATH ? path.resolve(process.env.PAPER_TRADING_STORE_PATH) : DEFAULT_STORE_PATH;
}

function loadState(): PaperState {
  const statePath = getStorePath();
  if (!fs.existsSync(statePath)) return buildInitialState();
  const raw = fs.readFileSync(statePath, "utf8").replace(/^\uFEFF/, "");
  const parsed = JSON.parse(raw) as Partial<PaperState>;
  return {
    ...buildInitialState(),
    ...parsed,
    proposals: Array.isArray(parsed.proposals) ? parsed.proposals : [],
    orders: Array.isArray(parsed.orders) ? parsed.orders : [],
    closedTrades: Array.isArray(parsed.closedTrades) ? parsed.closedTrades : [],
    journal: Array.isArray(parsed.journal) ? parsed.journal : [],
    positions: parsed.positions ?? {},
  };
}

function persistState(state: PaperState): void {
  const statePath = getStorePath();
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), "utf8");
}

const health: BrokerHealth = {
  ok: true,
  liveTradingEnabled: false,
  ibkrReadOnly: true,
  emergencyStop: false,
};

const account: AccountMap = {
  PAPER_SIM: {
    NetLiquidation: { value: "100000", currency: "USD" },
    AvailableFunds: { value: "100000", currency: "USD" },
    BuyingPower: { value: "100000", currency: "USD" },
  },
};

export class PaperBrokerEngine implements BrokerEngine {
  readonly name = "paper" as const;
  private readonly state: PaperState;

  constructor() {
    this.state = loadState();
    this.reconcileAfterRestart();
  }

  async request<T>(request: BrokerEngineRequest): Promise<T> {
    const pathValue = normalizePath(request.path);
    if (request.method === "GET" && pathValue === "/health") return health as T;
    if (request.method === "POST" && pathValue === "/api/ibkr/connect") return this.connect() as T;
    if (request.method === "POST" && pathValue === "/api/paper-trading/reconnect") return this.connect(true) as T;
    if (request.method === "GET" && pathValue === "/api/ibkr/status") return this.status() as T;
    if (request.method === "GET" && pathValue === "/api/ibkr/account") return account as T;
    if (request.method === "GET" && pathValue === "/api/ibkr/positions") return this.positions() as T;
    if (request.method === "GET" && pathValue === "/api/ibkr/orders") return this.openOrders() as T;
    if (request.method === "GET" && pathValue === "/api/proposals") return this.state.proposals as T;
    if (request.method === "POST" && pathValue === "/api/proposals") return this.createProposal(request.body) as T;
    if (request.method === "POST" && pathValue.startsWith("/api/proposals/") && pathValue.endsWith("/decision")) {
      return this.decideProposal(pathValue, request.body) as T;
    }
    if (request.method === "POST" && pathValue.startsWith("/api/proposals/") && pathValue.endsWith("/execute")) {
      return this.executeProposal(pathValue, request.body) as T;
    }
    if (request.method === "GET" && pathValue === "/api/paper-trading/state") return this.state as T;
    if (request.method === "POST" && pathValue === "/api/paper-trading/orders") {
      return this.createPaperOrder(parseJsonBody<PaperOrderCreatePayload>(request.body)) as T;
    }
    if (request.method === "POST" && pathValue.startsWith("/api/paper-trading/orders/") && pathValue.endsWith("/events")) {
      return this.applyPaperOrderEvent(pathValue, parseJsonBody<PaperOrderEventPayload>(request.body)) as T;
    }
    if (request.method === "GET" && pathValue === "/api/paper-trading/certification-report") {
      return this.generateCertificationReport() as T;
    }
    if (request.method === "GET" && pathValue === "/api/paper-trading/performance-report") {
      return this.generatePerformanceReport() as T;
    }
    routeNotSupported(pathValue);
  }

  private connect(isReconnect = false): BrokerStatus {
    this.state.connected = true;
    if (isReconnect) this.pushJournal("RECONNECTED");
    this.persist();
    return this.status();
  }

  private status(): BrokerStatus {
    return {
      connected: this.state.connected,
      nextOrderIdReady: this.state.connected,
      nextValidId: this.state.connected ? this.state.nextOrderId : null,
      managedAccounts: ["PAPER_SIM"],
      recentErrors: [],
      ibkrReadOnly: true,
      liveTradingEnabled: false,
    };
  }

  private positions(): Position[] {
    return Object.entries(this.state.positions)
      .filter(([, pos]) => pos.quantity !== 0)
      .map(([symbol, pos]) => ({
        account: "PAPER_SIM",
        symbol,
        secType: "STK",
        exchange: "SMART",
        currency: "USD",
        position: pos.quantity,
        avgCost: pos.averageCost,
      }));
  }

  private openOrders(): OpenOrder[] {
    return this.state.orders
      .filter((order) => !["FILLED", "CANCELED", "REJECTED", "EXPIRED", "REPLACED"].includes(order.status))
      .map((order) => ({
        orderId: order.orderId,
        symbol: order.symbol,
        action: order.side,
        orderType: "LMT",
        quantity: order.remainingQuantity,
        limitPrice: order.market.expectedPrice,
        status: order.status,
      }));
  }

  private createProposal(body?: string): Proposal {
    const payload = parseJsonBody<Partial<Proposal>>(body);
    const created: Proposal = {
      id: `paper-${this.state.proposals.length + 1}`,
      status: "PENDING",
      symbol: String(payload.symbol ?? "AAPL").toUpperCase(),
      side: payload.side === "SELL" ? "SELL" : "BUY",
      quantity: Number(payload.quantity ?? 1),
      order_type: "LMT",
      limit_price: Number(payload.limit_price ?? 1),
      currency: String(payload.currency ?? "USD").toUpperCase(),
      exchange: String(payload.exchange ?? "SMART").toUpperCase(),
      rationale: String(payload.rationale ?? "Paper broker simulation"),
      risk_checks: [{ name: "paper_safe_mode", passed: true, detail: "no live execution" }],
    };
    this.state.proposals.unshift(created);
    this.persist();
    return created;
  }

  private decideProposal(pathValue: string, body?: string): { proposal: Proposal } {
    const proposalId = pathValue.split("/")[3];
    const payload = parseJsonBody<ProposalDecision>(body);
    const proposal = this.state.proposals.find((item) => item.id === proposalId);
    if (!proposal) throw new Error("Propuesta no encontrada");
    if (payload.decision === "REJECT") proposal.status = "REJECTED";
    if (payload.decision === "APPROVE") proposal.status = "APPROVED";
    this.persist();
    return { proposal };
  }

  private executeProposal(pathValue: string, body?: string): Proposal {
    const proposalId = pathValue.split("/")[3];
    parseJsonBody<ExecutePayload>(body);
    const proposal = this.state.proposals.find((item) => item.id === proposalId);
    if (!proposal) throw new Error("Propuesta no encontrada");
    if (proposal.status !== "APPROVED") throw new Error("Estado no ejecutable");
    proposal.status = "EXECUTED";
    this.createPaperOrder({
      signal: { proposalId: proposal.id, rationale: proposal.rationale },
      symbol: proposal.symbol,
      side: proposal.side,
      intent: "ENTRY",
      quantity: proposal.quantity,
      currency: proposal.currency,
      exchange: proposal.exchange,
      expectedPrice: proposal.limit_price,
      bid: Math.max(0, proposal.limit_price - 0.01),
      ask: proposal.limit_price + 0.01,
      sessionTag: "session-default",
      regimeTag: "regime-unknown",
    });
    this.persist();
    return proposal;
  }

  private createPaperOrder(payload: PaperOrderCreatePayload): PaperOrder {
    const createdAt = nowIso();
    const quantity = clampPositiveNumber(payload.quantity, 1);
    const expectedPrice = clampPositiveNumber(payload.expectedPrice, 1);
    const bid = clampPositiveNumber(payload.bid, expectedPrice - 0.01);
    const ask = clampPositiveNumber(payload.ask, expectedPrice + 0.01);
    const order: PaperOrder = {
      id: `porder-${this.state.nextOrderId}`,
      orderId: this.state.nextOrderId++,
      symbol: String(payload.symbol ?? "AAPL").toUpperCase(),
      side: payload.side === "SELL" ? "SELL" : "BUY",
      intent: payload.intent ?? "ENTRY",
      quantity,
      remainingQuantity: quantity,
      status: "PENDING",
      currency: String(payload.currency ?? "USD").toUpperCase(),
      exchange: String(payload.exchange ?? "SMART").toUpperCase(),
      sessionTag: payload.sessionTag ?? "session-default",
      regimeTag: payload.regimeTag ?? "regime-unknown",
      market: { bid, ask, expectedPrice },
      trailingOffset: payload.trailingOffset ?? null,
      trailingAnchor: payload.trailingOffset ? expectedPrice : null,
      createdAt,
      metrics: {
        originalSignal: payload.signal ?? {},
        decisionTime: payload.decisionTime ?? createdAt,
        sendTime: payload.sendTime ?? createdAt,
        bid,
        ask,
        expectedPrice,
        executedPrice: null,
        slippage: null,
        commission: 0,
        latencyMs: Math.max(0, new Date(payload.sendTime ?? createdAt).getTime() - new Date(payload.decisionTime ?? createdAt).getTime()),
        mae: 0,
        mfe: 0,
        pnl: 0,
        exitReason: null,
      },
      events: [{ type: "CREATED", at: createdAt }],
      replacedBy: null,
    };
    this.state.orders.unshift(order);
    this.pushJournal("CREATED", { orderId: order.id, intent: order.intent });
    this.persist();
    return order;
  }

  private applyPaperOrderEvent(pathValue: string, payload: PaperOrderEventPayload): { order: PaperOrder; replacementOrder?: PaperOrder } {
    const orderId = pathValue.split("/")[4];
    const order = this.state.orders.find((item) => item.id === orderId);
    if (!order) throw new Error(`Paper order not found: ${orderId}`);

    if (payload.type === "decision") {
      order.metrics.decisionTime = payload.decisionTime ?? nowIso();
      order.events.unshift({ type: "DECISIONED", at: order.metrics.decisionTime });
    } else if (payload.type === "send") {
      order.metrics.sendTime = payload.sendTime ?? nowIso();
      order.metrics.latencyMs = Math.max(
        0,
        new Date(order.metrics.sendTime).getTime() - new Date(order.metrics.decisionTime).getTime(),
      );
      order.events.unshift({ type: "SENT", at: order.metrics.sendTime });
    } else if (payload.type === "fill") {
      const fillQty = clampPositiveNumber(payload.quantity, order.remainingQuantity);
      const fillPrice = clampPositiveNumber(payload.price, order.market.expectedPrice);
      const commission = Math.max(0, payload.commission ?? 0);
      const filledBefore = order.quantity - order.remainingQuantity;
      order.remainingQuantity = Math.max(0, order.remainingQuantity - fillQty);
      order.metrics.commission += commission;
      order.metrics.executedPrice =
        order.metrics.executedPrice === null
          ? fillPrice
          : (order.metrics.executedPrice * filledBefore + fillPrice * fillQty) / Math.max(1, filledBefore + fillQty);
      order.metrics.slippage = order.metrics.executedPrice - order.metrics.expectedPrice;
      order.status = order.remainingQuantity > 0 ? "PARTIALLY_FILLED" : "FILLED";
      if (payload.reason) order.metrics.exitReason = payload.reason;
      order.events.unshift({ type: order.status === "FILLED" ? "FILLED" : "PARTIAL_FILL", at: nowIso(), detail: { fillQty, fillPrice } });
      this.applyFillToPosition(order, fillQty, fillPrice, payload.reason ?? null, payload.at);
    } else if (payload.type === "cancel") {
      order.status = "CANCELED";
      order.metrics.exitReason = payload.reason ?? "manual_cancel";
      order.events.unshift({ type: "CANCELED", at: nowIso(), detail: { reason: order.metrics.exitReason } });
    } else if (payload.type === "reject") {
      order.status = "REJECTED";
      order.metrics.exitReason = payload.reason ?? "broker_rejection";
      order.events.unshift({ type: "REJECTED", at: nowIso(), detail: { reason: order.metrics.exitReason } });
    } else if (payload.type === "expire") {
      order.status = "EXPIRED";
      order.metrics.exitReason = payload.reason ?? "order_expired";
      order.events.unshift({ type: "EXPIRED", at: nowIso(), detail: { reason: order.metrics.exitReason } });
    } else if (payload.type === "mark") {
      this.applyPriceMark(order, clampPositiveNumber(payload.markPrice, order.market.expectedPrice));
    } else if (payload.type === "update_trailing") {
      if (order.intent !== "TRAILING_STOP") throw new Error("Trailing updates require TRAILING_STOP intent.");
      order.trailingOffset = clampPositiveNumber(payload.trailingOffset, order.trailingOffset ?? 0.1);
      order.events.unshift({ type: "TRAIL_UPDATED", at: nowIso(), detail: { trailingOffset: order.trailingOffset } });
    } else if (payload.type === "replace") {
      order.status = "REPLACED";
      order.metrics.exitReason = payload.reason ?? "order_replaced";
      order.events.unshift({ type: "REPLACED", at: nowIso(), detail: { reason: order.metrics.exitReason } });
      const replacementOrder = this.createPaperOrder({
        signal: { replacedOrderId: order.id, ...(payload.replacement?.signal ?? {}) },
        symbol: payload.replacement?.symbol ?? order.symbol,
        side: payload.replacement?.side ?? order.side,
        intent: payload.replacement?.intent ?? order.intent,
        quantity: payload.replacement?.quantity ?? order.remainingQuantity,
        currency: payload.replacement?.currency ?? order.currency,
        exchange: payload.replacement?.exchange ?? order.exchange,
        decisionTime: payload.decisionTime ?? nowIso(),
        sendTime: payload.sendTime ?? nowIso(),
        bid: payload.replacement?.bid ?? order.market.bid,
        ask: payload.replacement?.ask ?? order.market.ask,
        expectedPrice: payload.replacement?.expectedPrice ?? payload.expectedPrice ?? order.market.expectedPrice,
        sessionTag: payload.replacement?.sessionTag ?? order.sessionTag,
        regimeTag: payload.replacement?.regimeTag ?? order.regimeTag,
        trailingOffset: payload.replacement?.trailingOffset ?? order.trailingOffset,
      });
      order.replacedBy = replacementOrder.id;
      this.persist();
      return { order, replacementOrder };
    } else {
      throw new Error(`Unsupported paper order event type: ${String((payload as { type?: string }).type ?? "")}`);
    }

    this.persist();
    return { order };
  }

  private applyPriceMark(order: PaperOrder, markPrice: number): void {
    const referencePrice = order.metrics.executedPrice ?? order.market.expectedPrice;
    const favorableMove = order.side === "BUY" ? markPrice - referencePrice : referencePrice - markPrice;
    const adverseMove = order.side === "BUY" ? referencePrice - markPrice : markPrice - referencePrice;
    order.metrics.mfe = Math.max(order.metrics.mfe, favorableMove);
    order.metrics.mae = Math.max(order.metrics.mae, adverseMove);

    if (order.intent === "TRAILING_STOP" && order.trailingOffset !== null) {
      if (order.side === "SELL") {
        order.trailingAnchor = order.trailingAnchor === null ? markPrice : Math.max(order.trailingAnchor, markPrice);
        const triggerPrice = order.trailingAnchor - order.trailingOffset;
        if (markPrice <= triggerPrice && order.remainingQuantity > 0) {
          this.applyPaperOrderEvent(`/api/paper-trading/orders/${order.id}/events`, {
            type: "fill",
            quantity: order.remainingQuantity,
            price: markPrice,
            reason: "trailing_stop_triggered",
          });
        }
      } else {
        order.trailingAnchor = order.trailingAnchor === null ? markPrice : Math.min(order.trailingAnchor, markPrice);
        const triggerPrice = order.trailingAnchor + order.trailingOffset;
        if (markPrice >= triggerPrice && order.remainingQuantity > 0) {
          this.applyPaperOrderEvent(`/api/paper-trading/orders/${order.id}/events`, {
            type: "fill",
            quantity: order.remainingQuantity,
            price: markPrice,
            reason: "trailing_stop_triggered",
          });
        }
      }
    }
  }

  private applyFillToPosition(
    order: PaperOrder,
    fillQty: number,
    fillPrice: number,
    exitReason: string | null,
    closedAtOverride?: string,
  ): void {
    const pos = this.state.positions[order.symbol] ?? { quantity: 0, averageCost: 0, realizedPnl: 0 };
    const signedQty = order.side === "BUY" ? fillQty : -fillQty;
    const previousQty = pos.quantity;
    const closedAt = closedAtOverride ?? nowIso();
    if (previousQty === 0) {
      pos.quantity = signedQty;
      pos.averageCost = fillPrice;
    } else if (Math.sign(previousQty) === Math.sign(signedQty)) {
      const totalCostBefore = pos.averageCost * Math.abs(previousQty);
      const totalCostAfter = totalCostBefore + fillPrice * fillQty;
      pos.quantity = previousQty + signedQty;
      pos.averageCost = Math.abs(pos.quantity) === 0 ? 0 : totalCostAfter / Math.abs(pos.quantity);
    } else {
      const absPrevious = Math.abs(previousQty);
      const absIncoming = Math.abs(signedQty);
      const closingQty = Math.min(absPrevious, absIncoming);
      const pnlPerUnit = previousQty > 0 ? fillPrice - pos.averageCost : pos.averageCost - fillPrice;
      const pnl = pnlPerUnit * closingQty;
      pos.realizedPnl += pnl;
      order.metrics.pnl += pnl;
      order.metrics.exitReason = exitReason;
      const signalIdRaw = order.metrics.originalSignal?.signalId;
      const signalId =
        typeof signalIdRaw === "string" && signalIdRaw.trim() ? signalIdRaw.trim() : undefined;
      this.state.closedTrades.unshift({
        tradeId: `ptrade-${order.orderId}-${this.state.closedTrades.length + 1}`,
        symbol: order.symbol,
        quantity: closingQty,
        entryPrice: pos.averageCost,
        exitPrice: fillPrice,
        pnl,
        commission: order.metrics.commission,
        mae: order.metrics.mae,
        mfe: order.metrics.mfe,
        latencyMs: order.metrics.latencyMs,
        sessionTag: order.sessionTag,
        regimeTag: order.regimeTag,
        exitReason,
        closedAt,
        ...(signalId ? { signalId } : {}),
      });

      const remainingToOpen = absIncoming - closingQty;
      const nextSign = Math.sign(signedQty);
      pos.quantity = (absPrevious - closingQty) * Math.sign(previousQty);
      if (pos.quantity === 0 && remainingToOpen > 0) {
        pos.quantity = remainingToOpen * nextSign;
        pos.averageCost = fillPrice;
      } else if (pos.quantity === 0) {
        pos.averageCost = 0;
      }
    }

    this.state.positions[order.symbol] = pos;
  }

  private computeRiskRatios(closedTrades: ClosedTrade[], startingEquity = 100_000): {
    sharpe: number | null;
    sortino: number | null;
    maxDrawdownPct: number | null;
    equityCurve: number[];
    averageMae: number;
    averageMfe: number;
  } {
    const sorted = [...closedTrades].sort((a, b) => a.closedAt.localeCompare(b.closedAt));
    const equityCurve: number[] = [startingEquity];
    const periodReturns: number[] = [];
    let equity = startingEquity;
    for (const trade of sorted) {
      const next = equity + trade.pnl - trade.commission;
      periodReturns.push(equity > 0 ? (next - equity) / equity : 0);
      equity = next;
      equityCurve.push(equity);
    }
    const mean =
      periodReturns.length === 0 ? null : periodReturns.reduce((sum, value) => sum + value, 0) / periodReturns.length;
    const variance =
      mean === null || periodReturns.length < 2
        ? null
        : periodReturns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (periodReturns.length - 1);
    const std = variance === null ? null : Math.sqrt(variance);
    const downsideSquares = periodReturns.filter((value) => value < 0).map((value) => value ** 2);
    const downside =
      periodReturns.length === 0
        ? null
        : downsideSquares.length === 0
          ? 0
          : Math.sqrt(downsideSquares.reduce((sum, value) => sum + value, 0) / periodReturns.length);
    let peak = equityCurve[0] ?? startingEquity;
    let worst = 0;
    for (const nav of equityCurve) {
      if (nav > peak) peak = nav;
      if (peak > 0) worst = Math.max(worst, (peak - nav) / peak);
    }
    return {
      sharpe: mean !== null && std !== null && std > 0 ? mean / std : null,
      sortino: mean !== null && downside !== null && downside > 0 ? mean / downside : null,
      maxDrawdownPct: equityCurve.length < 2 ? null : worst * 100,
      equityCurve,
      averageMae: sorted.length === 0 ? 0 : sorted.reduce((sum, trade) => sum + trade.mae, 0) / sorted.length,
      averageMfe: sorted.length === 0 ? 0 : sorted.reduce((sum, trade) => sum + trade.mfe, 0) / sorted.length,
    };
  }

  private generateCertificationReport(days = 30, minimumClosedTrades = 100): PaperTradingCertificationReport {
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    // Allow small clock/runtime skew so long certification runs remain inside the window.
    const windowSkewMs = 5 * 60 * 1000;
    const inWindow = this.state.closedTrades.filter((trade) => {
      const closedAt = new Date(trade.closedAt).getTime();
      return closedAt >= from.getTime() - windowSkewMs && closedAt <= to.getTime() + windowSkewMs;
    });
    const sessions = new Set(inWindow.map((trade) => trade.sessionTag));
    const regimes = new Set(inWindow.map((trade) => trade.regimeTag));
    const totalPnl = inWindow.reduce((sum, trade) => sum + trade.pnl, 0);
    const wins = inWindow.filter((trade) => trade.pnl > 0).length;
    const avgLatency = inWindow.length === 0 ? 0 : inWindow.reduce((sum, trade) => sum + trade.latencyMs, 0) / inWindow.length;
    const avgCommission = inWindow.length === 0 ? 0 : inWindow.reduce((sum, trade) => sum + trade.commission, 0) / inWindow.length;
    const avgSlippage =
      inWindow.length === 0
        ? 0
        : this.state.orders
            .filter((order) => order.metrics.slippage !== null)
            .reduce((sum, order) => sum + (order.metrics.slippage ?? 0), 0) /
          Math.max(1, this.state.orders.filter((order) => order.metrics.slippage !== null).length);
    const oldestTrade = [...inWindow].sort((a, b) => a.closedAt.localeCompare(b.closedAt))[0];
    const evaluationDaysExact = oldestTrade
      ? (to.getTime() - new Date(oldestTrade.closedAt).getTime()) / (24 * 60 * 60 * 1000)
      : 0;
    const evaluationDaysCovered = Math.floor(evaluationDaysExact);
    const ratios = this.computeRiskRatios(inWindow);

    const report: PaperTradingCertificationReport = {
      type: "PaperTradingCertificationReport",
      generatedAt: nowIso(),
      tradingMode: "paper",
      liveTradingEnabled: false,
      evaluationWindow: { days, from: from.toISOString(), to: to.toISOString() },
      gates: {
        minimumClosedTrades: { required: minimumClosedTrades, actual: inWindow.length, passed: inWindow.length >= minimumClosedTrades },
        minimumEvaluationDays: {
          required: days,
          actual: evaluationDaysCovered,
          passed: evaluationDaysExact + windowSkewMs / (24 * 60 * 60 * 1000) >= days,
        },
        multipleSessions: { required: 2, actual: sessions.size, passed: sessions.size >= 2 },
        multipleRegimes: { required: 2, actual: regimes.size, passed: regimes.size >= 2 },
      },
      performance: {
        totalPnl,
        averagePnl: inWindow.length === 0 ? 0 : totalPnl / inWindow.length,
        winRate: inWindow.length === 0 ? 0 : wins / inWindow.length,
        averageLatencyMs: avgLatency,
        averageSlippage: avgSlippage,
        averageCommission: avgCommission,
        averageMae: ratios.averageMae,
        averageMfe: ratios.averageMfe,
        sharpe: ratios.sharpe,
        sortino: ratios.sortino,
        maxDrawdownPct: ratios.maxDrawdownPct,
      },
      certified: false,
      closedTrades: inWindow,
    };

    report.certified =
      report.gates.minimumClosedTrades.passed &&
      report.gates.minimumEvaluationDays.passed &&
      report.gates.multipleSessions.passed &&
      report.gates.multipleRegimes.passed;
    return report;
  }

  private generatePerformanceReport(startingEquity = 100_000): PaperTradingPerformanceReport {
    const ratios = this.computeRiskRatios(this.state.closedTrades, startingEquity);
    const endingEquity = ratios.equityCurve[ratios.equityCurve.length - 1] ?? startingEquity;
    const totalPnl = endingEquity - startingEquity;
    const wins = this.state.closedTrades.filter((trade) => trade.pnl > 0).length;
    const avgLatency =
      this.state.closedTrades.length === 0
        ? 0
        : this.state.closedTrades.reduce((sum, trade) => sum + trade.latencyMs, 0) / this.state.closedTrades.length;
    const avgCommission =
      this.state.closedTrades.length === 0
        ? 0
        : this.state.closedTrades.reduce((sum, trade) => sum + trade.commission, 0) / this.state.closedTrades.length;
    const slippageOrders = this.state.orders.filter((order) => order.metrics.slippage !== null);
    const avgSlippage =
      slippageOrders.length === 0
        ? 0
        : slippageOrders.reduce((sum, order) => sum + (order.metrics.slippage ?? 0), 0) / slippageOrders.length;

    return {
      type: "PaperTradingPerformanceReport",
      generatedAt: nowIso(),
      tradingMode: "paper",
      liveTradingEnabled: false,
      startingEquity,
      endingEquity,
      totalPnl,
      winRate: this.state.closedTrades.length === 0 ? 0 : wins / this.state.closedTrades.length,
      tradeCount: this.state.closedTrades.length,
      averageLatencyMs: avgLatency,
      averageSlippage: avgSlippage,
      averageCommission: avgCommission,
      averageMae: ratios.averageMae,
      averageMfe: ratios.averageMfe,
      sharpe: ratios.sharpe,
      sortino: ratios.sortino,
      maxDrawdownPct: ratios.maxDrawdownPct,
      equityCurve: ratios.equityCurve,
    };
  }

  private reconcileAfterRestart(): void {
    if (this.state.orders.length === 0) return;
    this.pushJournal("RECONCILED_AFTER_RESTART", { openOrders: this.openOrders().length });
    this.persist();
  }

  private pushJournal(type: PaperEventType, detail?: Record<string, unknown>): void {
    this.state.journal.unshift({ type, at: nowIso(), detail });
  }

  private persist(): void {
    persistState(this.state);
  }
}

export function createPaperBrokerEngine(): BrokerEngine {
  return new PaperBrokerEngine();
}
