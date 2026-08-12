import "server-only";

import { maskAccountId, maskAccountList } from "@/lib/ibkr/account-mask";
import {
  evaluateStrategyReadinessHarness,
  harnessStatusToReadiness,
} from "@/lib/investment/strategy-readiness-harness";
import type {
  LiveActiveSignalRow,
  LiveApprovalRow,
  LiveAuditLogRow,
  LiveCandidateRow,
  LiveCircuitBreakerRow,
  LiveDailyRiskSnapshot,
  LiveDataFreshness,
  LiveOpenOrderRow,
  LivePositionRow,
  LiveReadinessItem,
  LiveTradingDashboardReadModel,
  LiveTradingSafetyFlags,
  ReadinessStatus,
} from "@/components/investment/live-dashboard.types";
import {
  createAutonomousLiveOrchestrator,
  ENSEMBLE_STRATEGY_IDS,
  INITIAL_AUTONOMOUS_LIVE_LIMITS,
  loadAutonomousLiveLimits,
  overlayPortfolioRisk,
  resolveAutonomousLockState,
  resolveTradingMode,
  runContinuousAnalysis,
  type AnalysisUniverseSymbol,
} from "@/src/core/investment/autonomous-live";
import { defaultLiveExecutionStorePath, FileExecutionStorage } from "@/src/core/investment/live-execution";

function nowIso(): string {
  return new Date().toISOString();
}

function envFlagTrue(name: string): boolean {
  return process.env[name] === "true";
}

function envFlagFalse(name: string): boolean {
  return process.env[name] === "false";
}

function readiness(
  id: string,
  label: string,
  status: ReadinessStatus,
  detail: string,
): LiveReadinessItem {
  return { id, label, status, detail };
}

function buildSafetyFlags(): LiveTradingSafetyFlags {
  const liveTradingEnabled = envFlagTrue("LIVE_TRADING_ENABLED");
  const ibkrReadOnly = !envFlagFalse("IBKR_READ_ONLY");
  const tradingMode = resolveTradingMode(process.env.TRADING_MODE ?? "ANALYSIS_ONLY");
  const autonomousLock = resolveAutonomousLockState({
    tradingMode: tradingMode === "AUTONOMOUS_LIVE" ? "AUTONOMOUS_LIVE" : tradingMode,
    liveTradingEnabled,
    ibkrReadOnly,
    halted: envFlagTrue("EMERGENCY_STOP"),
    certificationUnlocked: false,
  });
  const mode =
    tradingMode === "AUTONOMOUS_LIVE"
      ? ("AUTONOMOUS_LIVE" as const)
      : tradingMode === "ANALYSIS_ONLY"
        ? ("ANALYSIS_ONLY" as const)
        : ("SUPERVISED" as const);

  return {
    liveTradingEnabled,
    ibkrReadOnly,
    tradingMode,
    mode,
    state: autonomousLock === "ACTIVE" ? "ACTIVE" : autonomousLock === "HALTED" ? "HALTED" : "LOCKED",
    autonomousLock,
    emergencyStop: envFlagTrue("EMERGENCY_STOP"),
    blockNewEntries: true,
    reduceOnly: true,
    executionDisconnected: !liveTradingEnabled || ibkrReadOnly,
  };
}

