import type { BrokerEngine, BrokerEngineRequest } from "@/src/core/application/ports/broker-engine";
import type { BrokerHealth, BrokerStatus, OpenOrder, Position } from "./types";
import { normalizePath, routeNotSupported } from "./utils";

const replayHealth: BrokerHealth = {
  ok: true,
  liveTradingEnabled: false,
  ibkrReadOnly: true,
  emergencyStop: false,
};

const replayStatus: BrokerStatus = {
  connected: true,
  nextOrderIdReady: true,
  nextValidId: 1,
  managedAccounts: ["REPLAY_SIM"],
  recentErrors: [],
  ibkrReadOnly: true,
  liveTradingEnabled: false,
};

const replayPositions: Position[] = [];
const replayOrders: OpenOrder[] = [];

export class ReplayBrokerEngine implements BrokerEngine {
  readonly name = "replay" as const;

  async request<T>(request: BrokerEngineRequest): Promise<T> {
    const path = normalizePath(request.path);
    if (request.method === "GET" && path === "/health") return replayHealth as T;
    if (request.method === "POST" && path === "/api/ibkr/connect") return replayStatus as T;
    if (request.method === "GET" && path === "/api/ibkr/status") return replayStatus as T;
    if (request.method === "GET" && path === "/api/ibkr/account") return {} as T;
    if (request.method === "GET" && path === "/api/ibkr/positions") return replayPositions as T;
    if (request.method === "GET" && path === "/api/ibkr/orders") return replayOrders as T;
    if (request.method === "GET" && path === "/api/proposals") return [] as T;
    if (request.method === "POST" && path === "/api/proposals") return { detail: "Replay mode is read-only" } as T;
    if (request.method === "POST" && path.includes("/decision")) return { detail: "Replay mode is read-only" } as T;
    if (request.method === "POST" && path.includes("/execute")) return { detail: "Replay mode is read-only" } as T;
    routeNotSupported(path);
  }
}

export function createReplayBrokerEngine(): BrokerEngine {
  return new ReplayBrokerEngine();
}
