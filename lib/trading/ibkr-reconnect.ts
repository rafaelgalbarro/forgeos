import "server-only";

import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { invalidateIbkrAccountPositionsCache } from "@/lib/ibkr/broker-reads";
import { invalidateIbkrReadCache } from "@/lib/trading/ibkr-cache";
import { sendCriticalTelegramAlert } from "@/lib/notifications/telegram-policy";

export type IbkrReconnectResult = {
  connected: boolean;
  state?: string;
  error?: string;
  mode?: string;
  attempt?: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Explicit reconnect — ONLY from the dashboard "Reconectar Broker" button.
 * Never call from cycles, monitors, cron, or order submit.
 */
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
    invalidateIbkrAccountPositionsCache();
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

/** @deprecated Prefer reconnectIbkrBroker from UI only. Kept for explicit dashboard paths. */
export async function autoReconnectIbkrBroker(): Promise<IbkrReconnectResult> {
  return reconnectIbkrBroker();
}

/**
 * Status-only gate — wait/retry if disconnected.
 * NEVER POSTs /connect or /reconnect (that floods the broker).
 */
export async function ensureIbkrBrokerConnected(): Promise<boolean> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const status = await ibkrServiceFetch<{ connected?: boolean; twsReachable?: boolean }>(
        "/api/ibkr/status",
      );
      if (status.connected) return true;
      if (status.twsReachable === false) return false;
    } catch {
      /* broker busy / offline */
    }
    if (attempt < 3) await sleep(1_500);
  }
  return false;
}

const CANCEL_STALE_MIN_INTERVAL_MS = 5 * 60_000;
let lastCancelStaleAt = 0;

/** Cancel PreSubmitted/Submitted orders older than maxAgeSec — at most once per 5 minutes. */
export async function cancelStaleIbkrOrders(maxAgeSec = 300): Promise<{
  count: number;
  cancelled: unknown[];
  skipped?: boolean;
}> {
  const now = Date.now();
  if (now - lastCancelStaleAt < CANCEL_STALE_MIN_INTERVAL_MS) {
    return { count: 0, cancelled: [], skipped: true };
  }
  lastCancelStaleAt = now;
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
let disconnectAlertSent = false;

const MONITOR_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Background status watcher — logs disconnect + one Telegram alert.
 * Does NOT call connect/reconnect (user must use dashboard button).
 */
export function startIbkrReconnectMonitor(): void {
  if (monitorTimer) return;
  void tickStatusMonitor();
  monitorTimer = setInterval(() => void tickStatusMonitor(), MONITOR_INTERVAL_MS);
}

async function tickStatusMonitor(): Promise<void> {
  try {
    const status = await ibkrServiceFetch<{ connected?: boolean; twsReachable?: boolean }>(
      "/api/ibkr/status",
    );
    if (status.connected) {
      disconnectAlertSent = false;
      return;
    }
    console.warn(
      `[IbkrMonitor] disconnected twsReachable=${String(status.twsReachable)} — use dashboard Reconectar Broker`,
    );
    if (!disconnectAlertSent) {
      disconnectAlertSent = true;
      await sendCriticalTelegramAlert(
        "🚨 IBKR DESCONECTADO — Pulsa «Reconectar Broker» en el dashboard (sin auto-connect)",
      );
    }
  } catch {
    /* FastAPI offline — next tick */
  }
}
