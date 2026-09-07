"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import type {
  AccountMap,
  BrokerHealth,
  BrokerStatus,
  BrokerTerminalSnapshot,
  DataSourceLabel,
  IbkrOpenOrder,
  IbkrPosition,
  MarketDataLabel,
  SectionState,
} from "./types";

const POLL_CONNECTED_MS = 8_000;
const POLL_DISCONNECTED_MS = 30_000;
const FETCH_TIMEOUT_MS = 6_000;
const CONNECT_TIMEOUT_MS = 12_000;

type TerminalApi = {
  snapshot: BrokerTerminalSnapshot;
  busy: boolean;
  message: string;
  connect: () => Promise<void>;
  refresh: () => Promise<void>;
  clearMessage: () => void;
};

const BrokerTerminalContext = createContext<TerminalApi | null>(null);

function emptySnapshot(partial?: Partial<BrokerTerminalSnapshot>): BrokerTerminalSnapshot {
  return {
    health: null,
    status: null,
    account: null,
    positions: [],
    orders: [],
    lastSyncAt: null,
    latencyMs: null,
    dataSource: "UNAVAILABLE",
    marketData: "UNAVAILABLE",
    sectionStates: {
      header: "LOADING",
      summary: "LOADING",
      positions: "LOADING",
      orders: "LOADING",
    },
    errors: {},
    degraded: false,
    ...partial,
  };
}

async function fetchJsonWithTimeout<T>(
  path: string,
  init?: RequestInit,
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<{ ok: boolean; data: T | null; error: string | null; latencyMs: number }> {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const result = await safeJsonFetch<T & { error?: string; detail?: string; state?: string }>(
      `/api/broker${path}`,
      {
        ...init,
        signal: controller.signal,
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
        cache: "no-store",
      },
    );
    const latencyMs = Math.round(performance.now() - started);
    if (!result.ok || result.data == null) {
      return { ok: false, data: result.data as T | null, error: result.error ?? "Broker error", latencyMs };
    }
    const body = result.data as { error?: string; detail?: string };
    if (typeof body === "object" && body && ("error" in body || "detail" in body) && result.status >= 400) {
      return {
        ok: false,
        data: result.data,
        error: body.error ?? body.detail ?? "Broker error",
        latencyMs,
      };
    }
    return { ok: true, data: result.data, error: null, latencyMs };
  } catch (error) {
    const latencyMs = Math.round(performance.now() - started);
    const message =
      error instanceof Error
        ? error.name === "AbortError"
          ? `Timeout after ${timeoutMs}ms`
          : error.message
        : "Broker request failed";
    return { ok: false, data: null, error: message, latencyMs };
  } finally {
    clearTimeout(timer);
  }
}

function resolveDataSource(status: BrokerStatus | null): DataSourceLabel {
  if (!status) return "UNAVAILABLE";
  if (status.connected) return "IBKR_LIVE_READ_ONLY";
  return "UNAVAILABLE";
}

/** Positions endpoint has no live quotes → UNAVAILABLE unless enrichment exists. */
function resolveMarketData(positions: IbkrPosition[]): MarketDataLabel {
  const hasPrice = positions.some((p) => typeof p.marketPrice === "number" && Number.isFinite(p.marketPrice));
  return hasPrice ? "LIVE" : "UNAVAILABLE";
}

function sectionFrom(ok: boolean, empty: boolean, error?: string): SectionState {
  if (error && !ok) return empty ? "UNAVAILABLE" : "DEGRADED";
  if (!ok) return "ERROR";
  return "READY";
}

