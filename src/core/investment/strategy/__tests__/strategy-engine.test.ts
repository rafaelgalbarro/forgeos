import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assertSerializable } from "../../domain/guards";
import {
  STRATEGY_IDS,
  assertImplementsInvestmentStrategy,
  assertNoOrderPath,
  createDefaultStrategyEngine,
  createAllStrategies,
  ensureEntryIntent,
  ensureExitIntent,
  ensurePositionIntent,
  ensureStrategyMetadata,
  type EntryIntent,
  type ExitIntent,
  type InvestmentStrategy,
  type PositionIntent,
  type StrategyMarketContext,
  type StrategyPositionContext,
} from "..";

const NOW = "2026-07-30T12:00:00.000Z";

function marketContext(overrides: Partial<StrategyMarketContext> = {}): StrategyMarketContext {
  return {
    symbol: "AAPL",
    price: 190,
    bid: 189.95,
    ask: 190.05,
    volume: 2_500_000,
    averageVolume: 1_200_000,
    returns: [0.01, 0.008, 0.012, 0.004, 0.009],
    smaFast: 192,
    smaSlow: 185,
    rsi: 62,
    atr: 3.2,
    volatility: 0.18,
    beta: 1.05,
    peRatio: 28,
    pbRatio: 12,
    roe: 35,
    earningsGrowth: 14,
    dividendYield: 0.55,
    qualityScore: 0.8,
    regime: "bullish",
    capturedAt: NOW,
    ...overrides,
  };
}

