import { afterEach, describe, expect, it, vi } from "vitest";

describe("portfolio analytics provider contract", () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.IBKR_INTERNAL_API_KEY;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.IBKR_INTERNAL_API_KEY = originalApiKey;
    vi.restoreAllMocks();
  });

  it("uses read-only broker paths and never order endpoints", async () => {
    process.env.IBKR_INTERNAL_API_KEY = "test-key-12345678901234567890";
    vi.resetModules();
    const calledPaths: string[] = [];

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calledPaths.push(url);
      const body = url.includes("/positions")
        ? [{ symbol: "AAPL", position: 1, avgCost: 100, currency: "USD" }]
        : { U12345: { TotalCashValue: { value: "1000", currency: "USD" } } };
      return new Response(JSON.stringify(body), { status: 200 });
    }) as typeof fetch;

    const { createIbkrPortfolioAnalyticsProvider } = await import(
      "../portfolio-analytics-provider"
    );
    const provider = createIbkrPortfolioAnalyticsProvider();
    await provider.loadSnapshot();

    expect(calledPaths.some((path) => path.includes("/api/ibkr/positions"))).toBe(true);
    expect(calledPaths.some((path) => path.includes("/api/ibkr/account"))).toBe(true);
    expect(calledPaths.some((path) => path.includes("/api/proposals"))).toBe(false);
    expect(calledPaths.some((path) => path.includes("/execute"))).toBe(false);
    expect(calledPaths.some((path) => path.includes("/decision"))).toBe(false);
    expect(calledPaths.some((path) => path.includes("/connect"))).toBe(false);
  });
});
