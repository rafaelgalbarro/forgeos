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
};

type HistoryApi = {
  source?: string;
  bars?: ForexCandleView[];
  note?: string;
};

type SignalCard = {
  strategyId: string;
  code: string;
  name: string;
  style: "SCALPING" | "INTRADAY";
  pairId: string;
  display: string;
  side: "BUY" | "SELL";
  entry: number;
  stopLoss: number;
  takeProfit: number;
  stopPips: number;
  tpPips: number;
  confidence: number;
  confidenceAdjusted: number;
  reasons: string[];
  timeframe: string;
  estimatedMinutes: number;
  canExecute: boolean;
  blockReason?: string;
  backtest?: { badge: string; winRate: number; profitFactor: number; trades: number };
};

type SignalsApi = {
  signals?: SignalCard[];
  goals?: {
    scalp: { current: number; target: number; pct: number; trades: number; maxTrades: number };
    intraday: { current: number; target: number; pct: number; trades: number; maxTrades: number };
    stoppedOut: boolean;
    realizedPips: number;
    telegramConfirmRemaining: number;
  };
  macroBlackout?: boolean;
  generatedAt?: string;
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

function MiniChart({ bars }: { bars: ForexCandleView[] }) {
  const slice = bars.slice(-40);
  if (slice.length < 2) return <span className={styles.overviewHint}>sin velas</span>;
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
      <polyline fill="none" stroke={up ? "#22c55e" : "#ef4444"} strokeWidth="1.5" points={pts} />
    </svg>
  );
}

