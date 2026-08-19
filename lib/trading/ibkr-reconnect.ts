import "server-only";

import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { invalidateIbkrReadCache } from "@/lib/trading/ibkr-cache";
import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";

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
let consecutiveReconnectFailures = 0;

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
      let ok = false;
      for (let i = 0; i < 3; i += 1) {
        const reconnected = await reconnectIbkrBroker();
        if (reconnected.connected) {
          ok = true;
          consecutiveReconnectFailures = 0;
          break;
        }
      }
      if (!ok) {
        consecutiveReconnectFailures += 1;
        if (consecutiveReconnectFailures === 1) {
          await sendTelegramMessage(
            "⚠️ IBKR desconectado — revisión manual necesaria (falló reconexión tras 3 intentos)",
          );
        }
      }
    } else if (status.connected) {
      consecutiveReconnectFailures = 0;
    }
  } catch {
    /* FastAPI offline — next tick */
  }
}
