import { describe, expect, it } from "vitest";

/**
 * Stock >5% from support must reach strategy evaluation (not pre-discarded).
 * We assert the support skip early-return was removed from evaluateProStrategies.
 */
describe("Task J stocks support penalty", () => {
  it("evaluateProStrategies source has no Soporte >5% skip hold", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const file = path.join(
      process.cwd(),
      "src/core/trading/strategies/pro-strategies.ts",
    );
    const src = fs.readFileSync(file, "utf8");
    expect(src).not.toMatch(/Soporte >5% lejos — skip/);
    expect(src).toMatch(/supportDistPct/);
  });
});
