import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BrokerEngine } from "@/src/core/application/ports/broker-engine";
import { createBrokerEngine } from "@/lib/broker-engine";
import { createIbkrBrokerEngine } from "@/lib/broker-engine/ibkr-broker-engine";
import { createPaperBrokerEngine } from "@/lib/broker-engine/paper-broker-engine";
import { createReplayBrokerEngine } from "@/lib/broker-engine/replay-broker-engine";

function expectContract(engine: BrokerEngine) {
  expect(engine).toBeTruthy();
  expect(typeof engine.request).toBe("function");
  expect(engine.name.length).toBeGreaterThan(0);
}

function usePaperStorePath(): string {
  const storePath = path.join(os.tmpdir(), `forgeos-paper-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
  process.env.PAPER_TRADING_STORE_PATH = storePath;
  return storePath;
}

afterEach(() => {
  delete process.env.PAPER_TRADING_STORE_PATH;
  delete process.env.TRADING_MODE;
  delete process.env.LIVE_TRADING_ENABLED;
});

describe("BrokerEngine contract", () => {
  it("all built-in engines satisfy BrokerEngine interface", () => {
    expectContract(createIbkrBrokerEngine());
    expectContract(createPaperBrokerEngine());
    expectContract(createReplayBrokerEngine());
    expectContract(createBrokerEngine("future"));
  });

  it("IBKR engine path works through BrokerEngine request", async () => {
    const previousKey = process.env.IBKR_INTERNAL_API_KEY;
    process.env.IBKR_INTERNAL_API_KEY = "x".repeat(24);

    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      text: async () => JSON.stringify({ connected: true }),
      json: async () => ({ connected: true }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const engine = createIbkrBrokerEngine();
    const result = await engine.request<{ connected: boolean }>({
      path: "/api/ibkr/status",
      method: "GET",
      queryString: "",
    });

    expect(result.connected).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
    if (previousKey === undefined) delete process.env.IBKR_INTERNAL_API_KEY;
    else process.env.IBKR_INTERNAL_API_KEY = previousKey;
  });

  it("paper engine supports basic proposal flow", async () => {
    const statePath = usePaperStorePath();
    const engine = createPaperBrokerEngine();
    const proposal = await engine.request<{ id: string; status: string }>({
      path: "/api/proposals",
      method: "POST",
      body: JSON.stringify({ symbol: "AAPL", side: "BUY", quantity: 1, limit_price: 1, currency: "USD" }),
    });
    expect(proposal.status).toBe("PENDING");

    await engine.request({
      path: `/api/proposals/${proposal.id}/decision`,
      method: "POST",
      body: JSON.stringify({ decision: "APPROVE", confirmation_phrase: `APPROVE ${proposal.id}` }),
    });
    const executed = await engine.request<{ status: string }>({
      path: `/api/proposals/${proposal.id}/execute`,
      method: "POST",
      body: JSON.stringify({ approval_token: "paper", confirmation_phrase: `EXECUTE LIVE ${proposal.id}` }),
    });
    expect(executed.status).toBe("EXECUTED");
    expect(fs.existsSync(statePath)).toBe(true);
  });

  it("replay engine remains read-only", async () => {
    const engine = createReplayBrokerEngine();
    const result = await engine.request<{ detail: string }>({
      path: "/api/proposals",
      method: "POST",
      body: JSON.stringify({ symbol: "AAPL" }),
    });
    expect(result.detail).toContain("read-only");
  });

  it("broker route depends on BrokerEngine abstraction", () => {
    const routePath = path.resolve(process.cwd(), "app/api/broker/[...path]/route.ts");
    const source = fs.readFileSync(routePath, "utf8");
    expect(source).toContain('from "@/lib/broker-engine"');
    expect(source).toContain("createIbkrBrokerEngine");
    expect(source).not.toContain('from "@/lib/ibkr/service-client"');
  });

  it("defaults to paper trading mode and blocks implicit live engine usage", () => {
    process.env.TRADING_MODE = "paper";
    process.env.BROKER_ENGINE = "ibkr";
    usePaperStorePath();
    const engine = createBrokerEngine("ibkr");
    expect(engine.name).toBe("paper");
  });

  it("rejects live mode when not explicitly enabled", () => {
    process.env.TRADING_MODE = "live";
    process.env.BROKER_ENGINE = "ibkr";
    expect(() => createBrokerEngine("ibkr")).toThrow(/LIVE_TRADING_ENABLED/);
  });
});
