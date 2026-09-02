"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import styles from "@/styles/investment/workspace.module.css";

type ScannerRow = {
  id: string;
  symbol: string;
  status: "accepted" | "discarded";
  score: number;
  risk: string;
  committeeAction: string;
  committeeConsensus: string;
  confidence: number;
  explanation: string;
  discardReason?: string;
  expectedPortfolioImpact: string;
  timeHorizon: string;
  agentCount: number;
  enabledStrategyHits: number;
};

type ScannerPayload = {
  accepted?: ScannerRow[];
  discarded?: ScannerRow[];
  agentsRegistered?: number;
  runtime?: { status?: string; cyclesCompleted?: number; lastCycleAt?: string | null };
  mode?: string;
  autonomousLive?: string;
  goLive?: string;
  note?: string;
  error?: string;
};

export function MarketScannerDashboard() {
  const [data, setData] = useState<ScannerPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback((cycle = false) => {
    startTransition(async () => {
      const url = cycle
        ? "/api/investment/market-scanner?cycle=1"
        : "/api/investment/market-scanner";
      const res = await safeJsonFetch<ScannerPayload>(url);
      if (!res.ok) {
        setError(res.error ?? "Scanner fetch failed");
        return;
      }
      setError(null);
      setData(res.data ?? null);
    });
  }, []);

  useEffect(() => {
    refresh(true);
    const id = setInterval(() => refresh(false), 12_000);
    return () => clearInterval(id);
  }, [refresh]);

  async function control(action: "start" | "stop" | "cycle") {
    await safeJsonFetch("/api/investment/continuous-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    refresh(action === "cycle");
  }

  const accepted = data?.accepted ?? [];
  const discarded = data?.discarded ?? [];

  return (
    <div style={{ marginTop: 12 }}>
      <div className={styles.filterBar}>
        <button type="button" className={styles.filterBtn} disabled={pending} onClick={() => control("start")}>
          Start loop
        </button>
        <button type="button" className={styles.filterBtn} disabled={pending} onClick={() => control("stop")}>
          Stop
        </button>
        <button type="button" className={styles.filterBtn} disabled={pending} onClick={() => control("cycle")}>
          Run cycle
        </button>
        <span className={styles.hubNote}>
          Runtime: {data?.runtime?.status ?? "…"} · cycles {data?.runtime?.cyclesCompleted ?? 0} ·
          agents {data?.agentsRegistered ?? "…"} · {data?.mode ?? "ANALYSIS_ONLY"} · live{" "}
          {data?.goLive ?? "NOT_READY_FOR_LIVE"}
        </span>
      </div>
      {error ? <p className={styles.monitorError}>{error}</p> : null}
      {data?.note ? <p className={styles.hubNote}>{data.note}</p> : null}

      <div className={styles.grid} style={{ marginTop: 10 }}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Best opportunities</h2>
            <span className={styles.monitorOk}>{accepted.length}</span>
          </div>
          <ul className={styles.panelList}>
            {accepted.length === 0 ? <li>NO_DATA — run a cycle</li> : null}
            {accepted.map((row) => (
              <li key={row.id}>
                <strong>{row.symbol}</strong> · {row.committeeAction} · conf{" "}
                {row.confidence.toFixed(2)} · score {row.score.toFixed(2)} · strategies{" "}
                {row.enabledStrategyHits} · agents {row.agentCount}
                <br />
                {row.explanation}
                <br />
                Impact: {row.expectedPortfolioImpact}
              </li>
            ))}
          </ul>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Discarded</h2>
            <span className={styles.monitorWarn}>{discarded.length}</span>
          </div>
          <ul className={styles.panelList}>
            {discarded.length === 0 ? <li>NO_DATA</li> : null}
            {discarded.map((row) => (
              <li key={row.id}>
                <strong>{row.symbol}</strong> · {row.committeeConsensus}/{row.committeeAction} ·{" "}
                {row.discardReason ?? "discarded"} · conf {row.confidence.toFixed(2)}
                <br />
                Risk: {row.risk}
              </li>
            ))}
          </ul>
        </article>
      </div>
    </div>
  );
}
