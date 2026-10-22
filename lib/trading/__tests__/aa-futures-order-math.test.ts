import { describe, expect, it } from "vitest";
import {
  isAcceptedSendStatus,
  quantizeStopConservative,
  signalPriceToContract,
  sizeForNotionalUsd,
} from "@/lib/brokers/kraken-futures/order-math";
import { chartsCandlesUrl, parseChartsCandles } from "@/lib/brokers/kraken-futures/charts";

const LINK = {
  symbol: "PF_LINKUSD",
  tickSize: 0.001,
  contractSize: 1,
  contractValueTradePrecision: 1,
  tradeable: true,
  base: "LINK",
  quote: "USD",
  minSize: 0.1,
};

describe("AA futures: orders=0 causes", () => {
  it("short stop from EUR signal is moved above the USD mark", () => {
    // signal on EUR price 15.00 with stop 15.30; PF mark is 16.80 USD
    const stop = signalPriceToContract(15.3, 15.0, 16.8);
    expect(stop).toBeGreaterThan(16.8);
    expect(quantizeStopConservative(stop, 0.001, "short")).toBeCloseTo(17.136, 6);
  });

  it("sizing explains below-minimum instead of returning null", () => {
    const btc = { ...LINK, symbol: "PF_XBTUSD", tickSize: 1, contractValueTradePrecision: 4, minSize: 0.0001 };
    const r = sizeForNotionalUsd({ symbol: "PF_XBTUSD", meta: btc, notionalUsd: 5, price: 110_000, eurUsd: 1.12 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/below_min_contract/);
  });

  it("sizes 10€ of LINK", () => {
    const r = sizeForNotionalUsd({ symbol: "PF_LINKUSD", meta: LINK, notionalUsd: 11.2, price: 16.8, eurUsd: 1.12 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.size).toBeCloseTo(0.6, 6);
  });

  it("rejected sendorder statuses are detected", () => {
    expect(isAcceptedSendStatus("placed")).toBe(true);
    expect(isAcceptedSendStatus("invalidPrice")).toBe(false);
    expect(isAcceptedSendStatus("insufficientAvailableFunds")).toBe(false);
  });
});

describe("AA futures: charts backfill", () => {
  it("builds the Charts API URL with 1h resolution", () => {
    expect(chartsCandlesUrl({ demo: false, symbol: "pf_xbtusd", minutes: 60, count: 300 })).toBe(
      "https://futures.kraken.com/api/charts/v1/trade/PF_XBTUSD/1h?count=300",
    );
  });

  it("parses candles (ms time, string prices) sorted ascending", () => {
    const out = parseChartsCandles({
      candles: [
        { time: 1620820560000, open: "2", high: "3", low: "1", close: "2.5", volume: 5 },
        { time: 1620816960000, open: "1", high: "2", low: "0.5", close: "1.5", volume: 3 },
      ],
    });
    expect(out).toHaveLength(2);
    expect(out[0]!.close).toBe(1.5);
    expect(out[1]!.time).toBe(new Date(1620820560000).toISOString());
  });
});
