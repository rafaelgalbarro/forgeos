"use client";

import { useCallback, useEffect, useState } from "react";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import { LightweightCandleChart } from "./LightweightCandleChart";
import type { MarketTicker, TickerAnalysisPayload } from "./markets-regional.types";
import styles from "@/styles/investment/markets-regional.module.css";

type PanelState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: TickerAnalysisPayload }
  | { status: "error"; message: string };

function formatPrice(price: number): string {
  return price >= 100 ? price.toFixed(2) : price.toFixed(4);
}

function directionClass(direction: string): string {
  if (direction === "BUY") return styles.signalBuy;
  if (direction === "SELL") return styles.signalSell;
  return styles.signalHold;
}

function urgencyClass(urgency: string): string {
  if (urgency === "HIGH") return styles.urgencyHigh;
  if (urgency === "MEDIUM") return styles.urgencyMedium;
  return styles.urgencyLow;
}

function sentimentClass(s: string): string {
  if (s === "POSITIVE" || s === "BULLISH") return styles.sentimentPositive;
  if (s === "NEGATIVE" || s === "BEARISH") return styles.sentimentNegative;
  return styles.sentimentNeutral;
}

function signalLight(value: number | null, green: number, red: number): string {
  if (value == null) return styles.lightNeutral;
  if (value <= green) return styles.lightGreen;
  if (value >= red) return styles.lightRed;
  return styles.lightYellow;
}

