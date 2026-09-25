"use client";

import { useEffect, useRef, useState } from "react";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import type { RiskCenterSnapshot, RiskMetricReading } from "@/lib/investment/risk-center.types";
import styles from "@/styles/investment/risk-center.module.css";

const POLL_MS = 10_000;

function lightClass(light: RiskMetricReading["light"]): string {
  switch (light) {
    case "GREEN":
      return styles.lightGreen;
    case "AMBER":
      return styles.lightAmber;
    case "RED":
      return styles.lightRed;
    default:
      return styles.lightNoData;
  }
}

/**
 * Real-time max drawdown panel — polls Risk Center API ~10s.
 * Shows NO_DATA when NAV/equity series (or monitor) does not provide drawdown.
 */
export function MaxDrawdownRealtime({
  initial,
}: {
  readonly initial: RiskMetricReading | null;
}) {
  const [metric, setMetric] = useState<RiskMetricReading | null>(initial);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function refresh() {
      if (inFlight.current) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      inFlight.current = true;
      try {
        const result = await safeJsonFetch<RiskCenterSnapshot>("/api/investment/risk", {
          cache: "no-store",
        });
        if (cancelled) return;
        if (!result.ok || !result.data) {
          setError(result.error ?? "Risk refresh failed");
          return;
        }
        const dd =
          result.data.metrics?.find((m) => m.key === "drawdown") ??
          null;
        setMetric(dd);
        setAsOf(result.data.analyticsAsOf ?? result.data.generatedAt ?? null);
        setError("");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Risk refresh failed");
        }
      } finally {
        inFlight.current = false;
      }
    }

    void refresh();
    timer = setInterval(() => {
      if (cancelled) return;
      void refresh();
    }, POLL_MS);

    function onVisibility() {
      if (document.visibilityState === "visible") void refresh();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const status = metric?.status ?? "NO_DATA";
  const display =
    !metric || status === "NO_DATA" || metric.value == null
      ? "NO_DATA"
      : metric.display;
  const light = metric?.light ?? "NO_DATA";

  return (
    <article className={styles.maxDdPanel} aria-label="Max drawdown realtime">
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Max drawdown · realtime</h2>
        <span className={`${styles.light} ${lightClass(light)}`}>
          <span className={styles.lightDot} aria-hidden />
          {light}
        </span>
      </div>
      <p className={styles.maxDdValue}>{display}</p>
      <p className={styles.metricMeta}>
        {metric
          ? `${metric.status} · ${metric.source}${metric.note ? ` — ${metric.note}` : ""}`
          : "NO_DATA — no NAV/equity series for drawdown"}
        {asOf ? ` · asOf ${new Date(asOf).toLocaleTimeString()}` : ""}
        {" · poll ~10s · ANALYSIS_ONLY"}
      </p>
      {error ? <p className={styles.metricMeta}>{error}</p> : null}
    </article>
  );
}
