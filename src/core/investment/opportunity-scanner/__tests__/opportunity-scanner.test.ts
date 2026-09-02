import { describe, expect, it } from "vitest";
import {
  ContinuousOpportunityScanner,
  ensureOpportunityCandidate,
  type OpportunityCalendarProvider,
  type OpportunityEventsProvider,
  type OpportunityInstrumentUniverseProvider,
  type OpportunityMarketDataProvider,
  type OpportunityNewsProvider,
  type OpportunityPortfolioContextProvider,
} from "..";
import type { OpportunityInstrument } from "../domain";

const BASE_INSTRUMENT: OpportunityInstrument = {
  id: "stk-aapl",
  symbol: "AAPL",
  conId: 265598,
  market: "NASDAQ",
  currency: "USD",
  assetClass: "stocks",
  region: "US",
  broker: "paper",
  accountId: "SIM",
  cryptoAllowed: false,
};

class SingleInstrumentProvider implements OpportunityInstrumentUniverseProvider {
  constructor(private readonly instrument: OpportunityInstrument = BASE_INSTRUMENT) {}
  async listAuthorizedInstruments(): Promise<readonly OpportunityInstrument[]> {
    return [this.instrument];
  }
}

class FixedCalendarProvider implements OpportunityCalendarProvider {
  async getSession() {
    return { phase: "regular", isOpen: true };
  }
}

class EmptyNewsProvider implements OpportunityNewsProvider {
  async getHeadlines() {
    return [];
  }
}

class EmptyEventsProvider implements OpportunityEventsProvider {
  async getCorporateEvents() {
    return [];
  }
}

class FixedPortfolioProvider implements OpportunityPortfolioContextProvider {
  async getImbalanceScore() {
    return 0.85;
  }
}

class FixedMarketProvider implements OpportunityMarketDataProvider {
  constructor(private readonly snapshot: Awaited<ReturnType<OpportunityMarketDataProvider["getSnapshot"]>>) {}

  static buildSnapshot(nowIso: string) {
    return {
      bid: 100,
      ask: 100.01,
      last: 100.005,
      previousClose: 99.2,
      volume: 300_000,
      averageVolume: 100_000,
      momentum: 0.92,
      trend: 0.88,
      volatility: 0.82,
      correlation: 0.17,
      macroScore: 0.74,
      capturedAt: nowIso,
    };
  }

  static fresh(nowIso: string) {
    return new FixedMarketProvider(FixedMarketProvider.buildSnapshot(nowIso));
  }

  async getSnapshot() {
    return this.snapshot;
  }
}

function createScanner(options: {
  instrument?: OpportunityInstrument;
  marketData: OpportunityMarketDataProvider;
  nowIso?: string;
}) {
  const nowIso = options.nowIso ?? "2026-07-30T11:00:00.000Z";
  return new ContinuousOpportunityScanner({
    instruments: new SingleInstrumentProvider(options.instrument),
    marketData: options.marketData,
    calendar: new FixedCalendarProvider(),
    news: new EmptyNewsProvider(),
    events: new EmptyEventsProvider(),
    portfolio: new FixedPortfolioProvider(),
    now: () => new Date(nowIso),
    pollIntervalMs: 20_000,
    policy: {
      minConfidence: 0.55,
      maxDataAgeMs: 20_000,
      dedupeTtlMs: 60_000,
      cooldownMsByStrategy: {
        "trend-scanner": 60_000,
        "mean-reversion": 60_000,
        breakout: 60_000,
        momentum: 60_000,
        volatility: 60_000,
        "anomalous-volume": 60_000,
        gaps: 60_000,
        "corporate-events": 60_000,
        news: 60_000,
        correlations: 60_000,
        "statistical-arbitrage": 60_000,
        "macro-changes": 60_000,
        "portfolio-imbalance": 60_000,
      },
    },
  });
}

describe("continuous opportunity scanner rules", () => {
  it("propagates computed aging freshness to candidates", async () => {
    const scanner = createScanner({
      marketData: FixedMarketProvider.fresh("2026-07-30T10:59:45.000Z"),
    });
    await scanner.scanNow();
    expect(scanner.getSnapshot().accepted.length).toBeGreaterThan(0);
    expect(scanner.getSnapshot().accepted.every((x) => x.candidate.dataFreshness === "aging")).toBe(true);
  });

  it("blocks stale data", async () => {
    const scanner = createScanner({
      marketData: {
        async getSnapshot() {
          return {
            bid: 100,
            ask: 100.01,
            last: 100,
            capturedAt: "2026-07-30T10:50:00.000Z",
          };
        },
      },
    });
    await scanner.scanNow();
    const snapshot = scanner.getSnapshot();
    expect(snapshot.accepted.length).toBe(0);
    expect(snapshot.discarded.some((x) => x.reason === "stale-data")).toBe(true);
  });

  it("blocks missing bid/ask", async () => {
    const scanner = createScanner({
      marketData: {
        async getSnapshot() {
          return {
            last: 100,
            capturedAt: "2026-07-30T11:00:00.000Z",
          };
        },
      },
    });
    await scanner.scanNow();
    expect(scanner.getSnapshot().discarded.some((x) => x.reason === "missing-bid-ask")).toBe(true);
  });

  it("blocks spread above limit", async () => {
    const scanner = createScanner({
      marketData: {
        async getSnapshot() {
          return {
            bid: 100,
            ask: 100.6,
            last: 100.3,
            capturedAt: "2026-07-30T11:00:00.000Z",
          };
        },
      },
    });
    await scanner.scanNow();
    expect(scanner.getSnapshot().discarded.some((x) => x.reason === "spread-too-wide")).toBe(true);
  });

  it("blocks unauthorized assets", async () => {
    const scanner = createScanner({
      instrument: { ...BASE_INSTRUMENT, assetClass: "crypto", symbol: "BTCUSD", cryptoAllowed: false },
      marketData: FixedMarketProvider.fresh("2026-07-30T11:00:00.000Z"),
    });
    await scanner.scanNow();
    expect(scanner.getSnapshot().discarded.some((x) => x.reason === "unauthorized-asset")).toBe(true);
  });

  it("deduplicates and applies cooldown", async () => {
    const scanner = createScanner({
      marketData: FixedMarketProvider.fresh("2026-07-30T11:00:00.000Z"),
    });
    await scanner.scanNow();
    const firstAccepted = scanner.getSnapshot().accepted.length;
    await scanner.scanNow();
    const snapshot = scanner.getSnapshot();
    expect(firstAccepted).toBeGreaterThan(0);
    expect(snapshot.discarded.some((x) => x.reason === "duplicate-signal" || x.reason === "cooldown-active")).toBe(
      true,
    );
  });

  it("records accepted/discarded reasons and supports serialization", async () => {
    const scanner = createScanner({
      marketData: FixedMarketProvider.fresh("2026-07-30T11:00:00.000Z"),
    });
    await scanner.scanNow();
    const snapshot = scanner.getSnapshot();
    expect(snapshot.accepted.length).toBeGreaterThan(0);
    const accepted = snapshot.accepted[0].candidate;
    ensureOpportunityCandidate(accepted);
    const serialized = JSON.stringify(snapshot);
    const parsed = JSON.parse(serialized) as typeof snapshot;
    expect(parsed.accepted.length).toBe(snapshot.accepted.length);
    expect(parsed.discarded.length).toBe(snapshot.discarded.length);
  });
});
