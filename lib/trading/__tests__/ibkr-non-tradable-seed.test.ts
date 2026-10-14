import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("ibkr-non-tradable seeding", () => {
  it("does not re-seed DTE/TEF ManualBlock on load", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "forge-non-tradable-"));
    const prev = process.cwd();
    process.chdir(tmp);
    fs.mkdirSync(path.join(tmp, ".forgeos", "cache"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, ".forgeos", "cache", "ibkr-non-tradable.json"),
      JSON.stringify({ updatedAt: new Date().toISOString(), entries: {} }, null, 2),
      "utf8",
    );

    const { isIbkrNonTradable } = await import("@/lib/trading/ibkr-non-tradable");
    expect(isIbkrNonTradable("DTE")).toBe(false);
    expect(isIbkrNonTradable("TEF")).toBe(false);

    const raw = JSON.parse(
      fs.readFileSync(path.join(tmp, ".forgeos", "cache", "ibkr-non-tradable.json"), "utf8"),
    ) as { entries: Record<string, unknown> };
    expect(raw.entries.DTE).toBeUndefined();
    expect(raw.entries.TEF).toBeUndefined();

    process.chdir(prev);
  });
});
