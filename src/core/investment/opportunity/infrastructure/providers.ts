import type { MarketRegime } from "../../domain/entities";
import {
  defaultOpportunityCapabilityFlags,
  type OpportunityCapabilityFlags,
  type OpportunityInstrumentMeta,
} from "../domain";
import type {
  OpportunityContextPort,
  OpportunityMarketBar,
  OpportunityMarketDataPort,
  OpportunityMarketSnapshot,
  OpportunityUniversePort,
} from "../application/ports";
import { isAssetClassSupported } from "../application/ports";
import { OpportunityScanner } from "../application/scanner";

const DEFAULT_UNIVERSE: readonly OpportunityInstrumentMeta[] = [
  {
    id: "stk-aapl",
    symbol: "AAPL",
    name: "Apple Inc",
    assetClass: "stocks",
    market: "NASDAQ",
    currency: "USD",
    sector: "Technology",
    region: "US",
    exchange: "NASDAQ",
  },
  {
    id: "etf-spy",
    symbol: "SPY",
    name: "SPDR S&P 500 ETF",
    assetClass: "etf",
    market: "ARCA",
    currency: "USD",
    sector: "Broad Market",
    region: "US",
    exchange: "ARCA",
  },
  {
    id: "idx-spx",
    symbol: "SPX",
    name: "S&P 500 Index",
    assetClass: "indices",
    market: "CBOE",
    currency: "USD",
    sector: "Broad Market",
    region: "US",
  },
  {
    id: "fx-eurusd",
    symbol: "EURUSD",
    name: "Euro / US Dollar",
    assetClass: "forex",
    market: "FX",
    currency: "USD",
    region: "EU",
  },
  {
    id: "fut-es",
    symbol: "ES",
    name: "E-mini S&P 500",
    assetClass: "futures",
    market: "CME",
    currency: "USD",
    region: "US",
  },
  {
    id: "bnd-tlt",
    symbol: "TLT",
    name: "iShares 20+ Year Treasury",
    assetClass: "bonds",
    market: "ARCA",
    currency: "USD",
    sector: "Rates",
    region: "US",
  },
  {
    id: "cmd-gc",
    symbol: "GC",
    name: "Gold Futures",
    assetClass: "commodities",
    market: "COMEX",
    currency: "USD",
    region: "GLOBAL",
  },
  {
    id: "cry-btc",
    symbol: "BTCUSD",
    name: "Bitcoin",
    assetClass: "crypto",
    market: "CRYPTO",
    currency: "USD",
    region: "GLOBAL",
  },
];

