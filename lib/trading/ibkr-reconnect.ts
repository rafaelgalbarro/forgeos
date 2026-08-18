import "server-only";

import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { invalidateIbkrReadCache } from "@/lib/trading/ibkr-cache";

export type IbkrReconnectResult = {
  connected: boolean;
  state?: string;
  error?: string;
};

export async function reconnectIbkrBroker(): Promise<IbkrReconnectResult> {
  try {
    const result = await ibkrServiceFetch<{
      connected?: boolean;
      state?: string;
    }>("/api/ibkr/reconnect", {
      method: "POST",
      body: "{}",
    });
    invalidateIbkrReadCache();
    return {
      connected: Boolean(result.connected),
      state: result.state,
    };
  } catch (err) {
    return {
      connected: false,
      error: err instanceof Error ? err.message : "IBKR reconnect failed",
    };
  }
}

export async function ensureIbkrBrokerConnected(): Promise<boolean> {
  try {
    const status = await ibkrServiceFetch<{ connected?: boolean; twsReachable?: boolean }>(
      "/api/ibkr/status",
    );
    if (status.connected) return true;
    if (status.twsReachable === false) return false;
    const reconnected = await reconnectIbkrBroker();
    return reconnected.connected;
  } catch {
    return false;
  }
}

let monitorTimer: ReturnType<typeof setInterval> | null = null;

/** Background reconnect when TWS is up but API socket dropped. */
export function startIbkrReconnectMonitor(): void {
  if (monitorTimer) return;
  const intervalMs = 60_000;
  void tickReconnectMonitor();
  monitorTimer = setInterval(() => void tickReconnectMonitor(), intervalMs);
}

async function tickReconnectMonitor(): Promise<void> {
  try {
    const status = await ibkrServiceFetch<{ connected?: boolean; twsReachable?: boolean }>(
      "/api/ibkr/status",
    );
    if (!status.connected && status.twsReachable !== false) {
      await reconnectIbkrBroker();
    }
  } catch {
    /* FastAPI offline — next tick */
  }
}
