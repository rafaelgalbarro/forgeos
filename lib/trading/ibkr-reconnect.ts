import "server-only";

import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { invalidateIbkrReadCache } from "@/lib/trading/ibkr-cache";
import { sendCriticalTelegramAlert } from "@/lib/notifications/telegram-policy";

export type IbkrReconnectResult = {
  connected: boolean;
  state?: string;
  error?: string;
  mode?: string;
  attempt?: number;
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

/** Soft reconnect + docker restart IB Gateway (up to 3 attempts, ~45s wait each). */
export async function autoReconnectIbkrBroker(): Promise<IbkrReconnectResult> {
  try {
    console.log("[AutoReconnect] Calling /api/ibkr/auto-reconnect…");
    const result = await ibkrServiceFetch<{
      connected?: boolean;
      state?: string;
      mode?: string;
      attempt?: number;
      message?: string;
      ok?: boolean;
    }>("/api/ibkr/auto-reconnect", {
      method: "POST",
      body: "{}",
      // docker restart + 45s × 3 can take >2 minutes
      signal: AbortSignal.timeout(240_000),
    });
    invalidateIbkrReadCache();
    return {
      connected: Boolean(result.connected),
      state: result.state,
      mode: result.mode,
      attempt: result.attempt,
      error: result.connected ? undefined : result.message,
    };
  } catch (err) {
    return {
      connected: false,
      error: err instanceof Error ? err.message : "IBKR auto-reconnect failed",
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

/** Cancel PreSubmitted/Submitted orders older than maxAgeSec (default 5 min). */
export async function cancelStaleIbkrOrders(maxAgeSec = 300): Promise<{
  count: number;
  cancelled: unknown[];
}> {
  try {
    const result = await ibkrServiceFetch<{
      count?: number;
      cancelled?: unknown[];
    }>(`/api/ibkr/orders/cancel-stale-presubmitted?maxAgeSec=${maxAgeSec}`, {
      method: "POST",
      body: "{}",
    });
    return {
      count: Number(result.count ?? 0),
      cancelled: Array.isArray(result.cancelled) ? result.cancelled : [],
    };
  } catch (err) {
    console.warn(
      "[Cycle] cancel stale orders failed:",
      err instanceof Error ? err.message : err,
    );
    return { count: 0, cancelled: [] };
  }
}

let monitorTimer: ReturnType<typeof setInterval> | null = null;
let consecutiveAutoReconnectFailures = 0;
let autoReconnectInFlight = false;

const MONITOR_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/** Background reconnect every 5 minutes when IBKR is down. */
export function startIbkrReconnectMonitor(): void {
  if (monitorTimer) return;
  void tickReconnectMonitor();
  monitorTimer = setInterval(() => void tickReconnectMonitor(), MONITOR_INTERVAL_MS);
}

async function tickReconnectMonitor(): Promise<void> {
  if (autoReconnectInFlight) return;
  try {
    const status = await ibkrServiceFetch<{ connected?: boolean; twsReachable?: boolean }>(
      "/api/ibkr/status",
    );
    if (status.connected) {
      consecutiveAutoReconnectFailures = 0;
      return;
    }

    autoReconnectInFlight = true;
    try {
      for (let i = 1; i <= 3; i += 1) {
        console.log(`[AutoReconnect] Intento ${i}/3 reconectando IBKR...`);
        const result = await autoReconnectIbkrBroker();
        if (result.connected) {
          consecutiveAutoReconnectFailures = 0;
          console.log(
            `[AutoReconnect] OK mode=${result.mode ?? "n/a"} attempt=${result.attempt ?? i}`,
          );
          return;
        }
        console.warn(
          `[AutoReconnect] Intento ${i}/3 falló: ${result.error ?? "still disconnected"}`,
        );
      }

      consecutiveAutoReconnectFailures += 1;
      if (consecutiveAutoReconnectFailures === 1) {
        await sendCriticalTelegramAlert(
          "🚨 IBKR DESCONECTADO — Requiere 2FA manual",
        );
      }
    } finally {
      autoReconnectInFlight = false;
    }
  } catch {
    /* FastAPI offline — next tick */
  }
}
