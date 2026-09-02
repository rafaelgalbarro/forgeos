import { beforeEach, describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  AUTONOMOUS_LIVE_PIPELINE_STAGES,
  applyAutoTighten,
  assertLimitsNotWidened,
  createAutonomousLiveOrchestrator,
  createExitSignal,
  evaluateCircuitBreakers,
  evaluateEnsembleConsensus,
  exportLearningDataset,
  INITIAL_AUTONOMOUS_LIVE_LIMITS,
  InMemoryAttributionStore,
  LIVE_ORDER_SUBMIT_BOUNDARY,
  loadAutonomousLiveLimits,
  LockedLiveOrderGate,
  overlayPortfolioRisk,
  refuseAutoUnlock,
  resolveAutonomousLockState,
  runContinuousAnalysis,
  selectExitsOverEntries,
  validateEntry,
  validateQuoteForEntry,
  buildDatumMeta,
  buildDemoEnsembleVotes,
  liveQuoteFromIbkr,
} from "../index";

function collectTsFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "__tests__") continue;
      collectTsFiles(full, acc);
    } else if (name.endsWith(".ts") || name.endsWith(".tsx")) {
      acc.push(full);
    }
  }
  return acc;
}

describe("AUTONOMOUS_LIVE Investment OS", () => {
  beforeEach(() => {
    process.env.LIVE_TRADING_ENABLED = "false";
    process.env.IBKR_READ_ONLY = "true";
    process.env.TRADING_MODE = "ANALYSIS_ONLY";
  });

  it("remains LOCKED and never auto-unlocks", () => {
    const lock = resolveAutonomousLockState({
      tradingMode: "AUTONOMOUS_LIVE",
      liveTradingEnabled: false,
      ibkrReadOnly: true,
      certificationUnlocked: false,
    });
    expect(lock).toBe("LOCKED");
    expect(refuseAutoUnlock().unlocked).toBe(false);
  });

  it("locked mode never submits orders", async () => {
    const gate = new LockedLiveOrderGate();
    const result = await gate.submitOrder({
      symbol: "AAPL",
      side: "BUY",
      qty: 1,
      orderType: "LMT",
      lmtPrice: 50,
      tif: "DAY",
      idempotencyKey: "t1",
      stopPrice: 49,
      targetPrice: 52,
    });
    expect(result.submitted).toBe(false);
    expect(result.submitOrderInvoked).toBe(false);
    expect(result.placeOrderInvoked).toBe(false);

    const orch = createAutonomousLiveOrchestrator();
    const cycle = await orch.runCycle({
      symbol: "AAPL",
      bid: 100,
      ask: 100.1,
      last: 100,
      volume: 50_000,
      quoteTimestamp: "2026-08-03T12:00:00.000Z",
      nowIso: "2026-08-03T12:00:01.000Z",
      quoteLiveOrDelayed: "live",
      votes: buildDemoEnsembleVotes("AAPL").map((v, i) => ({
        ...v,
        side: i < 6 ? "BUY" : "FLAT",
        confidence: 0.8,
        expectedValueAfterCosts: 0.05,
        regimeCompatible: true,
      })),
    });
    expect(cycle.orderSubmitted).toBe(false);
    expect(cycle.submitOrderInvoked).toBe(false);
    expect(cycle.placeOrderInvoked).toBe(false);
    expect(cycle.lockState).toBe("LOCKED");
    expect(cycle.stages.map((s) => s.stage).sort()).toEqual(
      [...AUTONOMOUS_LIVE_PIPELINE_STAGES].sort(),
    );
  });

  it("NO_TRADE on stale or delayed data", () => {
    const now = "2026-08-03T12:00:10.000Z";
    const delayed = liveQuoteFromIbkr({
      bid: 10,
      ask: 10.01,
      last: 10,
      volume: 100_000,
      timestamp: "2026-08-03T12:00:09.000Z",
      nowIso: now,
    });
    delayed.meta.liveOrDelayed; // type check
    const delayedQuote = {
      ...delayed,
      meta: { ...delayed.meta, liveOrDelayed: "delayed" as const },
    };
    const delayedFails = validateQuoteForEntry(delayedQuote, {
      maxAgeMs: 3_000,
      maxSpreadBps: 50,
      minVolume: 1,
      liveDataRequired: true,
    });
    expect(delayedFails.some((f) => f.code.includes("DELAYED") || f.message.includes("delayed"))).toBe(
      true,
    );

    const staleMeta = buildDatumMeta({
      source: "ibkr_live_market",
      timestamp: "2026-08-03T11:59:00.000Z",
      nowIso: now,
      liveOrDelayed: "live",
    });
    expect(staleMeta.freshnessMs).toBeGreaterThan(3_000);
    const staleFails = validateQuoteForEntry(
      { bid: 10, ask: 10.01, last: 10, volume: 100_000, meta: staleMeta },
      { maxAgeMs: 3_000, maxSpreadBps: 50, minVolume: 1, liveDataRequired: true },
    );
    expect(staleFails.some((f) => f.code === "STALE_QUOTE")).toBe(true);
  });

  it("requires ensemble consensus — no single-strategy execution", () => {
    const single = evaluateEnsembleConsensus({
      votes: [
        {
          strategyId: "momentum",
          side: "BUY",
          confidence: 0.99,
          expectedValueAfterCosts: 1,
          regimeCompatible: true,
          rationale: "alone",
        },
      ],
      minConsensus: 0.6,
      minConfidence: 0.55,
      liquidityOk: true,
      spreadOk: true,
      riskApproved: true,
      regime: "trend",
    });
    expect(single.approved).toBe(false);
    expect(single.decision).toBe("NO_TRADE");

    const votes = buildDemoEnsembleVotes("MSFT").map((v) => ({
      ...v,
      side: "BUY" as const,
      confidence: 0.8,
      expectedValueAfterCosts: 0.05,
      regimeCompatible: true,
    }));
    const ok = evaluateEnsembleConsensus({
      votes,
      minConsensus: 0.6,
      minConfidence: 0.55,
      liquidityOk: true,
      spreadOk: true,
      riskApproved: true,
      regime: "trend",
    });
    expect(ok.approved).toBe(true);
    expect(ok.minorityReport).toBeTruthy();
  });

  it("enforces limits and never widens", () => {
    const limits = loadAutonomousLiveLimits();
    expect(limits.maxOrderNotionalEur).toBeLessThanOrEqual(INITIAL_AUTONOMOUS_LIVE_LIMITS.maxOrderNotionalEur);
    expect(limits.allowShort).toBe(false);
    expect(limits.limitOrdersOnly).toBe(true);

    const tightened = applyAutoTighten(limits, { maxOrderNotionalEur: 25 });
    expect(tightened.maxOrderNotionalEur).toBe(25);
    expect(() =>
      assertLimitsNotWidened(tightened, { ...tightened, maxOrderNotionalEur: 100 }),
    ).toThrow(/never widen/);

    const quote = liveQuoteFromIbkr({
      bid: 100,
      ask: 100.05,
      last: 100,
      volume: 50_000,
      timestamp: "2026-08-03T12:00:00.000Z",
      nowIso: "2026-08-03T12:00:01.000Z",
    });
    const failures = validateEntry({
      quote,
      limits,
      contractUnambiguous: true,
      marketOpen: true,
      correctAccount: true,
      sufficientFunds: true,
      duplicateOrder: false,
      incompatiblePosition: false,
      riskApproved: true,
      stopDefined: true,
      targetDefined: true,
      rewardRisk: 2,
      costsAndSlippageIncluded: true,
      circuitBreakerActive: false,
      orderType: "LIMIT",
      instrument: "EQUITY",
      side: "BUY",
      outsideRth: false,
      notionalEur: 200,
      dailyNewExposureEur: 40,
      openPositions: 0,
      tradesToday: 0,
      riskPerTradePct: 0.05,
    });
    expect(failures.some((f) => f.code === "MAX_NOTIONAL")).toBe(true);
  });

  it("HALT_SYSTEM blocks entries and requires human unlock", async () => {
    const event = evaluateCircuitBreakers({
      nowIso: "2026-08-03T12:00:00.000Z",
      dailyLossPct: 1,
      maxDailyLossPct: 0.25,
      consecutiveLosses: 0,
      maxConsecutiveLosses: 2,
      dataDelayed: false,
      connectionLost: false,
      reconciliationError: false,
      unknownOrderOrPosition: false,
      abnormalSlippage: false,
      tooManyRejects: false,
      clockDesync: false,
      exposureOverLimit: false,
      unclassifiedError: false,
      manualEmergency: false,
    });
    expect(event?.code).toBe("DAILY_MAX_LOSS");

    const orch = createAutonomousLiveOrchestrator();
    const halted = await orch.runCycle({
      symbol: "AAPL",
      consecutiveLosses: 2,
      nowIso: "2026-08-03T12:00:00.000Z",
    });
    expect(halted.decision).toBe("HALT_SYSTEM");
    expect(halted.circuitBreaker?.requiresHumanUnlock).toBe(true);
    expect(halted.orderSubmitted).toBe(false);
  });

  it("exit priority beats entries and dedupes", () => {
    const exits = [
      createExitSignal("TAKE_PROFIT", "AAPL", "2026-08-03T12:00:00.000Z"),
      createExitSignal("STOP", "AAPL", "2026-08-03T12:00:00.000Z"),
      createExitSignal("STOP", "AAPL", "2026-08-03T12:00:01.000Z", "dup-1"),
    ];
    const { processExits, allowEntry } = selectExitsOverEntries({
      exitSignals: exits,
      hasEntryCandidate: true,
    });
    expect(allowEntry).toBe(false);
    expect(processExits[0]?.reason).toBe("STOP");
    expect(processExits.filter((e) => e.reason === "STOP")).toHaveLength(1);
  });

  it("continuous analysis marks non-LIVE as NO_TRADE and prioritizes", () => {
    const result = runContinuousAnalysis({
      nowIso: "2026-08-03T12:00:01.000Z",
      universe: [
        {
          symbol: "AAA",
          bid: 50,
          ask: 50.05,
          last: 50,
          volume: 100_000,
          quoteAt: "2026-08-03T12:00:00.500Z",
          liveOrDelayed: "delayed",
        },
        {
          symbol: "BBB",
          bid: 20,
          ask: 20.02,
          last: 20,
          volume: 100_000,
          quoteAt: "2026-08-03T12:00:00.500Z",
          liveOrDelayed: "live",
        },
      ],
      votesFactory: (symbol) =>
        buildDemoEnsembleVotes(symbol).map((v) => ({
          ...v,
          side: "BUY" as const,
          confidence: 0.9,
          expectedValueAfterCosts: 0.1,
          regimeCompatible: true,
        })),
    });
    expect(result.orderSubmitted).toBe(false);
    const aaa = result.opportunities.find((o) => o.symbol === "AAA");
    expect(aaa?.decision).toBe("NO_TRADE");
  });

  it("position overlay is defensive and never submits", () => {
    const overlay = overlayPortfolioRisk({
      positions: [{ symbol: "AAPL", quantity: 1, avgCost: 100, stopPrice: null }],
      nowIso: "2026-08-03T12:00:00.000Z",
    });
    expect(overlay.orderSubmitted).toBe(false);
    expect(overlay.recommendations[0]?.defensiveOnly).toBe(true);
    expect(overlay.recommendations[0]?.action).toBe("TIGHTEN_STOP");
  });

  it("learning export forbids auto strategy mutation", async () => {
    const store = new InMemoryAttributionStore();
    await store.append({
      tradeId: "t1",
      symbol: "AAPL",
      side: "BUY",
      strategyVotes: [],
      consensusRatio: 0.7,
      entryReason: "test",
      exitReason: null,
      expectedValue: 0.1,
      realizedPnl: null,
      costs: 0,
      slippage: null,
      riskPct: 0.05,
      regime: "trend",
      dataQuality: "high",
      recordedAt: "2026-08-03T12:00:00.000Z",
      autoStrategyMutationForbidden: true,
    });
    const exported = await exportLearningDataset(store);
    expect(exported.autoStrategyMutationForbidden).toBe(true);
    expect(exported.deployPath).toContain("paper");
  });

  it("boundary: only LiveExecutionEngine may own submitOrder call sites for broker writes", () => {
    const root = join(process.cwd(), "src/core/investment");
    const files = collectTsFiles(root);
    const offenders: string[] = [];
    for (const file of files) {
      const norm = file.replace(/\\/g, "/");
      if (norm.includes("/live-execution/")) continue;
      if (norm.includes("/autonomous-live/locked-execution")) continue;
      if (norm.includes("/autonomous-live/") && norm.endsWith(".test.ts")) continue;
      const src = readFileSync(file, "utf8");
      // Flag brokerEngine.submitOrder / .submitOrder( on broker-like receivers outside allowed modules
      if (/brokerEngine\.submitOrder\s*\(/.test(src) || /broker\.submitOrder\s*\(/.test(src)) {
        offenders.push(norm);
      }
      if (/placeOrder\s*\(/.test(src) && !norm.includes("autonomous-live")) {
        // allow mentions in comments/strings about placeOrder being forbidden
        if (/placeOrder\s*\([^)]*\)\s*\{/.test(src) || /\.placeOrder\s*\(/.test(src)) {
          offenders.push(norm);
        }
      }
    }
    expect(offenders).toEqual([]);
    expect(LIVE_ORDER_SUBMIT_BOUNDARY.allowedCaller).toBe("LiveExecutionEngine");
  });

  it("does not flip safety flags", () => {
    expect(process.env.LIVE_TRADING_ENABLED).toBe("false");
    expect(process.env.IBKR_READ_ONLY).toBe("true");
    createAutonomousLiveOrchestrator().getRuntimeSnapshot();
    expect(process.env.LIVE_TRADING_ENABLED).toBe("false");
    expect(process.env.IBKR_READ_ONLY).toBe("true");
    expect(process.env.TRADING_MODE).toBe("ANALYSIS_ONLY");
  });
});