async function fetchBrokerJson(path: string): Promise<{ ok: boolean; value: unknown; error?: string }> {
  try {
    const { createIbkrBrokerEngine } = await import("@/lib/broker-engine");
    const engine = createIbkrBrokerEngine();
    const value = await engine.request({ path, method: "GET" });
    return { ok: true, value };
  } catch (error) {
    return {
      ok: false,
      value: null,
      error: error instanceof Error ? error.message : "Broker unavailable",
    };
  }
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function mapOrders(raw: unknown): LiveOpenOrderRow[] {
  return asArray(raw).map((item, index) => {
    const row = asObject(item) ?? {};
    return {
      orderId: String(row.orderId ?? row.id ?? `order-${index}`),
      symbol: String(row.symbol ?? "—"),
      action: String(row.action ?? row.side ?? "—"),
      orderType: String(row.orderType ?? row.order_type ?? "—"),
      quantity: Number(row.quantity ?? row.qty ?? 0),
      limitPrice:
        row.limitPrice == null && row.lmtPrice == null ? null : Number(row.limitPrice ?? row.lmtPrice),
      status: String(row.status ?? "UNKNOWN"),
    };
  });
}

function mapPositions(raw: unknown): LivePositionRow[] {
  return asArray(raw).map((item, index) => {
    const row = asObject(item) ?? {};
    const accountRaw = String(row.account ?? "");
    return {
      account: maskAccountId(accountRaw),
      symbol: String(row.symbol ?? `POS-${index}`),
      position: Number(row.position ?? row.quantity ?? 0),
      avgCost: Number(row.avgCost ?? row.averageCost ?? 0),
      stopProtection: typeof row.stopPrice === "number" ? String(row.stopPrice) : "NO_DATA",
      targetProtection: typeof row.targetPrice === "number" ? String(row.targetPrice) : "NO_DATA",
      marketPrice:
        row.marketPrice == null && row.mktPrice == null
          ? null
          : Number(row.marketPrice ?? row.mktPrice),
      unrealizedPnl:
        row.unrealizedPnl == null && row.unrealizedPNL == null
          ? null
          : Number(row.unrealizedPnl ?? row.unrealizedPNL),
    };
  });
}

async function loadApprovalsFromStore(): Promise<LiveApprovalRow[]> {
  try {
    const storage = new FileExecutionStorage(defaultLiveExecutionStorePath());
    const now = nowIso();
    const pending = await storage.listPendingApprovals(now);
    return pending.map((token) => ({
      id: token.approvalId,
      candidateId: token.draftId,
      symbol: "NO_DATA",
      side: "BUY" as const,
      qty: 0,
      status: "PENDING_REVIEW" as const,
      expiresAt: token.expiresAt,
      firstConfirmedAt: token.firstConfirmedAt ?? null,
      secondConfirmedAt: token.secondConfirmedAt ?? null,
      note: "Stored approval token — execution disabled while LOCKED",
    }));
  } catch {
    return [];
  }
}

async function loadAuditLog(): Promise<LiveAuditLogRow[]> {
  try {
    const storage = new FileExecutionStorage(defaultLiveExecutionStorePath());
    const audit = await storage.listAudit();
    return audit.slice(-40).reverse().map((entry) => ({
      id: entry.id,
      at: entry.at,
      event: entry.event,
      detail: JSON.stringify(entry.details).slice(0, 180),
    }));
  } catch {
    return [];
  }
}

function defaultUniverse(now: string): AnalysisUniverseSymbol[] {
  // Analysis placeholders — LIVE required for TRADE; these are UNKNOWN until IBKR quote feed wires in.
  return ["AAPL", "MSFT", "SPY"].map((symbol) => ({
    symbol,
    bid: 0,
    ask: 0,
    last: 0,
    volume: 0,
    quoteAt: now,
    liveOrDelayed: "unknown" as const,
  }));
}

function buildReadiness(args: {
  safety: LiveTradingSafetyFlags;
  health: Record<string, unknown> | null;
  status: Record<string, unknown> | null;
  healthError?: string;
  statusError?: string;
  dataFreshness: LiveDataFreshness;
  analysisOk: boolean;
  paperCertStatus?: "OK" | "WARN" | "NO_DATA" | "FAIL" | "UNKNOWN";
  paperCertDetail?: string;
  shadowCertStatus?: "OK" | "WARN" | "NO_DATA" | "FAIL" | "UNKNOWN";
  shadowCertDetail?: string;
}): LiveReadinessItem[] {
  const connected = Boolean(args.status?.connected);
  const nextReady = Boolean(args.status?.nextOrderIdReady);
  const nextValidId = args.status?.nextValidId;
  const accounts = Array.isArray(args.status?.managedAccounts)
    ? (args.status!.managedAccounts as string[])
    : [];
  const masked = maskAccountList(accounts);
  const emergency = Boolean(args.health?.emergencyStop) || args.safety.emergencyStop;
  const limits = loadAutonomousLiveLimits();

  return [
    readiness(
      "tws",
      "TWS / IB Gateway",
      connected ? "OK" : args.statusError ? "FAIL" : "UNKNOWN",
      connected ? "Connected" : args.statusError ?? "Not connected",
    ),
    readiness(
      "ibkr-api",
      "IBKR API",
      args.health ? (args.health.ok === false ? "WARN" : "OK") : args.healthError ? "FAIL" : "UNKNOWN",
      args.health ? `health.ok=${String(args.health.ok)}` : args.healthError ?? "NO_DATA",
    ),
    readiness(
      "fastapi",
      "FastAPI broker service",
      args.health || args.status ? "OK" : args.healthError || args.statusError ? "FAIL" : "UNKNOWN",
      args.healthError || args.statusError || "Reachable via BrokerEngine",
    ),
    readiness(
      "next-valid-id",
      "nextValidId",
      nextReady ? "OK" : connected ? "WARN" : "UNKNOWN",
      nextValidId != null ? String(nextValidId) : nextReady ? "ready" : "not ready",
    ),
    readiness(
      "accounts",
      "Accounts",
      masked.length > 0 ? "OK" : connected ? "WARN" : "NO_DATA",
      masked.length > 0 ? masked.join(", ") : "NO_DATA",
    ),
    readiness(
      "market-data",
      "Market data",
      args.dataFreshness === "LIVE" ? "OK" : args.dataFreshness === "DELAYED" ? "WARN" : "NO_DATA",
      args.dataFreshness,
    ),
    readiness("clock-sync", "Clock sync", "NO_DATA", "NO_DATA"),
    readiness("risk-engine", "Risk Engine", "OK", `limits notional≤${limits.maxOrderNotionalEur}€`),
    readiness("investment-brain", "Investment Brain", args.analysisOk ? "OK" : "WARN", "Analysis loop wired"),
    readiness("committee", "Committee / Ensemble", "OK", `${ENSEMBLE_STRATEGY_IDS.length} strategies`),
    readiness(
      "paper-cert",
      "Paper certification",
      args.paperCertStatus ?? "NO_DATA",
      args.paperCertDetail ?? "Not certified / NO_DATA",
    ),
    readiness(
      "shadow-cert",
      "Shadow certification",
      args.shadowCertStatus ?? "NO_DATA",
      args.shadowCertDetail ?? "Not certified / NO_DATA",
    ),
    readiness(
      "autonomous-lock",
      "AUTONOMOUS_LIVE lock",
      args.safety.autonomousLock === "LOCKED" ? "OK" : "WARN",
      args.safety.autonomousLock,
    ),
    readiness(
      "emergency-stop",
      "Emergency stop",
      emergency ? "WARN" : "OK",
      emergency ? "ACTIVE" : "inactive",
    ),
    readiness(
      "live-flag",
      "Live trading flag",
      args.safety.liveTradingEnabled ? "WARN" : "OK",
      `LIVE_TRADING_ENABLED=${String(args.safety.liveTradingEnabled)}`,
    ),
  ];
}

/**
 * Investment OS LIVE control snapshot — read-only.
 * Never mutates env, never submits/cancels orders.
 */
export async function buildLiveTradingDashboardReadModel(): Promise<LiveTradingDashboardReadModel> {
  const started = Date.now();
  const generatedAt = nowIso();
  const safety = buildSafetyFlags();
  const limits = loadAutonomousLiveLimits();
  const orchestrator = createAutonomousLiveOrchestrator();
  const runtime = orchestrator.getRuntimeSnapshot();

  const [healthResult, statusResult, ordersResult, positionsResult, approvals, auditLog] =
    await Promise.all([
      fetchBrokerJson("/health"),
      fetchBrokerJson("/status"),
      fetchBrokerJson("/orders"),
      fetchBrokerJson("/positions"),
      loadApprovalsFromStore(),
      loadAuditLog(),
    ]);

  const health = healthResult.ok ? asObject(healthResult.value) : null;
  const status = statusResult.ok ? asObject(statusResult.value) : null;
  const openOrders = ordersResult.ok ? mapOrders(ordersResult.value) : [];
  let positions = positionsResult.ok ? mapPositions(positionsResult.value) : [];

  const overlay = overlayPortfolioRisk({
    positions: positions.map((p) => ({
      symbol: p.symbol,
      quantity: p.position,
      avgCost: p.avgCost,
      marketPrice: p.marketPrice,
      unrealizedPnl: p.unrealizedPnl,
      stopPrice: p.stopProtection === "NO_DATA" ? null : Number(p.stopProtection),
      targetPrice: p.targetProtection === "NO_DATA" ? null : Number(p.targetProtection),
    })),
    nowIso: generatedAt,
  });

  positions = positions.map((p) => {
    const rec = overlay.recommendations.find((r) => r.symbol === p.symbol);
    return {
      ...p,
      overlayAction: rec?.action,
      overlayReason: rec?.reasoning[0],
    };
  });

  const analysis = runContinuousAnalysis({
    universe: defaultUniverse(generatedAt),
    nowIso: generatedAt,
  });

  const candidates: LiveCandidateRow[] = analysis.opportunities.slice(0, 25).map((opp) => ({
    id: opp.id,
    symbol: opp.symbol,
    side: opp.side,
    strategy: "ensemble",
    qty: 1,
    entry: opp.entry,
    stop: opp.stop,
    target: opp.target,
    notional: opp.notional,
    monetaryRisk: Number(Math.abs(opp.entry - opp.stop).toFixed(2)),
    pctRisk: opp.entry > 0 ? Number(((Math.abs(opp.entry - opp.stop) / opp.entry) * 100).toFixed(3)) : 0,
    spread: null,
    estimatedSlippage: null,
    marketSession: "REGULAR",
    confidence: opp.confidence,
    committeeConsensus: `${(opp.consensusRatio * 100).toFixed(0)}%`,
    riskDecision: opp.riskDecision,
    expiresAt: generatedAt,
    priority: opp.priority,
    score: opp.score,
    decision: opp.decision,
    reasoning: opp.reasoning,
    dataFreshness:
      opp.dataLiveOrDelayed === "live"
        ? "LIVE"
        : opp.dataLiveOrDelayed === "delayed"
          ? "DELAYED"
          : "UNKNOWN",
  }));

  const activeSignals: LiveActiveSignalRow[] = candidates
    .filter((c) => c.decision === "TRADE")
    .slice(0, 10)
    .map((c) => ({
      id: `sig-${c.id}`,
      symbol: c.symbol,
      side: c.side,
      strength: c.score ?? 0,
      source: "ensemble+risk",
      note: (c.reasoning ?? [])[0] ?? "prioritized opportunity",
    }));

  const dataFreshness: LiveDataFreshness = candidates.some((c) => c.dataFreshness === "LIVE")
    ? "LIVE"
    : candidates.some((c) => c.dataFreshness === "DELAYED")
      ? "DELAYED"
      : "UNKNOWN";

  const unrealized = positions.reduce((sum, p) => sum + (p.unrealizedPnl ?? 0), 0);
  const exposure = overlay.grossExposureEur;

  const dailyRisk: LiveDailyRiskSnapshot = {
    dailyPnl: null,
    maxLoss: limits.maxDailyLossPct,
    drawdown: null,
    usedRisk: null,
    dayOrders: openOrders.length,
    newPositions: positions.filter((p) => p.position !== 0).length,
    exposure,
    remainingLimits: `notional≤${limits.maxOrderNotionalEur}€ · positions≤${limits.maxOpenPositions} · trades/day≤${limits.maxTradesPerDay}`,
    note: "Risk overlay read-only — LOCKED execution; NO_DATA for live P&L until broker PnL feed confirmed",
  };

  const circuitBreakers: LiveCircuitBreakerRow[] = runtime.circuitBreakers.map((c) => ({
    code: c.code,
    reason: c.reason,
    at: c.at,
  }));

  const accounts = Array.isArray(status?.managedAccounts)
    ? maskAccountList(status!.managedAccounts as string[])
    : [];

  const harness = await evaluateStrategyReadinessHarness();
  const readinessItems = buildReadiness({
    safety,
    health,
    status,
    healthError: healthResult.error,
    statusError: statusResult.error,
    dataFreshness,
    analysisOk: true,
    paperCertStatus: harnessStatusToReadiness(harness.paper.status),
    paperCertDetail: `${harness.paper.note} · goLive=${harness.goLiveDecision}`,
    shadowCertStatus: harnessStatusToReadiness(harness.shadow.status),
    shadowCertDetail: `${harness.shadow.note} · goLive=${harness.goLiveDecision}`,
  });

  const history: LiveAuditLogRow[] = [
    {
      id: `hist-analysis-${generatedAt}`,
      at: generatedAt,
      event: "ANALYSIS_LOOP",
      detail: `scanned=${analysis.symbolsScanned} opportunities=${analysis.opportunities.length} noTrade=${analysis.noTradeCount}`,
    },
    ...auditLog,
  ];

  return {
    generatedAt,
    safety,
    systemState: {
      tradingMode: safety.tradingMode,
      autonomousLock: safety.autonomousLock,
      dataFreshness,
      haltReason: circuitBreakers[0]?.reason ?? null,
      blockNewEntries: true,
    },
    brokerState: {
      connected: Boolean(status?.connected),
      healthOk: health ? health.ok !== false : null,
      accountsMasked: accounts,
      nextValidId: status?.nextValidId != null ? String(status.nextValidId) : "NO_DATA",
      error: statusResult.error ?? healthResult.error ?? null,
    },
    aiState: {
      brain: "OK",
      committee: "OK",
      ensembleStrategies: ENSEMBLE_STRATEGY_IDS.length,
      analysisLoop: "continuous-pass",
      detail: "Ensemble + entry validation + risk overlay (LOCKED, no submit)",
    },
    readiness: readinessItems,
    strategyReadiness: {
      goLiveDecision: harness.goLiveDecision,
      overallSample: harness.overallSample,
      unlockEligible: false,
      paperClosedTrades: harness.paper.closedTrades,
      paperSessions: harness.paper.distinctSessions,
      shadowOps: harness.shadow.operationCount,
      shadowDays: harness.shadow.distinctDays,
      gates: harness.sampleGates.map((g) => ({
        id: g.id,
        name: g.name,
        required: String(g.required),
        actual: String(g.actual),
        status: g.status,
        evidence: g.evidence,
      })),
      note: harness.note,
    },
    goLiveUnlock: {
      blocked: true,
      buttonEnabled: false,
      reason:
        harness.goLiveDecision !== "NOT_READY_FOR_LIVE"
          ? "Certification consideration only — env unlock still requires explicit human ops path"
          : "Certification sample gates have not PASSed — GO_LIVE remains blocked",
      certificationPass: false,
      liveTradingEnabled: false,
      autonomousLive: "LOCKED",
      note: "Human GO_LIVE control is present but disabled. Clicking never sets LIVE_TRADING_ENABLED=true from this UI.",
    },
    candidates,
    activeSignals,
    approvals,
    openOrders,
    positions,
    dailyRisk,
    profitability: {
      dailyPnl: null,
      unrealizedPnl: positions.some((p) => p.unrealizedPnl != null) ? unrealized : null,
      realizedPnl: null,
      note: "Read-only portfolio marks — no execution P&L until unlocked certification",
    },
    operations: {
      openOrders: openOrders.length,
      positions: positions.filter((p) => p.position !== 0).length,
      opportunities: candidates.filter((c) => c.decision === "TRADE").length,
      noTradeCount: analysis.noTradeCount,
      ordersSubmitted: 0,
    },
    limits: {
      maxOrderNotionalEur: limits.maxOrderNotionalEur,
      maxNewExposureDailyEur: limits.maxNewExposureDailyEur,
      maxOpenPositions: limits.maxOpenPositions,
      maxTradesPerDay: limits.maxTradesPerDay,
      maxDailyLossPct: limits.maxDailyLossPct,
      maxConsecutiveLosses: limits.maxConsecutiveLosses,
    },
    circuitBreakers,
    auditLog,
    history,
    systemPerformance: {
      snapshotLatencyMs: Date.now() - started,
      symbolsScanned: analysis.symbolsScanned,
      stagesOk: true,
      note: `Initial ceilings: notional ${INITIAL_AUTONOMOUS_LIVE_LIMITS.maxOrderNotionalEur}€ (auto-tighten only)`,
    },
    note: "Investment OS LIVE control — AUTONOMOUS_LIVE LOCKED until certification. REAL MONEY banner advisory only. Zero orders. ANALYSIS_ONLY default.",
    badges: [
      "ANALYSIS_ONLY",
      "AUTONOMOUS_LIVE_LOCKED",
      safety.autonomousLock,
      safety.liveTradingEnabled ? "LIVE_ON" : "LIVE_LOCKED",
      safety.ibkrReadOnly ? "IBKR_READ_ONLY" : "IBKR_WRITE",
      dataFreshness,
      "no-auto-orders",
      "ordersSubmitted=0",
    ],
  };
}