function ProgressBar({ pct, label }: { pct: number; label: string }) {
  return (
    <div>
      <p className={styles.overviewHint}>{label}</p>
      <div
        style={{
          height: 8,
          background: "rgba(148,163,184,0.25)",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.min(100, Math.max(0, pct))}%`,
            height: "100%",
            background: pct >= 100 ? "#22c55e" : "#0ea5e9",
          }}
        />
      </div>
    </div>
  );
}

export function ForexDashboard() {
  const [snap, setSnap] = useState<ForexDashboardSnapshotView | null>(null);
  const [quotes, setQuotes] = useState<ForexQuoteRow[]>([]);
  const [quotesAt, setQuotesAt] = useState<string | null>(null);
  const [tf, setTf] = useState<ForexTimeframeId>("5m");
  const [selectedPair, setSelectedPair] = useState("EURUSD");
  const [candles, setCandles] = useState<ForexCandleView[]>([]);
  const [candleMeta, setCandleMeta] = useState("");
  const [signals, setSignals] = useState<SignalCard[]>([]);
  const [goals, setGoals] = useState<SignalsApi["goals"]>();
  const [error, setError] = useState("");
  const [cycling, setCycling] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);

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
    const res = await safeJsonFetch<QuotesApi>("/api/investment/forex/quotes", { cache: "no-store" });
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
    setCandleMeta(`${res.data.source ?? "?"} · ${res.data.bars?.length ?? 0} velas · ${res.data.note ?? ""}`);
  }, [selectedPair, tf]);

  const refreshSignals = useCallback(async () => {
    const res = await safeJsonFetch<SignalsApi>("/api/investment/forex/signals", { cache: "no-store" });
    if (!res.ok || !res.data) return;
    setSignals(res.data.signals ?? []);
    setGoals(res.data.goals);
  }, []);

  useEffect(() => {
    void refreshSnapshot();
    void refreshQuotes();
    void refreshSignals();
    const heavy = setInterval(() => {
      void refreshSnapshot();
      void refreshSignals();
    }, 60_000);
    const live = setInterval(() => {
      if (document.hidden) return;
      void refreshQuotes();
    }, 1_000);
    return () => {
      clearInterval(heavy);
      clearInterval(live);
    };
  }, [refreshSnapshot, refreshQuotes, refreshSignals]);

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
      await refreshSignals();
    } finally {
      setCycling(false);
    }
  }

  async function executeSignal(sig: SignalCard, confirmed: boolean) {
    const key = `${sig.strategyId}:${sig.pairId}:${sig.side}`;
    setExecuting(key);
    try {
      const res = await safeJsonFetch<{
        ok?: boolean;
        needsTelegramConfirm?: boolean;
        error?: string;
        message?: string;
      }>("/api/investment/forex/signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signal: sig, confirmed, transmit: false }),
      });
      if (res.data?.needsTelegramConfirm && !confirmed) {
        const ok = window.confirm(
          `${res.data.message ?? "Confirmar ejecución FOREX"}\n\n${sig.side} ${sig.display} @ ${sig.entry}`,
        );
        if (ok) await executeSignal(sig, true);
        return;
      }
      if (!res.ok || res.data?.ok === false) {
        setError(res.data?.error ?? res.error ?? "Ejecución bloqueada");
      } else {
        await refreshSignals();
      }
    } finally {
      setExecuting(null);
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
          <p className={styles.productKicker}>IBKR IDEALPRO · estrategias A–F · live 1s</p>
          <h1 className={styles.assetModuleTitle}>💱 FOREX Pro</h1>
          <p className={styles.hubNote}>
            {session?.label ?? "Cargando…"} · {snap?.mode ?? "…"} · enabled=
            {String(snap?.forexEnabled ?? false)}
            {quotesAt ? ` · ticks ${new Date(quotesAt).toLocaleTimeString()}` : ""}
          </p>
        </div>
        <div className={styles.assetModulePnl}>
          <button type="button" className={styles.oppBtnAnalysis} onClick={() => void refreshSignals()}>
            Scan señales
          </button>
          <button
            type="button"
            className={styles.oppBtnExecute}
            disabled={cycling}
            onClick={() => void runCycle()}
          >
            {cycling ? "Ciclo…" : "⚡ Ciclo ahora"}
          </button>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div className={styles.overviewMetricCard}>
          <p className={styles.overviewLabel}>Objetivo scalping</p>
          <ProgressBar
            pct={goals?.scalp.pct ?? 0}
            label={`${goals?.scalp.current ?? 0}/${goals?.scalp.target ?? 20} pips · ops ${goals?.scalp.trades ?? 0}/${goals?.scalp.maxTrades ?? 10}`}
          />
        </div>
        <div className={styles.overviewMetricCard}>
          <p className={styles.overviewLabel}>Objetivo intradía</p>
          <ProgressBar
            pct={goals?.intraday.pct ?? 0}
            label={`${goals?.intraday.current ?? 0}/${goals?.intraday.target ?? 50} pips · ops ${goals?.intraday.trades ?? 0}/${goals?.intraday.maxTrades ?? 5}`}
          />
        </div>
        <div className={styles.overviewMetricCard}>
          <p className={styles.overviewLabel}>P&amp;L día</p>
          <p className={styles.overviewVsSpy}>
            {goals?.stoppedOut ? "STOP" : `${goals?.realizedPips ?? 0} pips`}
          </p>
          <p className={styles.overviewHint}>Stop diario −30p · max 3 pares</p>
        </div>
        <div className={styles.overviewMetricCard}>
          <p className={styles.overviewLabel}>{selectedPair}</p>
          <p className={styles.overviewVsSpy}>
            {fmt(selectedQuote?.mid, selectedDigits)} ·{" "}
            {selectedQuote?.spreadPips != null ? `${selectedQuote.spreadPips.toFixed(1)}p` : "—"}
          </p>
          <p className={styles.overviewHint}>{selectedQuote?.source ?? "NO_DATA"}</p>
        </div>
      </div>

      <div className={styles.assetModulePnl} style={{ marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
        <label className={styles.hubNote}>
          Par{" "}
          <select value={selectedPair} onChange={(e) => setSelectedPair(e.target.value)}>
            {(snap?.analyses?.map((a) => a.pairId) ?? ["EURUSD"]).map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
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
        <MiniChart bars={candles} />
        <span className={styles.overviewHint}>{candleMeta}</span>
      </div>

      <h2 className={styles.oppEnhancedTitle}>Señales en vivo</h2>
      <div className={styles.oppTableWrap}>
        <table className={styles.oppTable}>
          <thead>
            <tr>
              <th>Par</th>
              <th>Side</th>
              <th>Estrategia</th>
              <th>Entry</th>
              <th>SL</th>
              <th>TP</th>
              <th>Conf</th>
              <th>BT</th>
              <th>ETA</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {signals.length === 0 ? (
              <tr>
                <td colSpan={10}>
                  <span className={styles.oppEmpty}>Sin señales en ventana activa — análisis continuo</span>
                </td>
              </tr>
            ) : (
              signals.map((sig) => {
                const digits = sig.pairId.includes("JPY") ? 3 : 5;
                const key = `${sig.strategyId}:${sig.pairId}:${sig.side}`;
                return (
                  <tr key={key}>
                    <td>
                      <strong>{sig.display}</strong>
                    </td>
                    <td className={sideClass(sig.side)}>{sig.side}</td>
                    <td>
                      {sig.code} {sig.name}
                      <div className={styles.overviewHint}>{sig.style} · {sig.timeframe}</div>
                    </td>
                    <td data-numeric="true">{fmt(sig.entry, digits)}</td>
                    <td data-numeric="true">
                      {fmt(sig.stopLoss, digits)} ({sig.stopPips}p)
                    </td>
                    <td data-numeric="true">
                      {fmt(sig.takeProfit, digits)} ({sig.tpPips}p)
                    </td>
                    <td data-numeric="true">{(sig.confidenceAdjusted * 100).toFixed(0)}%</td>
                    <td>{sig.backtest?.badge ?? "—"}</td>
                    <td>~{sig.estimatedMinutes}m</td>
                    <td>
                      <button
                        type="button"
                        className={styles.oppBtnExecute}
                        disabled={!sig.canExecute || executing === key}
                        title={sig.blockReason ?? "Stage LMT"}
                        onClick={() => void executeSignal(sig, false)}
                      >
                        {executing === key ? "…" : "⚡ EJECUTAR"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.oppTableWrap} style={{ marginTop: 16 }}>
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
              <th>Señal</th>
              <th>Conf</th>
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
                  <td>{selectedPair === row.pairId ? <MiniChart bars={candles} /> : "·"}</td>
                  <td data-numeric="true">{fmt(row.indicators.rsi, 1)}</td>
                  <td className={sideClass(row.signal.side)}>{row.signal.side}</td>
                  <td data-numeric="true">{(row.signal.confidence * 100).toFixed(0)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.assetUniverse}>
        <h2 className={styles.oppEnhancedTitle}>Calendario económico</h2>
        {(macro?.events?.length ?? 0) === 0 ? (
          <p className={styles.oppEmpty}>NO_DATA</p>
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
