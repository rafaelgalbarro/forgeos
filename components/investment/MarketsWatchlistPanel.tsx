"use client";

import { useCallback, useEffect, useState } from "react";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import styles from "@/styles/investment/markets-regional.module.css";

type AlertRule = {
  id: string;
  type: string;
  ticker: string;
  label: string;
  enabled: boolean;
  triggerCount: number;
  params: Record<string, unknown>;
};

type WatchlistEntry = {
  ticker: string;
  addedAt: string;
  note?: string;
};

type AlertsPayload = {
  watchlist: WatchlistEntry[];
  alerts: AlertRule[];
  templates?: Array<{ type: string; label: string; defaults: Record<string, unknown> }>;
};

const ALERT_TYPES = [
  { id: "price", label: "Precio" },
  { id: "indicator", label: "Indicador RSI" },
  { id: "pattern", label: "Patrón" },
  { id: "volume", label: "Volumen" },
  { id: "score", label: "Score scanner" },
  { id: "insider", label: "Insider" },
  { id: "gap", label: "Gap premarket" },
] as const;

export function MarketsWatchlistPanel() {
  const [data, setData] = useState<AlertsPayload | null>(null);
  const [error, setError] = useState("");
  const [ticker, setTicker] = useState("NVDA");
  const [alertType, setAlertType] = useState<string>("price");
  const [threshold, setThreshold] = useState("120");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const res = await safeJsonFetch<AlertsPayload>("/api/investment/alerts", { cache: "no-store" });
    if (!res.ok || !res.data) {
      setError(res.error ?? "No se pudo cargar alertas");
      return;
    }
    setData(res.data);
    setError("");
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(t);
  }, [refresh]);

  async function addWatchlist() {
    if (!ticker.trim()) return;
    setBusy(true);
    await fetch("/api/investment/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_watchlist", ticker: ticker.trim().toUpperCase() }),
    });
    setBusy(false);
    void refresh();
  }

  async function createAlert() {
    const sym = ticker.trim().toUpperCase();
    if (!sym) return;
    setBusy(true);
    const params: Record<string, unknown> = {};
    let label = `${sym} alerta`;
    if (alertType === "price") {
      params.operator = "below";
      params.value = Number(threshold) || 120;
      label = `${sym} bajo $${params.value}`;
    } else if (alertType === "indicator") {
      params.indicator = "rsi";
      params.operator = "below";
      params.value = Number(threshold) || 30;
      label = `RSI ${sym} < ${params.value}`;
    } else if (alertType === "volume") {
      params.volumeMultiplier = Number(threshold) || 3;
      label = `Vol ${sym} >${params.volumeMultiplier}x`;
    } else if (alertType === "score") {
      params.minScore = Number(threshold) || 70;
      label = `Score ${sym} ≥ ${params.minScore}`;
    } else if (alertType === "gap") {
      params.minGapPct = Number(threshold) || 3;
      label = `Gap ${sym} >${params.minGapPct}%`;
    } else if (alertType === "pattern") {
      params.patternName = threshold || "Hammer";
      label = `${sym} patrón ${params.patternName}`;
    } else if (alertType === "insider") {
      params.minInsiderUsd = 1_000_000;
      label = `Insider buy ${sym}`;
    }

    await fetch("/api/investment/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_alert",
        type: alertType,
        ticker: sym,
        label,
        params,
      }),
    });
    setBusy(false);
    void refresh();
  }

  async function toggleAlert(id: string, enabled: boolean) {
    await fetch("/api/investment/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, enabled: !enabled }),
    });
    void refresh();
  }

  async function removeAlert(id: string) {
    await fetch(`/api/investment/alerts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    void refresh();
  }

  async function removeWatch(sym: string) {
    await fetch(`/api/investment/alerts?watchlist=1&ticker=${encodeURIComponent(sym)}`, {
      method: "DELETE",
    });
    void refresh();
  }

  return (
    <section className={styles.watchlistPanel} aria-label="Mi Watchlist">
      <header className={styles.watchlistHeader}>
        <h2 className={styles.watchlistTitle}>Mi Watchlist IA</h2>
        <p className={styles.watchlistSub}>
          Tickers monitorizados sin operar. Alertas → Telegram con botones ANALIZAR / OPERAR.
        </p>
      </header>

      {error ? <p className={styles.watchlistError}>{error}</p> : null}

      <div className={styles.watchlistForm}>
        <input
          className={styles.searchInput}
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="Ticker"
          aria-label="Ticker"
        />
        <button type="button" className={styles.refreshBtn} disabled={busy} onClick={() => void addWatchlist()}>
          + Watchlist
        </button>
      </div>

      <ul className={styles.watchlistList}>
        {(data?.watchlist ?? []).map((w) => (
          <li key={w.ticker} className={styles.watchlistItem}>
            <strong>{w.ticker}</strong>
            <span>{w.note ?? "Monitor IA"}</span>
            <button type="button" className={styles.watchlistRemove} onClick={() => void removeWatch(w.ticker)}>
              Quitar
            </button>
          </li>
        ))}
      </ul>

      <h3 className={styles.watchlistSectionTitle}>Crear alerta</h3>
      <div className={styles.watchlistForm}>
        <select
          className={styles.watchlistSelect}
          value={alertType}
          onChange={(e) => setAlertType(e.target.value)}
          aria-label="Tipo de alerta"
        >
          {ALERT_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          className={styles.searchInput}
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          placeholder="Umbral"
          aria-label="Umbral"
        />
        <button type="button" className={styles.refreshBtn} disabled={busy} onClick={() => void createAlert()}>
          Crear alerta
        </button>
      </div>

      <ul className={styles.alertList}>
        {(data?.alerts ?? []).map((a) => (
          <li key={a.id} className={styles.alertItem}>
            <div>
              <strong>{a.label}</strong>
              <span className={styles.alertMeta}>
                {a.type} · {a.ticker} · {a.triggerCount}×
              </span>
            </div>
            <div className={styles.alertActions}>
              <button type="button" className={styles.refreshBtn} onClick={() => void toggleAlert(a.id, a.enabled)}>
                {a.enabled ? "ON" : "OFF"}
              </button>
              <button type="button" className={styles.watchlistRemove} onClick={() => void removeAlert(a.id)}>
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
