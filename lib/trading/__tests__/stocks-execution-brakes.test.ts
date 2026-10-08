/**
 * Reproduces 08/10 GSK + VWAGY NO_ACK storm:
 * - after 1 retry/day → ManualBlock (no further submits)
 * - >3 NO_ACK/rejects in 30 min → 2h global pause
 * - OTC/PINK (VWAGY) excluded
 * - ibkr-non-tradable.json re-read from disk (no stale memory)
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/notifications/telegram-bot", () => ({
  sendTelegramMessage: vi.fn(async () => undefined),
}));

vi.mock("@/lib/ibkr/service-client", () => ({
  ibkrServiceFetch: vi.fn(async () => []),
}));

vi.mock("@/lib/trading/ibkr-reconnect", () => ({
  assertOrdersAllowedAfterReconnect: vi.fn(),
}));

describe("stocks execution brakes (08/10 addendum)", () => {
  let tmp: string;
  let prevCwd: string;

  beforeEach(() => {
    prevCwd = process.cwd();
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "forgeos-brakes-"));
    fs.mkdirSync(path.join(tmp, ".forgeos", "cache"), { recursive: true });
    process.chdir(tmp);
    vi.resetModules();
  });

  afterEach(() => {
    process.chdir(prevCwd);
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it("excludes VWAGY and other OTC/PINK from executable universe", async () => {
    const { isOtcPinkNonExecutable } = await import("@/lib/trading/otc-pink");
    expect(isOtcPinkNonExecutable("VWAGY")).toBe(true);
    expect(isOtcPinkNonExecutable("LVMUY")).toBe(true);
    expect(isOtcPinkNonExecutable("GSK")).toBe(false);
    expect(isOtcPinkNonExecutable("AAPL")).toBe(false);
  });

  it("global brake: 4th NO_ACK/reject in 30 min pauses 2h", async () => {
    const {
      recordStocksRejectOrNoAck,
      stocksExecutionPausedUntil,
      assertStocksExecutionAllowed,
      __resetStocksExecutionGateForTests,
    } = await import("@/lib/trading/stocks-execution-gate");
    __resetStocksExecutionGateForTests();

    for (const sym of ["GSK", "VWAGY", "GSK"]) {
      const r = await recordStocksRejectOrNoAck({ symbol: sym, kind: "NO_ACK" });
      expect(r.paused).toBe(false);
    }
    const fourth = await recordStocksRejectOrNoAck({
      symbol: "GSK",
      kind: "NO_ACK",
    });
    expect(fourth.paused).toBe(true);
    expect(stocksExecutionPausedUntil()).not.toBeNull();
    expect(() => assertStocksExecutionAllowed({ side: "BUY" })).toThrow(
      /STOCKS_EXECUTION_PAUSED/,
    );
  });

  it("NO_ACK: max 1 retry/ticker/day then ManualBlock — GSK storm stops", async () => {
    const { gateNoAckRetry, noAckRetriesToday, recordNoAckRetry } = await import(
      "@/lib/trading/ibkr-no-ack-guard"
    );
    const { isIbkrNonTradable, recordManualBlock } = await import(
      "@/lib/trading/ibkr-non-tradable"
    );

    // Simulate first retry allowed
    expect(noAckRetriesToday("GSK")).toBe(0);
    const first = await gateNoAckRetry("GSK", { side: "BUY" });
    expect(first.action).toBe("proceed");
    expect(noAckRetriesToday("GSK")).toBe(1);

    // Second attempt same day → blocked + ManualBlock (08/10: would have been attempt 2..80)
    const second = await gateNoAckRetry("GSK", { side: "BUY" });
    expect(second.action).toBe("blocked");
    expect(isIbkrNonTradable("GSK")).toBe(true);

    // Further storm attempts also blocked via ManualBlock assert
    await expect(gateNoAckRetry("GSK", { side: "BUY" })).rejects.toThrow(
      /bloqueado|ManualBlock|NO_ACK/i,
    );

    // VWAGY same policy
    recordNoAckRetry("VWAGY");
    await recordManualBlock({
      symbol: "VWAGY",
      message: "NO_ACK — ya se reintentó 1× hoy",
    });
    expect(isIbkrNonTradable("VWAGY")).toBe(true);
    await expect(gateNoAckRetry("VWAGY", { side: "BUY" })).rejects.toThrow(
      /bloqueado|ManualBlock/i,
    );
  });

  it("ibkr-non-tradable is re-read from disk (DTE block must stop next send)", async () => {
    const cacheFile = path.join(tmp, ".forgeos", "cache", "ibkr-non-tradable.json");
    // Simulate another worker writing DTE ManualBlock at 14:39
    fs.writeFileSync(
      cacheFile,
      JSON.stringify(
        {
          updatedAt: "2026-10-08T14:39:34.000Z",
          entries: {
            DTE: {
              symbol: "DTE",
              code: null,
              message: "ManualBlock test",
              ibkrStatus: "ManualBlock",
              addedAt: "2026-10-08T14:39:34.000Z",
              telegramSent: true,
              expiresAt: null,
            },
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    const { isIbkrNonTradable, assertIbkrTradable } = await import(
      "@/lib/trading/ibkr-non-tradable"
    );
    expect(isIbkrNonTradable("DTE")).toBe(true);
    expect(() => assertIbkrTradable("DTE")).toThrow(/DTE.*bloqueado|ManualBlock/i);

    // Fresh write of TEF mid-process must be visible without restart
    const disk = JSON.parse(fs.readFileSync(cacheFile, "utf8")) as {
      entries: Record<string, unknown>;
      updatedAt: string;
    };
    disk.entries.TEF = {
      symbol: "TEF",
      code: null,
      message: "blocked at 14:48",
      ibkrStatus: "ManualBlock",
      addedAt: "2026-10-08T14:48:00.000Z",
      telegramSent: true,
      expiresAt: null,
    };
    disk.updatedAt = "2026-10-08T14:48:00.000Z";
    fs.writeFileSync(cacheFile, JSON.stringify(disk, null, 2), "utf8");

    expect(isIbkrNonTradable("TEF")).toBe(true);
    expect(() => assertIbkrTradable("TEF")).toThrow(/TEF/);
  });

  it("STOCKS_EXECUTION_ENABLED=false blocks BUY without process restart", async () => {
    fs.writeFileSync(
      path.join(tmp, ".env.local"),
      "STOCKS_EXECUTION_ENABLED=false\n",
      "utf8",
    );
    const {
      isStocksExecutionEnabled,
      assertStocksExecutionAllowed,
      __resetStocksExecutionGateForTests,
    } = await import("@/lib/trading/stocks-execution-gate");
    __resetStocksExecutionGateForTests();
    expect(isStocksExecutionEnabled()).toBe(false);
    expect(() => assertStocksExecutionAllowed({ side: "BUY" })).toThrow(
      /STOCKS_EXECUTION_ENABLED=false/,
    );
    // SELLs still allowed when only the flag is off (exits)
    expect(() => assertStocksExecutionAllowed({ side: "SELL" })).not.toThrow();
  });
});
