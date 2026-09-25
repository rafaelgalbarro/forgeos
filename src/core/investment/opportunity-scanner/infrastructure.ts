import type { BrokerEngine } from "@/src/core/application/ports/broker-engine";
import type {
  OpportunityCalendarProvider,
  OpportunityCalendarSession,
  OpportunityEventsProvider,
  OpportunityInstrumentUniverseProvider,
  OpportunityMarketDataProvider,
  OpportunityMarketSnapshot,
  OpportunityNewsProvider,
  OpportunityPortfolioContextProvider,
} from "./application";
import type { OpportunityInstrument } from "./domain";

const DEFAULT_INSTRUMENTS: readonly OpportunityInstrument[] = [
  {
    id: "stk-aapl",
    symbol: "AAPL",
    conId: 265598,
    market: "NASDAQ",
    currency: "USD",
    assetClass: "stocks",
    region: "US",
    broker: "default",
    accountId: "SIM",
    cryptoAllowed: false,
  },
  {
    id: "etf-spy",
    symbol: "SPY",
    conId: 756733,
    market: "ARCA",
    currency: "USD",
    assetClass: "etf",
    region: "US",
    broker: "default",
    accountId: "SIM",
    cryptoAllowed: false,
  },
  {
    id: "fx-eurusd",
    symbol: "EURUSD",
    conId: 12087792,
    market: "IDEALPRO",
    currency: "USD",
    assetClass: "forex",
    region: "EU",
    broker: "default",
    accountId: "SIM",
    cryptoAllowed: false,
  },
];

function hash(seed: string): number {
  let value = 0;
  for (let index = 0; index < seed.length; index += 1) value = (value * 31 + seed.charCodeAt(index)) >>> 0;
  return value;
}

export class StaticUniverseProvider implements OpportunityInstrumentUniverseProvider {
  async listAuthorizedInstruments(): Promise<readonly OpportunityInstrument[]> {
    return DEFAULT_INSTRUMENTS;
  }
}

export class BrokerUniverseProvider implements OpportunityInstrumentUniverseProvider {
  constructor(private readonly broker: BrokerEngine, private readonly fallback = new StaticUniverseProvider()) {}

  async listAuthorizedInstruments(): Promise<readonly OpportunityInstrument[]> {
    try {
      const response = await this.broker.request<{
        instruments?: Array<{
          id?: string;
          symbol?: string;
          conId?: number;
          market?: string;
          currency?: string;
          assetClass?: OpportunityInstrument["assetClass"];
          region?: string;
          accountId?: string;
          cryptoAllowed?: boolean;
        }>;
      }>({
        path: "/api/instruments/authorized",
        method: "GET",
      });
      const items = (response.instruments ?? [])
        .filter((item) => item.symbol && item.market && item.currency && item.conId && item.assetClass)
        .map((item) => ({
          id: item.id ?? `${item.assetClass}-${item.symbol}`,
          symbol: item.symbol!,
          conId: item.conId!,
          market: item.market!,
          currency: item.currency!,
          assetClass: item.assetClass!,
          region: item.region ?? "UNKNOWN",
          broker: this.broker.name,
          accountId: item.accountId ?? "UNKNOWN",
          cryptoAllowed: item.cryptoAllowed ?? false,
        }));
      return items.length > 0 ? items : this.fallback.listAuthorizedInstruments();
    } catch {
      return this.fallback.listAuthorizedInstruments();
    }
  }
}

export class SyntheticMarketDataProvider implements OpportunityMarketDataProvider {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async getSnapshot(instrument: OpportunityInstrument): Promise<OpportunityMarketSnapshot | null> {
    const base = Math.max(1, (hash(instrument.symbol) % 800) + 20);
    const now = this.now().getTime();
    const wave = Math.sin(now / 45_000 + (hash(instrument.id) % 17));
    const spread = Math.max(0.0001, base * 0.0015);
    const last = base * (1 + wave * 0.002);
    return {
      bid: Number((last - spread / 2).toFixed(6)),
      ask: Number((last + spread / 2).toFixed(6)),
      last: Number(last.toFixed(6)),
      previousClose: Number((base * (1 - wave * 0.0015)).toFixed(6)),
      volume: 100_000 + (hash(`${instrument.symbol}-${Math.floor(now / 60_000)}`) % 150_000),
      averageVolume: 140_000,
      volatility: Math.min(1, Math.abs(wave)),
      momentum: Number((wave * 0.9).toFixed(6)),
      trend: Number((wave * 0.8).toFixed(6)),
      correlation: Number((Math.cos(now / 90_000 + hash(instrument.symbol)) * 0.8).toFixed(6)),
      macroScore: Number((Math.sin(now / 300_000) * 0.7).toFixed(6)),
      capturedAt: this.now().toISOString(),
    };
  }
}

export class AlwaysAvailableCalendarProvider implements OpportunityCalendarProvider {
  async getSession(instrument: OpportunityInstrument, atIso: string): Promise<OpportunityCalendarSession | null> {
    const utcHour = new Date(atIso).getUTCHours();
    const phase =
      utcHour < 8 ? "overnight" : utcHour < 13 ? "premarket" : utcHour < 20 ? "regular" : "after-hours";
    return {
      phase,
      isOpen: phase === "regular" || phase === "premarket" || phase === "after-hours" || phase === "overnight",
      opensAt: atIso,
      closesAt: new Date(Date.parse(atIso) + 6 * 60 * 60 * 1000).toISOString(),
    };
  }
}

export class NoopNewsProvider implements OpportunityNewsProvider {
  async getHeadlines(_instrument: OpportunityInstrument): Promise<readonly string[]> {
    return [];
  }
}

export class NoopEventsProvider implements OpportunityEventsProvider {
  async getCorporateEvents(_instrument: OpportunityInstrument): Promise<readonly string[]> {
    return [];
  }
}

export class HeuristicPortfolioContextProvider implements OpportunityPortfolioContextProvider {
  async getImbalanceScore(instrument: OpportunityInstrument): Promise<number> {
    const value = (hash(`imbalance-${instrument.symbol}`) % 100) / 100;
    return Number(value.toFixed(6));
  }
}
