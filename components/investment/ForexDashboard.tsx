"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "@/styles/investment/workspace.module.css";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import type {
  ForexCandleView,
  ForexDashboardSnapshotView,
  ForexQuoteRow,
  ForexTimeframeId,
} from "@/lib/investment/forex/types";

const TIMEFRAMES: ForexTimeframeId[] = ["1m", "5m", "15m", "1h", "4h", "1d"];

type QuotesApi = {
  quotes?: ForexQuoteRow[];
  generatedAt?: string;
  fromCache?: boolean;
  session?: ForexDashboardSnapshotView["session"];
};

type HistoryApi = {
  pairId?: string;
  timeframe?: ForexTimeframeId;
  source?: string;
  bars?: ForexCandleView[];
  note?: string;
};

function fmt(n: number | null | undefined, digits = 5): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

function sideClass(side: string): string {
  if (side === "BUY") return styles.oppSideBuy;
  if (side === "SELL") return styles.oppSideSell;
  return styles.oppSideHold;
}

/** Compact sparkline from closes (last N). */
function MiniChart({ bars }: { bars: ForexCandleView[] }) {
  const slice = bars.slice(-40);
  if (slice.length < 2) {
    return <span className={styles.overviewHint}>sin velas</span>;
  }
  const closes = slice.map((b) => b.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;
  const w = 120;
  const h = 36;
  const pts = closes
    .map((c, i) => {
      const x = (i / (closes.length - 1)) * w;
      const y = h - ((c - min) / span) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const up = closes[closes.length - 1]! >= closes[0]!;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline
        fill="none"
        stroke={up ? "#22c55e" : "#ef4444"}
        strokeWidth="1.5"
        points={pts}
      />
    </svg>
  );
}

/**
 * FOREX terminal — live bid/ask (1s), multi-TF OHLCV, analysis snapshot.
 */
export function ForexDashboard() {
  const [snap, setSnap] = useState<ForexDashboardSnapshotView | null>(null);
  const [quotes, setQuotes] = useState<ForexQuoteRow[]>([]);
  const [quotesAt, setQuotesAt] = useState<string | null>(null);
  const [tf, setTf] = useState<ForexTimeframeId>("5m");
  const [selectedPair, setSelectedPair] = useState("EURUSD");
  const [candles, setCandles] = useState<ForexCandleView[]>([]);
  const [candleMeta, setCandleMeta] = useState("");
  const [error, setError] = useState("");
  const [cycling, setCycling] = useState(false);

  const refreshSnapshot = useCallback(async () => {
    const res = await safeJsonFetch<ForexDashboardSnapshotView>("/api/investment/forex", {
      cache: "no-store",
    });
    if (!res.ok || !res.data) {
      setError(res.error ?? "FOREX snapshot unavailable");
      return;
    }
    setSnap(res.data);
    if (res.data.quotes?.length) setQuotes(res.data.quotes);
    setError(res.data.errors?.join(" · ") ?? "");
  }, []);

  const refreshQuotes = useCallback(async () => {
    const res = await safeJsonFetch<QuotesApi>("/api/investment/forex/quotes", {
      cache: "no-store",
    });
    if (!res.ok || !res.data?.quotes) return;
    setQuotes(res.data.quotes);
    setQuotesAt(res.data.generatedAt ?? new Date().toISOString());
  }, []);

  const refreshHistory = useCallback(async () => {
    const res = await safeJsonFetch<HistoryApi>(
      `/api/investment/forex/history?pair=${encodeURIComponent(selectedPair)}&tf=${tf}`,
      { cache: "no-store" },
    );
    if (!res.ok || !res.data) {
      setCandles([]);
      setCandleMeta(res.error ?? "history failed");
      return;
    }
    setCandles(res.data.bars ?? []);
    setCandleMeta(
      `${res.data.source ?? "?"} · ${res.data.bars?.length ?? 0} velas · ${res.data.note ?? ""}`,
    );
  }, [selectedPair, tf]);

  useEffect(() => {
    void refreshSnapshot();
    void refreshQuotes();
    const heavy = setInterval(() => void refreshSnapshot(), 60_000);
    const live = setInterval(() => {
      if (document.hidden) return;
      void refreshQuotes();
    }, 1_000);
    return () => {
      clearInterval(heavy);
      clearInterval(live);
    };
  }, [refreshSnapshot, refreshQuotes]);

  useEffect(() => {
    void refreshHistory();
    const t = setInterval(() => {
      if (document.hidden) return;
      void refreshHistory();
    }, tf === "1m" || tf === "5m" ? 15_000 : 60_000);
    return () => clearInterval(t);
  }, [refreshHistory, tf]);

  async function runCycle() {
    setCycling(true);
    try {
      await safeJsonFetch("/api/investment/forex?action=cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      await refreshSnapshot();
    } finally {
      setCycling(false);
    }
  }

  const quoteById = useMemo(() => {
    const m = new Map<string, ForexQuoteRow>();
    for (const q of quotes) m.set(q.pairId, q);
    return m;
  }, [quotes]);

  const session = snap?.session;
  const macro = snap?.macro;
  const selectedQuote = quoteById.get(selectedPair);
  const selectedDigits = selectedPair.includes("JPY") ? 3 : 5;

  return (
    <section className={styles.assetModule} aria-label="FOREX dashboard">
      <header className={styles.assetModuleHead}>
        <div>
          <p className={styles.productKicker}>IBKR IDEALPRO · CASH · live quotes 1s</p>
          <h1 className={styles.assetModuleTitle}>💱 FOREX</h1>
          <p className={styles.hubNote}>
            {session?.label ?? "Cargando sesión…"} · modo {snap?.mode ?? "…"} · enabled=
            {String(snap?.forexEnabled ?? false)}
            {quotesAt ? ` · ticks ${new Date(quotesAt).toLocaleTimeString()}` : ""}
          </p>
        </div>
        <div className={styles.assetModulePnl}>
          <button type="button" className={styles.oppBtnAnalysis} onClick={() => void refreshQuotes()}>
            Refresh ticks
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

      <div
        className={styles.overviewSideMetrics}
        style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", display: "grid", gap: 10 }}
      >
        <div className={styles.overviewMetricCard}>
          <p className={styles.overviewLabel}>Sesión</p>
          <p className={styles.overviewCountdown}>{session?.primarySession ?? "—"}</p>
          <p className={styles.overviewHint}>
            {session?.sessionsOpen?.join(" · ") || "cerrada"}
            {session?.highLiquidity ? " · alta liquidez" : ""}
          </p>
        </div>
        <div className={styles.overviewMetricCard}>
          <p className={styles.overviewLabel}>{selectedPair}</p>
          <p className={styles.overviewVsSpy}>
            {fmt(selectedQuote?.mid, selectedDigits)} · spr{" "}
            {selectedQuote?.spreadPips != null ? `${selectedQuote.spreadPips.toFixed(1)}p` : "—"}
          </p>
          <p className={styles.overviewHint}>
            {selectedQuote?.source ?? "NO_DATA"} · bid {fmt(selectedQuote?.bid, selectedDigits)} / ask{" "}
            {fmt(selectedQuote?.ask, selectedDigits)}
          </p>
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

      <div className={styles.assetModulePnl} style={{ marginTop: 12, gap: 8, flexWrap: "wrap" }}>
        <label className={styles.hubNote}>
          Par{" "}
          <select
            value={selectedPair}
            onChange={(e) => setSelectedPair(e.target.value)}
            aria-label="Par FOREX"
          >
            {(snap?.analyses?.map((a) => a.pairId) ?? ["EURUSD", "GBPUSD", "USDJPY"]).map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        <div role="group" aria-label="Timeframe">
          {TIMEFRAMES.map((id) => (
            <button
              key={id}
              type="button"
              className={tf === id ? styles.oppBtnExecute : styles.oppBtnAnalysis}
              onClick={() => setTf(id)}
              style={{ marginRight: 4 }}
            >
              {id}
            </button>
          ))}
        </div>
        <MiniChart bars={candles} />
        <span className={styles.overviewHint}>{candleMeta || "Cargando velas…"}</span>
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
              <th>Chart</th>
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
              const live = quoteById.get(row.pairId) ?? row.quote;
              const digits = row.pairId.includes("JPY") ? 3 : 5;
              return (
                <tr
                  key={row.pairId}
                  onClick={() => setSelectedPair(row.pairId)}
                  style={{
                    cursor: "pointer",
                    outline: selectedPair === row.pairId ? "1px solid #0ea5e9" : undefined,
                  }}
                >
                  <td>
                    <strong>{row.display}</strong>
                  </td>
                  <td data-numeric="true">{fmt(live.bid, digits)}</td>
                  <td data-numeric="true">{fmt(live.ask, digits)}</td>
                  <td data-numeric="true">
                    {live.spreadPips != null ? `${live.spreadPips.toFixed(1)}p` : "—"}
                  </td>
                  <td>{live.source}</td>
                  <td>
                    {selectedPair === row.pairId ? <MiniChart bars={candles} /> : "·"}
                  </td>
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
