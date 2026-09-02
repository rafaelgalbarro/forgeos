import { describe, expect, it } from "vitest";

describe("portfolio routes", () => {
  it("exports list route component", async () => {
    const mod = await import("../page");
    expect(typeof mod.default).toBe("function");
  });

  it("exports command center routes", async () => {
    const overview = await import("../[portfolioId]/page");
    const ventures = await import("../[portfolioId]/ventures/page");
    const value = await import("../[portfolioId]/value/page");
    const analytics = await import("../[portfolioId]/analytics/page");
    const executions = await import("../[portfolioId]/executions/page");
    const resources = await import("../[portfolioId]/resources/page");
    expect(typeof overview.default).toBe("function");
    expect(typeof ventures.default).toBe("function");
    expect(typeof value.default).toBe("function");
    expect(typeof analytics.default).toBe("function");
    expect(typeof executions.default).toBe("function");
    expect(typeof resources.default).toBe("function");
  });
});