function hash(seed: string): number {
  let value = 0;
  for (let index = 0; index < seed.length; index += 1) {
    value = (value * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return value;
}

function buildBars(instrument: OpportunityInstrumentMeta, nowMs: number, base: number): OpportunityMarketBar[] {
  const bars: OpportunityMarketBar[] = [];
  let price = base;
  for (let i = 24; i >= 0; i -= 1) {
    const wave = Math.sin((nowMs - i * 3_600_000) / 90_000 + (hash(instrument.id) % 11));
    const open = price;
    const close = base * (1 + wave * 0.012 + (24 - i) * 0.0004);
    const high = Math.max(open, close) * (1 + Math.abs(wave) * 0.004);
    const low = Math.min(open, close) * (1 - Math.abs(wave) * 0.004);
    const volume = 80_000 + (hash(`${instrument.symbol}-${i}`) % 220_000);
    bars.push({
      open: Number(open.toFixed(6)),
      high: Number(high.toFixed(6)),
      low: Number(low.toFixed(6)),
      close: Number(close.toFixed(6)),
      volume,
      timestamp: new Date(nowMs - i * 3_600_000).toISOString(),
    });
    price = close;
  }
  return bars;
}

/** Static authorized universe — capability-gated, no broker. */
export class StaticOpportunityUniverseProvider implements OpportunityUniversePort {
  constructor(private readonly instruments: readonly OpportunityInstrumentMeta[] = DEFAULT_UNIVERSE) {}

  async listInstruments(capabilities: OpportunityCapabilityFlags): Promise<readonly OpportunityInstrumentMeta[]> {
    return this.instruments.filter((item) => isAssetClassSupported(item.assetClass, capabilities));
  }
}

/** DEMO synthetic market snapshots from local heuristics — no broker/IBKR. */
export class SyntheticOpportunityMarketDataProvider implements OpportunityMarketDataPort {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async getSnapshots(
    instruments: readonly OpportunityInstrumentMeta[],
  ): Promise<readonly OpportunityMarketSnapshot[]> {
    const now = this.now();
    const nowMs = now.getTime();
    return instruments.map((instrument) => {
      const base = Math.max(1, (hash(instrument.symbol) % 900) + 10);
      const bars = buildBars(instrument, nowMs, base);
      const last = bars.at(-1)!.close;
      const previousClose = bars.at(-2)?.close ?? last * 0.99;
      const spread = Math.max(0.0001, last * 0.0008);
      const avgVolume = bars.reduce((sum, bar) => sum + bar.volume, 0) / bars.length;
      let atrSum = 0;
      for (let i = 1; i < bars.length; i += 1) {
        const prev = bars[i - 1]!;
        const bar = bars[i]!;
        atrSum += Math.max(bar.high - bar.low, Math.abs(bar.high - prev.close), Math.abs(bar.low - prev.close));
      }
      return {
        instrument,
        last: Number(last.toFixed(6)),
        bid: Number((last - spread / 2).toFixed(6)),
        ask: Number((last + spread / 2).toFixed(6)),
        previousClose: Number(previousClose.toFixed(6)),
        averageVolume: Number(avgVolume.toFixed(2)),
        atr: Number((atrSum / Math.max(1, bars.length - 1)).toFixed(6)),
        bars,
        capturedAt: now.toISOString(),
        providerId: "demo-synthetic-normalized",
      };
    });
  }
}

/** Context enrichments from normalized relative/sector/geo/news inputs — no broker. */
export class HeuristicOpportunityContextProvider implements OpportunityContextPort {
  async loadContext(snapshots: readonly OpportunityMarketSnapshot[], nowIso: string) {
    const relative = snapshots.slice(0, 3).map((snapshot, index) => {
      const instrumentReturn = snapshot.previousClose
        ? (snapshot.last - snapshot.previousClose) / snapshot.previousClose
        : 0.01;
      const benchmarkReturn = 0.004 * (index % 2 === 0 ? 1 : -1);
      return {
        instrumentSymbol: snapshot.instrument.symbol,
        benchmarkSymbol: "SPY",
        instrumentReturn,
        benchmarkReturn,
        relativeStrength: instrumentReturn - benchmarkReturn,
      };
    });

    const sectors = [
      {
        sector: "Technology",
        sectorReturn: 0.028,
        marketReturn: 0.006,
        rotationScore: 0.022,
      },
    ];

    const geography = [
      {
        region: "US",
        regionReturn: 0.018,
        globalReturn: 0.004,
        rotationScore: 0.016,
      },
      {
        region: "EU",
        regionReturn: -0.02,
        globalReturn: 0.004,
        rotationScore: -0.024,
      },
    ];

    const correlations = snapshots.slice(0, 2).map((snapshot, index) => ({
      pairSymbol: index === 0 ? "SPY" : "TLT",
      correlation: index === 0 ? 0.91 : 0.08,
      lookback: "60d",
    }));

    const macroEvents = [
      {
        id: "fomc-preview",
        title: "FOMC policy decision window",
        severity: 0.72,
        scheduledAt: new Date(Date.parse(nowIso) + 6 * 60 * 60 * 1000).toISOString(),
        regions: ["US"] as const,
      },
    ];

    const news = snapshots.slice(0, 1).map((snapshot) => ({
      id: `news-${snapshot.instrument.symbol}`,
      headline: `${snapshot.instrument.symbol} institutional flow acceleration`,
      sentiment: 0.62,
      publishedAt: nowIso,
      symbols: [snapshot.instrument.symbol] as const,
    }));

    const earnings = snapshots
      .filter((snapshot) => snapshot.instrument.assetClass === "stocks")
      .slice(0, 1)
      .map((snapshot) => ({
        symbol: snapshot.instrument.symbol,
        reportDate: new Date(Date.parse(nowIso) + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        surprisePct: 4.2,
        expectedMovePct: 3.5,
      }));

    const marketRegime: MarketRegime =
      relative.reduce((sum, item) => sum + item.relativeStrength, 0) > 0.01
        ? "bullish"
        : relative.reduce((sum, item) => sum + item.relativeStrength, 0) < -0.01
          ? "bearish"
          : "sideways";

    return {
      relative,
      sectors,
      geography,
      correlations,
      macroEvents,
      news,
      earnings,
      marketRegime,
    };
  }
}

export function createAnalysisOnlyOpportunityScanner(options?: {
  capabilities?: Partial<OpportunityCapabilityFlags>;
  now?: () => Date;
  minConfidence?: number;
  minScore?: number;
}): OpportunityScanner {
  const now = options?.now ?? (() => new Date());
  return new OpportunityScanner({
    universe: new StaticOpportunityUniverseProvider(),
    marketData: new SyntheticOpportunityMarketDataProvider(now),
    context: new HeuristicOpportunityContextProvider(),
    capabilities: defaultOpportunityCapabilityFlags(options?.capabilities),
    now,
    minConfidence: options?.minConfidence,
    minScore: options?.minScore,
  });
}
