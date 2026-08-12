"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DASHBOARD_POLL_MS,
  type InvestmentDashboardSnapshot,
} from "@/lib/investment/dashboard-snapshot.types";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";

type CoordinatorState = {
  snapshot: InvestmentDashboardSnapshot | null;
  error: string;
  refreshing: boolean;
  lastFetchedAt: string | null;
  retry: () => void;
};

const DashboardDataContext = createContext<CoordinatorState | null>(null);

/**
 * Single client data coordinator for /investment widgets.
 * - One poll interval (no per-widget stampede)
 * - Stops when tab hidden
 * - Slows when IBKR disconnected
 * - Manual retry available
 * - Never calls IBKR connect / never places orders
 */
export function InvestmentDashboardDataProvider({
  children,
  initialSnapshot = null,
}: {
  children: ReactNode;
  initialSnapshot?: InvestmentDashboardSnapshot | null;
}) {
  const [snapshot, setSnapshot] = useState<InvestmentDashboardSnapshot | null>(initialSnapshot);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(
    initialSnapshot?.generatedAt ?? null,
  );
  const inFlight = useRef(false);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const fetchSnapshot = useCallback(async (force = false) => {
    if (inFlight.current) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      const url = force ? "/api/investment/dashboard?force=1" : "/api/investment/dashboard";
      const result = await safeJsonFetch<InvestmentDashboardSnapshot & { error?: string }>(url, {
        cache: "no-store",
      });
      if (!result.ok || !result.data) {
        setError(result.error ?? "Dashboard refresh failed");
        return;
      }
      setSnapshot(result.data);
      setLastFetchedAt(new Date().toISOString());
      setError(result.data.error ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dashboard refresh failed");
    } finally {
      inFlight.current = false;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    function currentInterval(): number {
      const connected = Boolean(snapshotRef.current?.brokerStatus?.data?.connected);
      return connected ? DASHBOARD_POLL_MS.dashboard : Math.max(DASHBOARD_POLL_MS.dashboard, 30_000);
    }

    function arm() {
      if (timer) clearInterval(timer);
      timer = setInterval(() => {
        if (cancelled) return;
        if (document.visibilityState === "hidden") return;
        void fetchSnapshot(false);
      }, currentInterval());
    }

    void fetchSnapshot(false).then(() => {
      if (!cancelled) arm();
    });

    function onVisibility() {
      if (document.visibilityState === "visible") {
        void fetchSnapshot(false);
        arm();
      } else if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchSnapshot]);

  const value: CoordinatorState = {
    snapshot,
    error,
    refreshing,
    lastFetchedAt,
    retry: () => {
      void fetchSnapshot(true);
    },
  };

  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}

export function useInvestmentDashboardData(): CoordinatorState {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) {
    throw new Error("useInvestmentDashboardData requires InvestmentDashboardDataProvider");
  }
  return ctx;
}
