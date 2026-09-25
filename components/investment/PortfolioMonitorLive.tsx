"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/styles/investment/workspace.module.css";
import {
  buildPortfolioMonitorDashboardModel,
  type PortfolioMonitorSnapshot,
} from "@/src/core/investment/portfolio-monitor/client";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import { useInvestmentDashboardData } from "./dashboard-data-coordinator";

type MonitorApiResponse = PortfolioMonitorSnapshot & {
  note?: string;
  error?: string;
};

/** Secondary panel — max 10s, pauses when hidden or IBKR disconnected. */
const POLL_MS = 10_000;

export function PortfolioMonitorLive() {
  const { snapshot: dashboard } = useInvestmentDashboardData();
  const brokerConnected = Boolean(dashboard?.brokerStatus?.data?.connected);
  const [payload, setPayload] = useState<MonitorApiResponse | null>(null);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function refresh() {
      if (inFlight.current) return;
      if (document.visibilityState === "hidden") return;
      inFlight.current = true;
      try {
        const result = await safeJsonFetch<MonitorApiResponse>("/api/investment/monitor", {
          cache: "no-store",
        });
        if (!cancelled) {
          if (!result.ok || !result.data) {
            setError(result.error ?? "Refresh failed");
            return;
          }
          setPayload(result.data);
          setError(result.data.error ?? "");
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Refresh failed");
        }
      } finally {
        inFlight.current = false;
      }
    }

    void refresh();

    // Pause aggressive polling when IBKR disconnected — still allow occasional refresh.
    const interval = brokerConnected ? POLL_MS : 60_000;
    timer = setInterval(() => {
      if (cancelled) return;
      if (document.visibilityState === "hidden") return;
      void refresh();
    }, interval);

    function onVisibility() {
      if (document.visibilityState === "visible") void refresh();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [brokerConnected]);

  const model = payload ? buildPortfolioMonitorDashboardModel(payload) : null;

  return (
    <section className={styles.monitorSection} aria-label="Portfolio monitor live" data-panel-id="portfolio-monitor">
      <header className={styles.monitorHeader}>
        <div>
          <h2 className={styles.panelTitle}>Continuous Portfolio Monitor</h2>
          <p className={styles.monitorSubtitle}>
            Live read-model polling · ANALYSIS_ONLY · no orders
          </p>
        </div>
        <div className={styles.monitorMeta}>
          <span className={styles.readOnlyTag}>ANALYSIS_ONLY</span>
          <span className={model?.monitorRunning ? styles.monitorOk : styles.monitorWarn}>
            {model?.monitorRunning ? "RUNNING" : payload ? "IDLE" : "LOADING"}
          </span>
          <span className={styles.monitorMetaText}>
            evals {model?.evaluationCount ?? 0}
            {model?.lastEvaluatedAt
              ? ` · ${new Date(model.lastEvaluatedAt).toLocaleTimeString()}`
              : ""}
          </span>
        </div>
      </header>

      {error ? <p className={styles.monitorError}>{error}</p> : null}

      <ul className={styles.monitorSummary}>
        {(model?.observationSummary ?? ["Waiting for first evaluation…"]).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <div className={styles.alertGrid}>
        {(model?.panels ?? []).map((panel) => (
          <article key={panel.category} className={styles.panel} data-panel-id={panel.category}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>{panel.title}</h3>
              <span className={styles.monitorMetaText}>{panel.alerts.length}</span>
            </div>
            <ul className={styles.panelList}>
              {panel.alerts.length === 0 ? (
                <li>NO_ALERTS</li>
              ) : (
                panel.alerts.slice(0, 6).map((alert) => (
                  <li key={alert.id} data-severity={alert.severity}>
                    [{alert.severity}] {alert.title}: {alert.message}
                  </li>
                ))
              )}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