function positionContext(
  overrides: Partial<StrategyPositionContext> = {},
): StrategyPositionContext {
  return {
    positionId: "pos-1",
    symbol: "AAPL",
    side: "long",
    quantity: 100,
    averagePrice: 180,
    unrealizedPnlPct: 5.5,
    openedAt: "2026-07-20T12:00:00.000Z",
    stopLevel: 175,
    targetLevel: 210,
    ...overrides,
  };
}

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "__tests__" || name === "node_modules") continue;
      out.push(...collectTsFiles(full));
    } else if (name.endsWith(".ts") && !name.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

describe("Strategy Engine — interface compliance", () => {
  it("exposes all required InvestmentStrategy methods on every strategy", () => {
    const strategies = createAllStrategies();
    expect(strategies).toHaveLength(STRATEGY_IDS.length);

    for (const strategy of strategies) {
      assertImplementsInvestmentStrategy(strategy);
      expect(typeof strategy.analyze).toBe("function");
      expect(typeof strategy.generateEntry).toBe("function");
      expect(typeof strategy.managePosition).toBe("function");
      expect(typeof strategy.generateExit).toBe("function");
    }

    const ids = strategies.map((s) => s.id).sort();
    expect(ids).toEqual([...STRATEGY_IDS].sort());
  });
});

describe("Strategy Engine — intents only", () => {
  it("each strategy returns serializable intents without order fields", () => {
    const contexts: StrategyMarketContext[] = [
      marketContext({ regime: "bullish" }),
      marketContext({
        regime: "sideways",
        rsi: 22,
        smaFast: 188,
        smaSlow: 190,
        returns: [-0.02, -0.01, -0.015],
        peRatio: 11,
        pbRatio: 1.2,
        dividendYield: 3.5,
        volatility: 0.12,
        earningsGrowth: 18,
        qualityScore: 0.85,
        volume: 3_000_000,
        averageVolume: 1_000_000,
      }),
      marketContext({
        regime: "high-volatility",
        volatility: 0.4,
        volume: 4_000_000,
        averageVolume: 1_000_000,
        smaFast: 200,
        smaSlow: 180,
      }),
    ];

    for (const strategy of createAllStrategies()) {
      let sawIntent = false;

      for (const ctx of contexts) {
        const analysis = strategy.analyze(ctx);
        expect(analysis.strategyId).toBe(strategy.id);
        assertSerializable(analysis, `${strategy.id}.analysis`);
        assertNoOrderPath(analysis, `${strategy.id}.analysis`);

        const entry = strategy.generateEntry(ctx, analysis);
        if (entry) {
          sawIntent = true;
          expect(entry.kind).toBe("entry");
          ensureEntryIntent(entry);
        }

        const position = strategy.managePosition(ctx, positionContext());
        sawIntent = true;
        expect(position.kind).toBe("position");
        ensurePositionIntent(position);

        const exit = strategy.generateExit(
          ctx,
          positionContext({ unrealizedPnlPct: -7.5 }),
        );
        if (exit) {
          sawIntent = true;
          expect(exit.kind).toBe("exit");
          ensureExitIntent(exit);
        }
      }

      expect(sawIntent).toBe(true);
    }
  });

  it("StrategyEngine facade returns intents and has no order API", () => {
    const engine = createDefaultStrategyEngine();
    expect(engine.list()).toHaveLength(STRATEGY_IDS.length);
    expect(engine.listMetadata()).toHaveLength(STRATEGY_IDS.length);

    const ctx = marketContext({
      regime: "bullish",
      smaFast: 195,
      smaSlow: 180,
      returns: [0.02, 0.015, 0.01],
    });

    const analysis = engine.analyze("trend-following", ctx);
    expect(analysis.strategyId).toBe("trend-following");

    const entry = engine.generateEntry("trend-following", ctx, analysis);
    if (entry) ensureEntryIntent(entry);

    const managed = engine.managePosition("trend-following", ctx, positionContext());
    ensurePositionIntent(managed);

    const exit = engine.generateExit(
      "momentum",
      ctx,
      positionContext({ unrealizedPnlPct: -8 }),
    );
    if (exit) ensureExitIntent(exit);

    const keys = Object.getOwnPropertyNames(Object.getPrototypeOf(engine));
    for (const key of keys) {
      expect(key.toLowerCase()).not.toMatch(/order|broker|submit|place|transmit|ibkr/);
    }
  });
});

describe("Strategy Engine — no order path", () => {
  it("strategy module source does not import BrokerEngine / IBKR or send orders", () => {
    const root = join(__dirname, "..");
    const files = collectTsFiles(root);
    expect(files.length).toBeGreaterThan(10);

    const forbidden = [
      /import\s+.*BrokerEngine/,
      /from\s+["'][^"']*broker-engine[^"']*["']/i,
      /from\s+["'][^"']*ibkr[^"']*["']/i,
      /require\(\s*["'][^"']*ibkr[^"']*["']\s*\)/i,
      /process\.env\.(LIVE_TRADING_ENABLED|ANALYSIS_ONLY|IBKR_READ_ONLY)/,
      /\bsubmitOrder\s*\(/,
      /\bplaceOrder\s*\(/,
      /\btransmitOrder\s*\(/,
    ];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const pattern of forbidden) {
        expect(source, `${file} matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("intents never carry order identifiers", () => {
    const strategy = createAllStrategies().find((s) => s.id === "trend-following")!;
    const entry = strategy.generateEntry(
      marketContext({ smaFast: 200, smaSlow: 170, returns: [0.03, 0.02, 0.025] }),
    );
    expect(entry).not.toBeNull();
    const raw = JSON.parse(JSON.stringify(entry)) as EntryIntent;
    expect("orderId" in raw).toBe(false);
    expect("orderType" in raw).toBe(false);
    assertNoOrderPath(raw, "entry");
  });
});

describe("Strategy Engine — metadata registry", () => {
  it("registers version, author, date, assumptions, limitations, regimes, risks, evidences", () => {
    const engine = createDefaultStrategyEngine();
    const requiredKeys = [
      "version",
      "author",
      "date",
      "assumptions",
      "limitations",
      "compatibleRegimes",
      "incompatibleRegimes",
      "risks",
      "evidences",
    ] as const;

    for (const meta of engine.listMetadata()) {
      ensureStrategyMetadata(meta);
      for (const key of requiredKeys) {
        expect(meta).toHaveProperty(key);
      }
      expect(meta.version.length).toBeGreaterThan(0);
      expect(meta.author.length).toBeGreaterThan(0);
      expect(meta.date.length).toBeGreaterThan(0);
      expect(meta.assumptions.length).toBeGreaterThan(0);
      expect(meta.limitations.length).toBeGreaterThan(0);
      expect(meta.compatibleRegimes.length).toBeGreaterThan(0);
      expect(meta.risks.length).toBeGreaterThan(0);
      expect(meta.evidences.length).toBeGreaterThan(0);
      assertSerializable(meta, meta.strategyId);
    }
  });

  it("metadata registry lookup matches strategy ids", () => {
    const engine = createDefaultStrategyEngine();
    for (const id of STRATEGY_IDS) {
      expect(engine.metadataRegistry.has(id)).toBe(true);
      expect(engine.get(id)?.metadata.strategyId).toBe(id);
    }
  });
});

describe("Strategy Engine — typed intent kinds", () => {
  it("discriminates EntryIntent | ExitIntent | PositionIntent", () => {
    const strategies: readonly InvestmentStrategy[] = createAllStrategies();
    const ctx = marketContext({
      regime: "sideways",
      rsi: 18,
      peRatio: 10,
      pbRatio: 1.1,
      dividendYield: 4,
      qualityScore: 0.9,
      volatility: 0.1,
      earningsGrowth: 20,
    });

    const intents: Array<EntryIntent | ExitIntent | PositionIntent> = [];
    for (const strategy of strategies) {
      const entry = strategy.generateEntry(ctx);
      if (entry) intents.push(entry);
      intents.push(strategy.managePosition(ctx, positionContext()));
      const exit = strategy.generateExit(ctx, positionContext({ unrealizedPnlPct: -9 }));
      if (exit) intents.push(exit);
    }

    expect(intents.some((i) => i.kind === "entry")).toBe(true);
    expect(intents.some((i) => i.kind === "position")).toBe(true);
    expect(intents.some((i) => i.kind === "exit")).toBe(true);
  });
});
