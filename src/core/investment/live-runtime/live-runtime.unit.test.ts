import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { deriveSessionPhase } from "./clock-and-timezones";
import { ReconnectManager } from "./reconnect-manager";
import { RuntimeHealth } from "./runtime-health";

describe("live runtime unit modules", () => {
  it("derives session phases with timezone + holidays", () => {
    const descriptor = {
      timezone: "America/New_York",
      holidaysUtc: ["2026-07-04"],
      premarketOpenLocal: "04:00",
      regularOpenLocal: "09:30",
      regularCloseLocal: "16:00",
      afterHoursCloseLocal: "20:00",
    };
    const premarket = deriveSessionPhase({
      utcIso: "2026-07-01T12:00:00.000Z",
      ...descriptor,
    });
    const regular = deriveSessionPhase({
      utcIso: "2026-07-01T14:00:00.000Z",
      ...descriptor,
    });
    const holiday = deriveSessionPhase({
      utcIso: "2026-07-04T14:00:00.000Z",
      ...descriptor,
    });
    expect(premarket).toBe("premarket");
    expect(regular).toBe("regular");
    expect(holiday).toBe("closed");
  });

  it("computes reconnect backoff with cap", () => {
    const reconnect = new ReconnectManager(100, 500);
    expect(reconnect.nextDelayMs()).toBe(100);
    expect(reconnect.nextDelayMs()).toBe(200);
    expect(reconnect.nextDelayMs()).toBe(400);
    expect(reconnect.nextDelayMs()).toBe(500);
    expect(reconnect.nextDelayMs()).toBe(500);
  });

  it("reports heartbeat lag and stale runtime markers", () => {
    const health = new RuntimeHealth();
    health.markConnection(true);
    health.heartbeat("2026-07-30T10:00:00.000Z");
    health.markStale("aapl", true);
    const snap = health.snapshot("2026-07-30T10:00:03.000Z");
    expect(snap.streamConnected).toBe(true);
    expect(snap.heartbeatLagMs).toBe(3000);
    expect(snap.staleRuntime).toBe(true);
  });

  it("keeps runtime free from direct IBKR imports", () => {
    const runtimeDir = path.resolve(
      process.cwd(),
      "src/core/investment/live-runtime",
    );
    const files = fs
      .readdirSync(runtimeDir)
      .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"));
    for (const file of files) {
      const fullPath = path.join(runtimeDir, file);
      const content = fs.readFileSync(fullPath, "utf8").toLowerCase();
      expect(content.includes("from \"ibkr")).toBe(false);
      expect(content.includes("from 'ibkr")).toBe(false);
      expect(content.includes("/ibkr")).toBe(false);
    }
  });
});