export function BrokerTerminalProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<BrokerTerminalSnapshot>(() => emptySnapshot());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const autoConnectAttempted = useRef(false);
  const inFlight = useRef(false);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const refreshLive = useCallback(async () => {
    if (inFlight.current) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    inFlight.current = true;

    const errors: BrokerTerminalSnapshot["errors"] = {};
    let health: BrokerHealth | null = snapshotRef.current.health;
    let status: BrokerStatus | null = snapshotRef.current.status;
    let account: AccountMap | null = snapshotRef.current.account;
    let positions: IbkrPosition[] = snapshotRef.current.positions;
    let orders: IbkrOpenOrder[] = snapshotRef.current.orders;
    let latencyMs: number | null = null;

    try {
      const [healthRes, statusRes] = await Promise.all([
        fetchJsonWithTimeout<BrokerHealth>("/health"),
        fetchJsonWithTimeout<BrokerStatus>("/status"),
      ]);

      if (healthRes.ok && healthRes.data) health = healthRes.data;
      else errors.health = healthRes.error ?? "Health unavailable";

      if (statusRes.ok && statusRes.data) {
        status = statusRes.data;
        latencyMs = statusRes.latencyMs;
      } else {
        errors.status = statusRes.error ?? "Status unavailable";
        latencyMs = statusRes.latencyMs;
        if (statusRes.data && typeof statusRes.data === "object") {
          status = { ...(status ?? { connected: false, nextOrderIdReady: false, managedAccounts: [] }), ...statusRes.data };
        }
      }

      const connected = Boolean(status?.connected);

      if (connected) {
        const [accountRes, positionsRes, ordersRes] = await Promise.all([
          fetchJsonWithTimeout<AccountMap>("/account"),
          fetchJsonWithTimeout<IbkrPosition[]>("/positions"),
          fetchJsonWithTimeout<IbkrOpenOrder[]>("/orders"),
        ]);

        if (accountRes.ok && accountRes.data && !Array.isArray(accountRes.data)) {
          account = accountRes.data;
        } else {
          errors.account = accountRes.error ?? "Account unavailable";
        }

        if (positionsRes.ok && Array.isArray(positionsRes.data)) {
          positions = positionsRes.data;
        } else {
          errors.positions = positionsRes.error ?? "Positions unavailable";
        }

        if (ordersRes.ok && Array.isArray(ordersRes.data)) {
          orders = ordersRes.data;
        } else {
          errors.orders = ordersRes.error ?? "Orders unavailable";
        }
      } else {
        // Keep last good portfolio snapshot when disconnected; mark degraded.
        errors.status = errors.status ?? "IBKR disconnected";
      }

      const dataSource = resolveDataSource(status);
      const marketData = resolveMarketData(positions);
      const degraded = Boolean(
        errors.status || errors.health || errors.account || errors.positions || errors.orders || !status?.connected,
      );

      setSnapshot({
        health,
        status,
        account: connected ? account : account,
        positions,
        orders,
        lastSyncAt: new Date().toISOString(),
        latencyMs,
        dataSource,
        marketData,
        sectionStates: {
          header: sectionFrom(Boolean(status || health), false, errors.status ?? errors.health),
          summary: connected
            ? sectionFrom(!errors.account, !account || Object.keys(account).length === 0, errors.account)
            : "DEGRADED",
          positions: connected
            ? sectionFrom(!errors.positions, positions.length === 0, errors.positions)
            : positions.length
              ? "DEGRADED"
              : "UNAVAILABLE",
          orders: connected
            ? sectionFrom(!errors.orders, false, errors.orders)
            : orders.length
              ? "DEGRADED"
              : "UNAVAILABLE",
        },
        errors,
        degraded,
      });
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function boot() {
      try {
        await refreshLive();
        if (!cancelled && !autoConnectAttempted.current) {
          autoConnectAttempted.current = true;
          const current = await fetchJsonWithTimeout<BrokerStatus>("/status", undefined, CONNECT_TIMEOUT_MS);
          if (current.ok && current.data && (!current.data.connected || !current.data.nextOrderIdReady)) {
            await fetchJsonWithTimeout<BrokerStatus>("/connect", { method: "POST", body: "{}" }, CONNECT_TIMEOUT_MS);
            if (!cancelled) await refreshLive();
          }
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "No se pudo actualizar");
          setSnapshot((prev) => ({
            ...prev,
            degraded: true,
            sectionStates: {
              header: "DEGRADED",
              summary: "DEGRADED",
              positions: "DEGRADED",
              orders: "DEGRADED",
            },
          }));
        }
      }

      function arm() {
        if (timer) clearInterval(timer);
        const connected = Boolean(snapshotRef.current.status?.connected);
        const interval = connected ? POLL_CONNECTED_MS : POLL_DISCONNECTED_MS;
        timer = setInterval(() => {
          if (cancelled) return;
          if (document.visibilityState === "hidden") return;
          void refreshLive().catch((err) => {
            setMessage(err instanceof Error ? err.message : "Error de actualización");
          });
        }, interval);
      }

      if (!cancelled) arm();
    }

    void boot();

    function onVisibility() {
      if (document.visibilityState === "visible") void refreshLive();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshLive]);

  const connect = useCallback(async () => {
    setBusy(true);
    try {
      const result = await fetchJsonWithTimeout<BrokerStatus>(
        "/connect",
        { method: "POST", body: "{}" },
        CONNECT_TIMEOUT_MS,
      );
      if (!result.ok) throw new Error(result.error ?? "No se pudo conectar");
      await refreshLive();
      setMessage("Conexión con IB Gateway establecida.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo conectar");
    } finally {
      setBusy(false);
    }
  }, [refreshLive]);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      await refreshLive();
      setMessage("Cuenta, posiciones y órdenes actualizadas.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo leer la cartera");
    } finally {
      setBusy(false);
    }
  }, [refreshLive]);

  const value = useMemo<TerminalApi>(
    () => ({
      snapshot,
      busy,
      message,
      connect,
      refresh,
      clearMessage: () => setMessage(""),
    }),
    [snapshot, busy, message, connect, refresh],
  );

  return <BrokerTerminalContext.Provider value={value}>{children}</BrokerTerminalContext.Provider>;
}

export function useBrokerTerminal(): TerminalApi {
  const ctx = useContext(BrokerTerminalContext);
  if (!ctx) throw new Error("useBrokerTerminal must be used within BrokerTerminalProvider");
  return ctx;
}
