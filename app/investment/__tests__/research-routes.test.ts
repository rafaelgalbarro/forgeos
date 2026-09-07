import { describe, expect, it } from "vitest";

describe("research API route smoke", () => {
  it("exports GET and returns ANALYSIS_ONLY status view", async () => {
    const mod = await import("../../api/investment/research/route");
    expect(typeof mod.GET).toBe("function");

    const res = await mod.GET(
      new Request("http://localhost/api/investment/research?view=status&symbols=AAPL"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.mode).toBe("ANALYSIS_ONLY");
    expect(body.orderExecution).toBe("disabled");
    expect(body.liveTradingEnabled).toBe(false);
    expect(body.view).toBe("status");
    expect(Array.isArray(body.engines)).toBe(true);
    expect(body.engines.length).toBeGreaterThanOrEqual(9);
    const pattern = body.engines.find((e: { id: string }) => e.id === "pattern");
    expect(pattern?.wiring).toBe("STUB");
  }, 60_000);

  it("returns memory view as append-only index shape", async () => {
    const mod = await import("../../api/investment/research/route");
    const res = await mod.GET(
      new Request("http://localhost/api/investment/research?view=memory&limit=5"),
    );
    const body = await res.json();
    expect(body.mode).toBe("ANALYSIS_ONLY");
    expect(body.view).toBe("memory");
    expect(body.index.orderExecution).toBe("disabled");
    expect(Array.isArray(body.index.ids)).toBe(true);
    expect(Array.isArray(body.entries)).toBe(true);
  }, 30_000);

  it("exports research page component", async () => {
    const page = await import("../research/page");
    expect(typeof page.default).toBe("function");
  }, 30_000);
});
