"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import styles from "@/styles/investment/workspace.module.css";

export type StrategyCenterClientRow = {
  strategyId: string;
  name: string;
  version: string;
  enabled: boolean;
  regimes: string;
  description: string;
  compatibleMarkets: string;
  compatibleAssets?: string;
  timeHorizon: string;
  historicalPerformanceLevel: string;
  currentConfidence: number | null;
  status: "ENABLED" | "DISABLED";
  idealConditions: string;
  unfavorableConditions: string;
};

type ToggleResponse = {
  ok?: boolean;
  error?: string;
  snapshot?: { strategies: StrategyCenterClientRow[]; enabledCount: number; count: number };
};

export function StrategyCenterDashboard({
  initialRows,
  enabledCount,
  count,
}: {
  initialRows: readonly StrategyCenterClientRow[];
  enabledCount: number;
  count: number;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [enabled, setEnabled] = useState(enabledCount);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(strategyId: string, next: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await safeJsonFetch<ToggleResponse>("/api/investment/strategy-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategyId, enabled: next }),
      });
      if (!res.ok || res.data?.ok === false) {
        setError(res.data?.error ?? res.error ?? "Toggle failed");
        return;
      }
      if (res.data?.snapshot?.strategies) {
        setRows(res.data.snapshot.strategies);
        setEnabled(res.data.snapshot.enabledCount);
      } else {
        setRows((prev) =>
          prev.map((r) =>
            r.strategyId === strategyId
              ? { ...r, enabled: next, status: next ? "ENABLED" : "DISABLED" }
              : r,
          ),
        );
        setEnabled((n) => n + (next ? 1 : -1));
      }
      router.refresh();
    });
  }

  return (
    <div style={{ marginTop: 12 }}>
      <p className={styles.hubNote}>
        {enabled}/{count} strategies enabled · ANALYSIS_ONLY · toggles do not unlock live
        {pending ? " · updating…" : ""}
      </p>
      {error ? <p className={styles.monitorError}>{error}</p> : null}
      <div className={styles.grid} style={{ marginTop: 8 }}>
        {rows.map((row) => (
          <article key={row.strategyId} className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>{row.name}</h2>
              <span className={row.enabled ? styles.monitorOk : styles.monitorWarn}>
                {row.status}
              </span>
            </div>
            <ul className={styles.panelList}>
              <li>Nombre: {row.name}</li>
              <li>Descripción: {row.description || "NO_DATA"}</li>
              <li>Mercados: {row.compatibleMarkets || "NO_DATA"}</li>
              <li>Productos: {row.compatibleAssets || "NO_DATA"}</li>
              <li>Versión: {row.version || "NO_DATA"}</li>
              <li>Estado: {row.status}</li>
              <li>ID: {row.strategyId}</li>
              <li>Horizon: {row.timeHorizon}</li>
              <li>Regimes: {row.regimes}</li>
              <li>Perf level: {row.historicalPerformanceLevel}</li>
              <li>
                Confidence:{" "}
                {row.currentConfidence == null ? "NO_DATA" : row.currentConfidence.toFixed(2)}
              </li>
              <li>Ideal: {row.idealConditions}</li>
              <li>Unfavorable: {row.unfavorableConditions}</li>
            </ul>
            <div className={styles.filterBar} style={{ marginTop: 8 }}>
              <button
                type="button"
                className={styles.filterBtn}
                disabled={pending}
                onClick={() => toggle(row.strategyId, !row.enabled)}
              >
                {row.enabled ? "Disable" : "Enable"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
