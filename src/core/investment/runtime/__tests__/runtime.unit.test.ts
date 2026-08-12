import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DataFreshnessMonitor,
  deriveSessionPhase,
  HeartbeatService,
  MARKET_RUNTIME_EVENT_TYPES,
  ReconnectManager,
  RuntimeClock,
  RuntimeHealth,
} from "../index";

describe("live market runtime unit", () => {
  it("exposes the full normalized event catalog", () => {
    expect(MARKET_RUNTIME_EVENT_TYPES).toEqual([
      "MARKET_OPEN",
      "MARKET_CLOSE",
      "MARKET_TICK",
      "BAR_CLOSE",
      "POSITION_CHANGED",
      "ACCOUNT_CHANGED",
      "NEWS_RECEIVED",
      "MACRO_EVENT",
      "VOLATILITY_SPIKE",
      "LIQUIDITY_CHANGE",
      "SIGNAL_CREATED",
      "SIGNAL_EXPIRED",
      "RISK_UPDATED",
      "BROKER_CONNECTED",
      "BROKER_DISCONNECTED",
    ]);
  });

  it("derives session phases with timezone and holidays", () => {
    const descriptor = {
      timezone: "America/New_York",
      holidaysUtc: ["2026-07-04"],
      premarketOpenLocal: "04:00",
      regularOpenLocal: "09:30",
      regularCloseLocal: "16:00",
      afterHoursCloseLocal: "20:00",
    };
    expect(deriveSessionPhase({ utcIso: "2026-07-01T12:00:00.000Z", ...descriptor })).toBe("premarket");
    expect(deriveSessionPhase({ utcIso: "2026-07-01T14:00:00.000Z", ...descriptor })).toBe("regular");
    expect(deriveSessionPhase({ utcIso: "2026-07-04T14:00:00.000Z", ...descriptor })).toBe("closed");
  });

  it("computes reconnect backoff with cap", () => {
    const reconnect = new ReconnectManager(100, 500);
    expect(reconnect.nextDelayMs()).toBe(100);
    expect(reconnect.nextDelayMs()).toBe(200);
    expect(reconnect.nextDelayMs()).toBe(400);
    expect(reconnect.nextDelayMs()).toBe(500);
    expect(reconnect.nextDelayMs()).toBe(500);
    reconnect.reset();
    expect(reconnect.nextDelayMs()).toBe(100);
  });

  it("syncs runtime clock offset", () => {
    const clock = new RuntimeClock();
    const local = new Date("2026-07-30T10:00:00.000Z");
    const offset = clock.sync("2026-07-30T10:00:05.000Z", local);
    expect(offset).toBe(5_000);
    expect(clock.nowUtc(local)).toBe("2026-07-30T10:00:05.000Z");
  });

  it("detects stale ticks via freshness monitor", () => {
    const monitor = new DataFreshnessMonitor(1_000);
    const stale = monitor.inspect(
      {
        instrumentId: "AAPL",
        last: 100,
        delayed: true,
        capturedAtUtc: "2026-07-30T10:00:00.000Z",
      },
      "2026-07-30T10:00:05.000Z",
    );
    expect(stale).toBe(true);
    expect(monitor.staleInstruments()).toContain("AAPL");
  });

  it("tracks heartbeat lag", () => {
    const heartbeat = new HeartbeatService(1_000, 3, () => "2026-07-30T10:00:00.000Z");
    heartbeat.beat("2026-07-30T10:00:00.000Z");
    expect(heartbeat.lagMs("2026-07-30T10:00:02.000Z")).toBe(2_000);
    expect(heartbeat.isHealthy()).toBe(true);
  });

  it("reports combined runtime health", () => {
    const health = new RuntimeHealth();
    health.markStreamConnection(true);
    health.markBrokerConnection(true);
    health.heartbeat("2026-07-30T10:00:00.000Z");
    health.setClockOffset(250);
    health.markStale("AAPL", true);
    const snap = health.snapshot("2026-07-30T10:00:03.000Z");
    expect(snap.heartbeatLagMs).toBe(3_000);
    expect(snap.clockOffsetMs).toBe(250);
    expect(snap.staleRuntime).toBe(true);
  });

  it("keeps BrokerEngine files unmodified and never mutates trading mode flags", () => {
    const brokerEnginePort = path.resolve(process.cwd(), "src/core/application/ports/broker-engine.ts");
    const brokerEngineLib = path.resolve(process.cwd(), "lib/broker-engine");
    const runtimeDir = path.resolve(process.cwd(), "src/core/investment/runtime");

    expect(fs.existsSync(brokerEnginePort)).toBe(true);
    expect(fs.existsSync(brokerEngineLib) || fs.existsSync(`${brokerEngineLib}.ts`)).toBe(true);

    for (const file of walkTsFiles(runtimeDir)) {
      const content = fs.readFileSync(file, "utf8");
      expect(content).not.toMatch(/process\.env\.(LIVE_TRADING_ENABLED|IBKR_READ_ONLY)\s*=\s*["'`]/);
      expect(content).not.toMatch(/ANALYSIS_ONLY\s*=\s*["'`]/);
      expect(content.toLowerCase()).not.toContain('from "ibkr');
      expect(content.toLowerCase()).not.toContain("from 'ibkr");
    }

    const supervisor = fs.readFileSync(
      path.join(runtimeDir, "application", "runtime-supervisor.ts"),
      "utf8",
    );
    const sessions = fs.readFileSync(
      path.join(runtimeDir, "application", "broker-session-manager.ts"),
      "utf8",
    );
    expect(supervisor).toContain("ORDER_PATH_BLOCKED");
    expect(sessions).toContain("ORDER_PATH_BLOCKED");
  });
});

function walkTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkTsFiles(full));
    else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) out.push(full);
  }
  return out;
}
