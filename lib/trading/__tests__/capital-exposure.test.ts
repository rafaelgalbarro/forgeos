import { describe, expect, it } from "vitest";
import {
  computeForgeOsExposureUsd,
  type IbkrPositionRow,
} from "@/lib/trading/capital";

describe("computeForgeOsExposureUsd", () => {
  const owned = (symbol: string) => symbol === "IBE";

  it("ignores orphan IBKR rows and legacy tickers per account", () => {
    const positions: IbkrPositionRow[] = [
      { account: "U15513057", symbol: "PTPI", position: 100, marketValue: 1500 },
      { account: "U15513057", symbol: "CGBSF", position: 50, marketValue: 800 },
      { account: "U15513057", symbol: "APTX.OLD", position: 10, marketValue: 200 },
      { account: "U24225949", symbol: "AAPL", position: 5, marketValue: 900 },
    ];
    const eur = computeForgeOsExposureUsd(positions, "U15513057", owned);
    expect(eur.exposureUSD).toBe(0);
    expect(eur.openTickers).toEqual([]);

    const usd = computeForgeOsExposureUsd(positions, "U24225949", owned);
    expect(usd.exposureUSD).toBe(0);
  });

  it("sums ForgeOS-owned market value only on the requested account", () => {
    const positions: IbkrPositionRow[] = [
      { account: "U15513057", symbol: "IBE", position: 10, marketValue: 250.5 },
      { account: "U15513057", symbol: "NCNA", position: 100, marketValue: 4000 },
      { account: "U24225949", symbol: "IBE", position: 3, marketValue: 99 },
    ];
    const eur = computeForgeOsExposureUsd(positions, "U15513057", owned);
    expect(eur.exposureUSD).toBe(250.5);
    expect(eur.openTickers).toEqual(["IBE"]);

    const usd = computeForgeOsExposureUsd(positions, "U24225949", owned);
    expect(usd.exposureUSD).toBe(99);
    expect(usd.openTickers).toEqual(["IBE"]);
  });

  it("uses avg cost when market value missing", () => {
    const positions: IbkrPositionRow[] = [
      { account: "U15513057", symbol: "IBE", position: 2, avgCost: 12.5 },
    ];
    const r = computeForgeOsExposureUsd(positions, "U15513057", owned);
    expect(r.exposureUSD).toBe(25);
  });
});
