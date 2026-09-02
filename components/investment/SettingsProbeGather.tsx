"use client";

import { useState } from "react";
import styles from "@/styles/investment/workspace.module.css";

type ProbeResult = {
  readonly generatedAt?: string;
  readonly mode?: string;
  readonly orderExecution?: string;
  readonly providersConfigured?: number;
  readonly providersUsed?: readonly string[];
  readonly counts?: {
    readonly marketSnapshots: number;
    readonly news: number;
    readonly economic: number;
    readonly sentiment: number;
  };
  readonly empty?: boolean;
  readonly note?: string;
  readonly error?: string;
};

/**
 * Settings control — ANALYSIS_ONLY MI gather probe. Never displays secrets.
 */
export function SettingsProbeGather() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ProbeResult | null>(null);

  async function runProbe() {
    setBusy(true);
    try {
      const res = await fetch("/api/investment/probe-gather?symbols=AAPL,MSFT,SPY", {
        cache: "no-store",
      });
      const body = (await res.json()) as ProbeResult;
      setResult(body);
    } catch (err) {
      setResult({
        mode: "ANALYSIS_ONLY",
        orderExecution: "disabled",
        error: err instanceof Error ? err.message : "probe failed",
        note: "NO_DATA — probe request failed",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={styles.panel} aria-label="Probe gather">
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Probe gather</h2>
        <span className={styles.monitorWarn}>ANALYSIS_ONLY</span>
      </div>
      <p className={styles.hubNote}>
        Runs Market Intelligence gather and returns counts only. Never exposes API keys. Zero
        orders.
      </p>
      <button
        type="button"
        className={styles.filterBtn}
        onClick={() => void runProbe()}
        disabled={busy}
      >
        {busy ? "Probing…" : "Run probe gather"}
      </button>
      {result ? (
        <ul className={styles.panelList} style={{ marginTop: 12 }}>
          <li>mode={result.mode ?? "NO_DATA"} · orders={result.orderExecution ?? "disabled"}</li>
          <li>
            providersConfigured={result.providersConfigured ?? 0}
            {result.empty ? " · empty" : ""}
          </li>
          <li>
            used=
            {result.providersUsed && result.providersUsed.length
              ? result.providersUsed.join(", ")
              : "none"}
          </li>
          <li>
            market={result.counts?.marketSnapshots ?? 0} · news={result.counts?.news ?? 0} ·
            economic={result.counts?.economic ?? 0} · sentiment={result.counts?.sentiment ?? 0}
          </li>
          {result.note ? <li>{result.note}</li> : null}
          {result.error ? <li>error: {result.error}</li> : null}
        </ul>
      ) : null}
    </article>
  );
}