export function MarketsAnalysisPanel({
  ticker,
  open,
  onClose,
}: {
  ticker: MarketTicker | null;
  open: boolean;
  onClose: () => void;
}) {
  const [state, setState] = useState<PanelState>({ status: "idle" });

  const loadAnalysis = useCallback(async (symbol: string) => {
    setState({ status: "loading" });
    const res = await safeJsonFetch<TickerAnalysisPayload>(
      `/api/trading/analyze?ticker=${encodeURIComponent(symbol)}`,
    );
    if (!res.ok || !res.data) {
      setState({
        status: "error",
        message: res.error ?? "No se pudo obtener el análisis",
      });
      return;
    }
    setState({ status: "ready", data: res.data });
  }, []);

  useEffect(() => {
    if (!open || !ticker) {
      setState({ status: "idle" });
      return;
    }
    void loadAnalysis(ticker.symbol);
  }, [open, ticker, loadAnalysis]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !ticker) return null;

  const signal = state.status === "ready" ? state.data.signal : null;
  const market = state.status === "ready" ? state.data.market : null;
  const analysis = state.status === "ready" ? state.data.analysis : null;

  return (
    <div className={styles.panelOverlay} role="presentation" onClick={onClose}>
      <aside
        className={styles.analysisPanel}
        role="dialog"
        aria-modal="true"
        aria-label={`Análisis de ${ticker.symbol}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.panelHeader}>
          <div>
            <p className={styles.panelKicker}>TradingAgent · Multi-fuente</p>
            <h2 className={styles.panelTitle}>{ticker.symbol}</h2>
            <p className={styles.panelSubtitle}>{ticker.name}</p>
          </div>
          <button type="button" className={styles.panelCloseBtn} onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        {state.status === "loading" ? (
          <div className={styles.panelLoading} aria-busy="true">
            <span className={styles.panelSpinner} aria-hidden="true" />
            <p>Analizando noticias, indicadores y patrones…</p>
          </div>
        ) : null}

        {state.status === "error" ? (
          <div className={styles.panelError} role="alert">
            <p>{state.message}</p>
            <button
              type="button"
              className={styles.refreshBtn}
              onClick={() => void loadAnalysis(ticker.symbol)}
            >
              Reintentar
            </button>
          </div>
        ) : null}

        {state.status === "ready" && signal && market ? (
          <div className={styles.panelBody}>
            {analysis ? (
              <section className={styles.panelSection}>
                <h3 className={styles.panelSectionTitle}>Velas · 30 días</h3>
                <LightweightCandleChart
                  bars={analysis.bars}
                  symbol={ticker.symbol}
                  height={220}
                  className={styles.lwChart}
                  emptyClassName={styles.chartEmpty}
                  signal={{
                    direction: signal.direction,
                    confidence: signal.confidence,
                  }}
                  lines={[
                    ...(analysis.technicals.trend.ema20 != null
                      ? [{ id: "EMA20", color: "#59c48e", value: analysis.technicals.trend.ema20 }]
                      : []),
                    ...(analysis.technicals.trend.ema50 != null
                      ? [{ id: "EMA50", color: "#f8b84e", value: analysis.technicals.trend.ema50 }]
                      : []),
                    ...(analysis.technicals.volatility.bollingerBands
                      ? [
                          {
                            id: "BB-U",
                            color: "#5a7088",
                            value: analysis.technicals.volatility.bollingerBands.upper,
                          },
                          {
                            id: "BB-M",
                            color: "#7a92a8",
                            value: analysis.technicals.volatility.bollingerBands.middle,
                          },
                          {
                            id: "BB-L",
                            color: "#5a7088",
                            value: analysis.technicals.volatility.bollingerBands.lower,
                          },
                        ]
                      : []),
                  ]}
                />
                <p className={styles.panelMeta}>
                  Interactive · Verde=EMA20 · Amarillo=EMA50 · Discontinuo=Bollinger · señal overlay
                </p>
              </section>
            ) : null}

            <section className={styles.panelSection}>
              <h3 className={styles.panelSectionTitle}>Señal IA</h3>
              <div className={styles.signalHero}>
                <span className={`${styles.signalBadge} ${directionClass(signal.direction)}`}>
                  {signal.direction}
                </span>
                <span className={styles.signalConfidence}>
                  Confianza {(signal.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <p className={styles.signalReasoning}>{signal.reasoning}</p>
              <dl className={styles.panelKv}>
                <dt>Urgencia</dt>
                <dd className={urgencyClass(signal.urgency)}>{signal.urgency}</dd>
                <dt>Tipo sugerido</dt>
                <dd>{signal.suggestedOrderType}</dd>
                {signal.suggestedLimitPrice != null ? (
                  <>
                    <dt>Límite sugerido</dt>
                    <dd>${formatPrice(signal.suggestedLimitPrice)}</dd>
                  </>
                ) : null}
              </dl>
            </section>

            {analysis ? (
              <>
                <section className={styles.panelSection}>
                  <h3 className={styles.panelSectionTitle}>Indicadores</h3>
                  <table className={styles.indicatorTable}>
                    <tbody>
                      <tr>
                        <td>RSI (14)</td>
                        <td>{analysis.technicals.momentum.rsi?.toFixed(1) ?? "—"}</td>
                        <td>
                          <span
                            className={`${styles.signalLight} ${signalLight(analysis.technicals.momentum.rsi, 30, 70)}`}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td>MACD hist</td>
                        <td>{analysis.technicals.trend.macd?.histogram.toFixed(3) ?? "—"}</td>
                        <td>
                          <span
                            className={`${styles.signalLight} ${
                              (analysis.technicals.trend.macd?.histogram ?? 0) > 0
                                ? styles.lightGreen
                                : styles.lightRed
                            }`}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td>ADX</td>
                        <td>{analysis.technicals.trend.adx?.toFixed(1) ?? "—"}</td>
                        <td>
                          <span
                            className={`${styles.signalLight} ${signalLight(analysis.technicals.trend.adx, 20, 25)}`}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td>Vol. relativo</td>
                        <td>{analysis.technicals.volume.relativeVolume?.toFixed(2) ?? "—"}x</td>
                        <td>
                          <span
                            className={`${styles.signalLight} ${
                              (analysis.technicals.volume.relativeVolume ?? 0) > 2
                                ? styles.lightGreen
                                : styles.lightYellow
                            }`}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td>Squeeze</td>
                        <td>{analysis.technicals.volatility.squeeze?.active ? "Activo" : "No"}</td>
                        <td>
                          <span
                            className={`${styles.signalLight} ${
                              analysis.technicals.volatility.squeeze?.active
                                ? styles.lightGreen
                                : styles.lightNeutral
                            }`}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td>ATR</td>
                        <td>{analysis.technicals.volatility.atr?.toFixed(2) ?? "—"}</td>
                        <td><span className={`${styles.signalLight} ${styles.lightNeutral}`} /></td>
                      </tr>
                    </tbody>
                  </table>
                </section>

                <section className={styles.panelSection}>
                  <h3 className={styles.panelSectionTitle}>Patrones</h3>
                  <ul className={styles.patternList}>
                    {[
                      ...analysis.patterns.candlesticks,
                      ...analysis.patterns.price,
                      ...analysis.patterns.signals.map((s) => ({
                        name: s.name,
                        type: "NEUTRAL" as const,
                        confidence: s.strength,
                      })),
                    ].length === 0 ? (
                      <li className={styles.patternItem}>Sin patrones destacados</li>
                    ) : (
                      [
                        ...analysis.patterns.candlesticks,
                        ...analysis.patterns.price,
                      ].map((p) => (
                        <li key={p.name} className={styles.patternItem}>
                          <span className={styles.patternIcon} aria-hidden="true">
                            {p.type === "BULLISH" ? "▲" : p.type === "BEARISH" ? "▼" : "◆"}
                          </span>
                          {p.name}
                          <span className={styles.patternConf}>{p.confidence}%</span>
                        </li>
                      ))
                    )}
                  </ul>
                  {analysis.patterns.divergences.length > 0 ? (
                    <p className={styles.panelMeta}>
                      Divergencias:{" "}
                      {analysis.patterns.divergences.map((d) => `${d.indicator} ${d.type}`).join(", ")}
                    </p>
                  ) : null}
                </section>

                <section className={styles.panelSection}>
                  <h3 className={styles.panelSectionTitle}>
                    Noticias
                    <span className={`${styles.sentimentBadge} ${sentimentClass(analysis.news.overallSentiment)}`}>
                      {analysis.news.overallSentiment}
                    </span>
                  </h3>
                  <ul className={styles.newsList}>
                    {analysis.news.items.length === 0 ? (
                      <li className={styles.newsItem}>Sin noticias recientes</li>
                    ) : (
                      analysis.news.items.map((n) => (
                        <li key={n.title} className={styles.newsItem}>
                          <span className={`${styles.sentimentBadge} ${sentimentClass(n.sentiment)}`}>
                            {n.sentiment.slice(0, 3)}
                          </span>
                          <span className={styles.newsTitle}>{n.title}</span>
                          <span className={styles.newsMeta}>
                            {n.source} · {n.hoursAgo}h
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                </section>
              </>
            ) : null}

            <section className={styles.panelSection}>
              <h3 className={styles.panelSectionTitle}>Datos de mercado</h3>
              <dl className={styles.panelKv}>
                <dt>Precio</dt>
                <dd>${formatPrice(market.currentPrice || market.previousClose)}</dd>
                <dt>Cambio 1d</dt>
                <dd>
                  {market.change1d >= 0 ? "+" : ""}
                  {market.change1d.toFixed(2)}
                </dd>
                <dt>Volumen</dt>
                <dd>{market.volume.toLocaleString()}</dd>
              </dl>
            </section>

            <p className={styles.panelDisclaimer}>
              Multi-fuente · TradingAgent · ANALYSIS_ONLY · sin ejecución de órdenes
            </p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
