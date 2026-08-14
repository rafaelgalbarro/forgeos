"use client";

import { useEffect, useState } from "react";
import styles from "@/styles/investment/workspace.module.css";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import type { ForexDashboardSnapshotView } from "@/lib/investment/forex/types";

function fmt(n: number | null | undefined, digits = 5): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

function sideClass(side: string): string {
  if (side === "BUY") return styles.oppSideBuy;
  if (side === "SELL") return styles.oppSideSell;
  return styles.oppSideHold;
}

/**
 * Full FOREX terminal dashboard — quotes, sessions, indicators, signals, macro.
 */
export function ForexDashboard() {
  const [snap, setSnap] = useState<ForexDashboardSnapshotView | null>(null);
  const [error, setError] = useState("");
  const [cycling, setCycling] = useState(false);

  async function refresh() {
    const res = await safeJsonFetch<ForexDashboardSnapshotView>("/api/investment/forex", {
      cache: "no-store",
    });
    if (!res.ok || !res.data) {
      setError(res.error ?? "FOREX snapshot unavailable");
      return;
    }
    setSnap(res.data);
    setError(res.data.errors?.join(" · ") ?? "");
  }

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(t);
  }, []);

  async function runCycle() {
    setCycling(true);
    try {
      await safeJsonFetch("/api/investment/forex?action=cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      await refresh();
    } finally {
      setCycling(false);
    }
  }

  const session = snap?.session;
  const macro = snap?.macro;

  return (
    <section className={styles.assetModule} aria-label="FOREX dashboard">
      <header className={styles.assetModuleHead}>
        <div>
          <p className={styles.productKicker}>IBKR IDEALPRO · CASH</p>
          <h1 className={styles.assetModuleTitle}>💱 FOREX</h1>
          <p className={styles.hubNote}>
            {session?.label ?? "Cargando sesión…"} · modo {snap?.mode ?? "…"} · enabled=
            {String(snap?.forexEnabled ?? false)}
          </p>
        </div>
        <div className={styles.assetModulePnl}>
          <button type="button" className={styles.oppBtnAnalysis} onClick={() => void refresh()}>
            Refresh
          </button>
          <button
            type="button"
            className={styles.oppBtnExecute}
            disabled={cycling}
            onClick={() => void runCycle()}
            title="Ciclo análisis + stage LMT (transmit=false)"
          >
            {cycling ? "Ciclo…" : "⚡ Ciclo ahora"}
          </button>
        </div>
      </header>

      <div className={styles.overviewSideMetrics} style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", display: "grid", gap: 10 }}>
        <div className={styles.overviewMetricCard}>
          <p className={styles.overviewLabel}>Sesión</p>
          <p className={styles.overviewCountdown}>{session?.primarySession ?? "—"}</p>
          <p className={styles.overviewHint}>
            {session?.sessionsOpen?.join(" · ") || "cerrada"}
            {session?.highLiquidity ? " · alta liquidez" : ""}
          </p>
        </div>
        <div className={styles.overviewMetricCard}>
          <p className={styles.overviewLabel}>P&amp;L FOREX</p>
          <p className={styles.overviewVsSpy}>{snap?.pnl.pips != null ? `${snap.pnl.pips} pips` : "NO_DATA"}</p>
          <p className={styles.overviewHint}>{snap?.pnl.note}</p>
        </div>
        <div className={styles.overviewMetricCard}>
          <p className={styles.overviewLabel}>Macro</p>
          <p className={styles.overviewVsSpy}>{macro?.blackoutActive ? "BLACKOUT" : "OK"}</p>
          <p className={styles.overviewHint}>
            {macro?.nextHighImpactAt
              ? `Próx. HIGH en ${macro.minutesToNextHigh ?? "?"} min`
              : "Sin HIGH próximo"}
          </p>
        </div>
        <div className={styles.overviewMetricCard}>
          <p className={styles.overviewLabel}>Posiciones</p>
          <p className={styles.overviewCountdown}>{snap?.positions?.length ?? 0}</p>
          <p className={styles.overviewHint}>max {snap?.config.maxPositions ?? 3} pares</p>
        </div>
      </div>

      <div className={styles.oppTableWrap}>
        <table className={styles.oppTable}>
          <thead>
            <tr>
              <th>Par</th>
              <th>Bid</th>
              <th>Ask</th>
              <th>Spread</th>
              <th>Src</th>
              <th>RSI</th>
              <th>MACD</th>
              <th>ATR</th>
              <th>Señal</th>
              <th>Conf</th>
              <th>Entry</th>
              <th>SL</th>
              <th>TP</th>
            </tr>
          </thead>
          <tbody>
            {(snap?.analyses ?? []).map((row) => {
              const digits = row.pairId.includes("JPY") ? 3 : 5;
              return (
                <tr key={row.pairId}>
                  <td>
                    <strong>{row.display}</strong>
                  </td>
                  <td data-numeric="true">{fmt(row.quote.bid, digits)}</td>
                  <td data-numeric="true">{fmt(row.quote.ask, digits)}</td>
                  <td data-numeric="true">
                    {row.quote.spreadPips != null ? `${row.quote.spreadPips.toFixed(1)}p` : "—"}
                  </td>
                  <td>{row.quote.source}</td>
                  <td data-numeric="true">{fmt(row.indicators.rsi, 1)}</td>
                  <td data-numeric="true">{fmt(row.indicators.macdHist, 5)}</td>
                  <td data-numeric="true">{fmt(row.indicators.atr, digits)}</td>
                  <td className={sideClass(row.signal.side)}>{row.signal.side}</td>
                  <td data-numeric="true">{(row.signal.confidence * 100).toFixed(0)}%</td>
                  <td data-numeric="true">{fmt(row.levels?.entry, digits)}</td>
                  <td data-numeric="true">{fmt(row.levels?.stopLoss, digits)}</td>
                  <td data-numeric="true">{fmt(row.levels?.takeProfit, digits)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.assetUniverse}>
        <h2 className={styles.oppEnhancedTitle}>Calendario económico (hoy)</h2>
        {(macro?.events?.length ?? 0) === 0 ? (
          <p className={styles.oppEmpty}>NO_DATA — calendario vacío o proveedor offline</p>
        ) : (
          <ul className={styles.assetUniverseList}>
            {macro!.events.slice(0, 12).map((ev) => (
              <li key={`${ev.at}-${ev.title}`}>
                <strong>{ev.highImpact ? "HIGH" : "med"}</strong>
                <span>
                  {new Date(ev.at).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })} · {ev.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error ? <p className={styles.oppError}>{error}</p> : null}
    </section>
  );
}
