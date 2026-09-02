import { describe, expect, it } from "vitest";

describe("investment shadow route", () => {
  it("exports shadow page component", async () => {
    const mod = await import("../page");
    expect(typeof mod.default).toBe("function");
  }, 30_000);

  it("declares route metadata", async () => {
    const mod = await import("../page");
    expect(mod.metadata.title).toContain("Shadow Trading");
  }, 30_000);
});
