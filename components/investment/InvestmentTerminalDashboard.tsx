"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "@/styles/investment/terminal-dashboard.module.css";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import {
  type InvestmentHealthState,
  honestBrokerDataSource,
} from "@/lib/investment/dashboard-snapshot.types";
import type { OpportunityCandidate } from "@/src/core/investment/opportunity/client";
import { useInvestmentDashboardData } from "./dashboard-data-coordinator";

const MARKET_POLL_MS = 30_000;
const OPP_POLL_MS = 20_000;
const CLOCK_TICK_MS = 1_000;
const SESSION_TICK_MS = 30_000;

const WORLD_CLOCKS = [
  { city: "New York", timeZone: "America/New_York" },
  { city: "London", timeZone: "Europe/London" },
  { city: "Frankfurt", timeZone: "Europe/Berlin" },
  { city: "Tokyo", timeZone: "Asia/Tokyo" },
  { city: "Hong Kong", timeZone: "Asia/Hong_Kong" },
  { city: "Sydney", timeZone: "Australia/Sydney" },
] as const;

/** Session windows are clock-based only — never invent index levels. */
const MARKET_SESSIONS = [
  { id: "NYSE", label: "NYSE / Nasdaq", timeZone: "America/New_York", openHour: 9.5, closeHour: 16 },
  { id: "LSE", label: "London", timeZone: "Europe/London", openHour: 8, closeHour: 16.5 },
  { id: "XETRA", label: "Frankfurt", timeZone: "Europe/Berlin", openHour: 9, closeHour: 17.5 },
  { id: "TSE", label: "Tokyo", timeZone: "Asia/Tokyo", openHour: 9, closeHour: 15 },
  { id: "HKEX", label: "Hong Kong", timeZone: "Asia/Hong_Kong", openHour: 9.5, closeHour: 16 },
  { id: "ASX", label: "Sydney", timeZone: "Australia/Sydney", openHour: 10, closeHour: 16 },
] as const;

type MoverRow = { symbol: string; changePct: number; price?: number };
type HeatRow = { symbol: string; changePct: number };
type NewsRow = { id: string; title: string; source: string; publishedAt: string };
type MacroRow = { key: string; label: string; value: string; period: string };

type MarketPanelState = {
  movers: MoverRow[];
  gainers: MoverRow[];
  losers: MoverRow[];
  heat: HeatRow[];
  news: NewsRow[];
  macro: MacroRow[];
  volatility: string;
  marketsStatus: string;
  providersConfigured: number;
  latencyMs: number | null;
  error: string;
  updatedAt: string | null;
};

type OppState = {
  candidates: OpportunityCandidate[];
  error: string;
  scannedAt: string | null;
};

function fmtMoney(value: number | undefined, currency = "USD"): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "NO_DATA";
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${currency}`;
}

function fmtNumber(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("en-US") : "NO_DATA";
}

function fmtPct(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(2)}%` : "NO_DATA";
}

function badgeClass(state: string): string {
  const ok = state === "CONNECTED" || state === "READY" || state === "ACTIVE" || state === "OPEN";
  const warn = state === "STALE" || state === "PARTIAL" || state === "IDLE" || state === "DELAYED" || state === "CLOSED";
  if (ok) return `${styles.badge} ${styles.badgeOk}`;
  if (warn) return `${styles.badge} ${styles.badgeWarn}`;
  if (state === "ERROR" || state === "DISCONNECTED") return `${styles.badge} ${styles.badgeDanger}`;
  return `${styles.badge} ${styles.badgeIdle}`;
}

function sessionOpen(timeZone: string, openHour: number, closeHour: number, now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  if (weekday === "Sat" || weekday === "Sun") return false;
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const h = hour + minute / 60;
  return h >= openHour && h < closeHour;
}

function clockLabel(timeZone: string, now: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);
}

function changeFromSnapshot(snapshot: {
  quote?: { price?: number };
  timeSeries?: { points?: ReadonlyArray<{ close?: number }> };
}): number | null {
  const points = snapshot.timeSeries?.points;
  if (points && points.length >= 2) {
    const prev = points[points.length - 2]?.close;
    const last = points[points.length - 1]?.close;
    if (typeof prev === "number" && prev > 0 && typeof last === "number") {
      return ((last - prev) / prev) * 100;
    }
  }
  return null;
}

function Panel({
  title,
  state,
  className,
  children,
}: {
  title: string;
  state: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <article className={`${styles.panel} ${className ?? ""}`.trim()} data-panel={title}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>{title}</h2>
        <span className={badgeClass(state)}>{state}</span>
      </div>
      <div className={styles.panelBody}>{children}</div>
    </article>
  );
}

/** Isolated 1s clock — avoids re-rendering the full terminal every tick. */
function WorldClockStrip() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => clearInterval(t);
  }, []);
  return (
    <div className={styles.clockGrid} aria-label="World markets clock">
      {WORLD_CLOCKS.map((c) => (
        <div key={c.timeZone} className={styles.clockItem}>
          <span className={styles.clockCity}>{c.city}</span>
          <span className={styles.clockTime}>{clockLabel(c.timeZone, now)}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Professional trading-terminal Dashboard for /investment.
 * Polls dashboard coordinator + opportunities + screener; never invents market numbers.
 */
export function InvestmentTerminalDashboard() {
  const { snapshot, error, refreshing, lastFetchedAt, retry } = useInvestmentDashboardData();
  const [sessionNow, setSessionNow] = useState(() => new Date());
  const [market, setMarket] = useState<MarketPanelState>({
    movers: [],
    gainers: [],
    losers: [],
    heat: [],
    news: [],
    macro: [],
    volatility: "NO_DATA",
    marketsStatus: "UNAVAILABLE",
    providersConfigured: 0,
    latencyMs: null,
    error: "",
    updatedAt: null,
  });
  const [opps, setOpps] = useState<OppState>({ candidates: [], error: "", scannedAt: null });

  useEffect(() => {
    const t = setInterval(() => setSessionNow(new Date()), SESSION_TICK_MS);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadMarket() {
      const started = performance.now();
      const result = await safeJsonFetch<{
        empty?: boolean;
        providersConfigured?: number;
        error?: string;
        result?: {
          marketSnapshots?: Array<{
            symbol: string;
            quote?: { price?: number };
            timeSeries?: { points?: Array<{ close?: number }> };
          }>;
          news?: Array<{
            id: string;
            title: string;
            source: string;
            publishedAt: string;
          }>;
          economicIndicators?: Array<{
            key: string;
            label: string;
            value: number;
            unit?: string;
            period: string;
          }>;
          sentiment?: Array<{ score?: number }>;
        } | null;
      }>("/api/investment/screener", { cache: "no-store" });
      if (cancelled) return;
      const latencyMs = Math.round(performance.now() - started);
      if (!result.ok || !result.data) {
        setMarket((prev) => ({
          ...prev,
          marketsStatus: "UNAVAILABLE",
          latencyMs,
          error: result.error ?? "Market data unavailable",
          updatedAt: new Date().toISOString(),
        }));
        return;
      }

      const rows: MoverRow[] = [];
      for (const snap of result.data.result?.marketSnapshots ?? []) {
        const changePct = changeFromSnapshot(snap);
        if (changePct == null) continue;
        rows.push({
          symbol: snap.symbol,
          changePct,
          price: typeof snap.quote?.price === "number" ? snap.quote.price : undefined,
        });
      }
      const sorted = [...rows].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
      const gainers = [...rows].filter((r) => r.changePct > 0).sort((a, b) => b.changePct - a.changePct);
      const losers = [...rows].filter((r) => r.changePct < 0).sort((a, b) => a.changePct - b.changePct);
      const absMoves = rows.map((r) => Math.abs(r.changePct));
      const volatility =
        absMoves.length > 0
          ? `${(absMoves.reduce((a, b) => a + b, 0) / absMoves.length).toFixed(2)}% avg |Δ|`
          : "NO_DATA";

      const news = (result.data.result?.news ?? []).slice(0, 6).map((n) => ({
        id: n.id,
        title: n.title,
        source: n.source,
        publishedAt: n.publishedAt,
      }));
      const macro = (result.data.result?.economicIndicators ?? []).slice(0, 6).map((e) => ({
        key: e.key,
        label: e.label,
        value: `${e.value}${e.unit ? ` ${e.unit}` : ""}`,
        period: e.period,
      }));

      const empty = Boolean(result.data.empty) || (rows.length === 0 && news.length === 0 && macro.length === 0);
      setMarket({
        movers: sorted.slice(0, 6),
        gainers: gainers.slice(0, 5),
        losers: losers.slice(0, 5),
        heat: sorted.slice(0, 12),
        news,
        macro,
        volatility,
        marketsStatus: empty ? "NO_DATA" : "READY",
        providersConfigured: result.data.providersConfigured ?? 0,
        latencyMs,
        error: result.data.error ?? "",
        updatedAt: new Date().toISOString(),
      });
    }

    void loadMarket();
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void loadMarket();
    }, MARKET_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadOpps() {
      const result = await safeJsonFetch<{
        candidates?: OpportunityCandidate[];
        scannedAt?: string;
        error?: string;
      }>("/api/investment/opportunities", { cache: "no-store" });
      if (cancelled) return;
      if (!result.ok || !result.data) {
        setOpps({ candidates: [], error: result.error ?? "UNAVAILABLE", scannedAt: null });
        return;
      }
      const ranked = [...(result.data.candidates ?? [])].sort((a, b) => b.score - a.score);
      setOpps({
        candidates: ranked.slice(0, 6),
        error: result.data.error ?? "",
        scannedAt: result.data.scannedAt ?? null,
      });
    }
    void loadOpps();
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void loadOpps();
    }, OPP_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const broker = snapshot?.brokerStatus;
  const account = snapshot?.accountSummary?.data;
  const portfolio = snapshot?.portfolioSummary?.data;
  const risk = snapshot?.riskSummary;
  const brain = snapshot?.brainStatus;
  const provider = snapshot?.providerStatus;
  const currency = account?.currency ?? portfolio?.baseCurrency ?? "USD";
  const capital = portfolio?.totalValue ?? account?.netLiquidation;
  const connected = Boolean(broker?.data?.connected);
  const brokerLabel = connected ? "CONNECTED" : (broker?.state ?? "DISCONNECTED");
  const aiLabel = (brain?.data?.status ?? brain?.state ?? "IDLE") as string;
  const marketsLabel = market.marketsStatus;
  const riskLabel = (risk?.data?.level ?? risk?.state ?? "UNAVAILABLE") as string;
  const dataSource = honestBrokerDataSource(
    broker?.data?.dataSource ?? broker?.dataSource,
    connected,
  );
  const ibkrState = connected
    ? dataSource === "IBKR_LIVE_READ_ONLY"
      ? "IBKR_READ_ONLY"
      : dataSource
    : "DISCONNECTED";

  const alerts = risk?.data?.factors ?? [];
  const openOrders = portfolio?.openOrderCount;
  const positionCount = portfolio?.positionCount;

  const sessions = useMemo(
    () =>
      MARKET_SESSIONS.map((s) => ({
        ...s,
        open: sessionOpen(s.timeZone, s.openHour, s.closeHour, sessionNow),
        clock: clockLabel(s.timeZone, sessionNow),
      })),
    [sessionNow],
  );

  return (
    <section
      className={`${styles.terminal}${refreshing ? ` ${styles.refreshing}` : ""}`}
      aria-label="ForgeOS Investment terminal dashboard"
      data-panel-id="investment-terminal-dashboard"
    >
      <p className={styles.modeNote}>
        ANALYSIS_ONLY · IBKR_READ_ONLY · LIVE_TRADING_ENABLED=false · orders disabled
        {error ? ` · ${error}` : ""}
        {" · "}
        <button type="button" className={styles.retryLink} onClick={retry}>
          Retry
        </button>
      </p>

      {/* Top bar */}
      <div className={styles.topBar} aria-label="Status bar">
        <div className={styles.statusCell}>
          <span className={styles.label}>Broker</span>
          <span className={badgeClass(brokerLabel)}>{brokerLabel}</span>
        </div>
        <div className={styles.statusCell}>
          <span className={styles.label}>AI</span>
          <span className={badgeClass(aiLabel === "IDLE" ? "IDLE" : "ACTIVE")}>{aiLabel}</span>
        </div>
        <div className={styles.statusCell}>
          <span className={styles.label}>Markets</span>
          <span className={badgeClass(marketsLabel)}>{marketsLabel}</span>
        </div>
        <div className={styles.statusCell}>
          <span className={styles.label}>Risk</span>
          <span className={badgeClass(String(riskLabel).toUpperCase())}>{riskLabel}</span>
        </div>
        <WorldClockStrip />
      </div>

      {/* Summary strip */}
      <div className={styles.summaryStrip} aria-label="Capital summary">
        <div className={styles.metricCell}>
          <span className={styles.label}>Capital</span>
          <span className={styles.value}>{fmtMoney(capital, currency)}</span>
        </div>
        <div className={styles.metricCell}>
          <span className={styles.label}>Daily P&amp;L</span>
          <span className={styles.valueMuted}>NO_DATA</span>
        </div>
        <div className={styles.metricCell}>
          <span className={styles.label}>Weekly P&amp;L</span>
          <span className={styles.valueMuted}>NO_DATA</span>
        </div>
        <div className={styles.metricCell}>
          <span className={styles.label}>Monthly P&amp;L</span>
          <span className={styles.valueMuted}>NO_DATA</span>
        </div>
        <div className={styles.metricCell}>
          <span className={styles.label}>Cash</span>
          <span className={styles.value}>{fmtMoney(account?.totalCashValue, currency)}</span>
        </div>
        <div className={styles.metricCell}>
          <span className={styles.label}>Buying Power</span>
          <span className={styles.value}>{fmtMoney(account?.buyingPower, currency)}</span>
        </div>
        <div className={styles.metricCell}>
          <span className={styles.label}>Exposure</span>
          <span className={styles.value}>{fmtPct(risk?.data?.concentrationRiskPct)}</span>
        </div>
        <div className={styles.metricCell}>
          <span className={styles.label}>Positions</span>
          <span className={styles.value}>{fmtNumber(positionCount)}</span>
        </div>
        <div className={styles.metricCell}>
          <span className={styles.label}>Open ops</span>
          <span className={styles.value}>{fmtNumber(openOrders)}</span>
        </div>
        <div className={styles.metricCell}>
          <span className={styles.label}>Closed ops</span>
          <span className={styles.valueMuted}>NO_DATA</span>
        </div>
      </div>

      <div className={styles.mainLayout}>
        <div className={styles.centerGrid} aria-label="Market center">
          <Panel title="World Markets Map" state={sessions.some((s) => s.open) ? "OPEN" : "CLOSED"} className={styles.panelWide}>
            <div className={styles.mapGrid}>
              {sessions.map((s) => (
                <div key={s.id} className={styles.mapCell}>
                  <span className={styles.mapExchange}>{s.label}</span>
                  <span className={`${styles.mapSession} ${s.open ? styles.toneGood : styles.toneWarn}`}>
                    {s.open ? "SESSION OPEN" : "SESSION CLOSED"}
                  </span>
                  <span className={styles.mapQuote}>{s.clock} · Index NO_DATA</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="Heatmap"
            state={market.heat.length ? "READY" : "NO_DATA"}
            className={styles.panelWide}
          >
            {market.heat.length === 0 ? (
              <p className={styles.empty}>NO_DATA — configure Market Intelligence providers</p>
            ) : (
              <div className={styles.heatGrid}>
                {market.heat.map((h) => (
                  <div
                    key={h.symbol}
                    className={`${styles.heatCell} ${h.changePct > 0 ? styles.heatUp : h.changePct < 0 ? styles.heatDown : ""}`}
                  >
                    <div>{h.symbol}</div>
                    <div>{h.changePct >= 0 ? "+" : ""}{h.changePct.toFixed(2)}%</div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Top Movers" state={market.movers.length ? "READY" : "NO_DATA"} className={styles.panelThird}>
            {market.movers.length === 0 ? (
              <p className={styles.empty}>NO_DATA</p>
            ) : (
              market.movers.map((m) => (
                <div key={m.symbol} className={styles.row}>
                  <span className={styles.rowLabel}>{m.symbol}</span>
                  <span className={`${styles.rowValue} ${m.changePct >= 0 ? styles.toneGood : styles.toneDanger}`}>
                    {m.changePct >= 0 ? "+" : ""}{m.changePct.toFixed(2)}%
                  </span>
                </div>
              ))
            )}
          </Panel>

          <Panel title="Top Gainers" state={market.gainers.length ? "READY" : "NO_DATA"} className={styles.panelThird}>
            {market.gainers.length === 0 ? (
              <p className={styles.empty}>NO_DATA</p>
            ) : (
              market.gainers.map((m) => (
                <div key={m.symbol} className={styles.row}>
                  <span className={styles.rowLabel}>{m.symbol}</span>
                  <span className={`${styles.rowValue} ${styles.toneGood}`}>+{m.changePct.toFixed(2)}%</span>
                </div>
              ))
            )}
          </Panel>

          <Panel title="Top Losers" state={market.losers.length ? "READY" : "NO_DATA"} className={styles.panelThird}>
            {market.losers.length === 0 ? (
              <p className={styles.empty}>NO_DATA</p>
            ) : (
              market.losers.map((m) => (
                <div key={m.symbol} className={styles.row}>
                  <span className={styles.rowLabel}>{m.symbol}</span>
                  <span className={`${styles.rowValue} ${styles.toneDanger}`}>{m.changePct.toFixed(2)}%</span>
                </div>
              ))
            )}
          </Panel>

          <Panel title="Volatility" state={market.volatility === "NO_DATA" ? "NO_DATA" : "READY"} className={styles.panelThird}>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Universe |Δ|</span>
              <span className={styles.rowValue}>{market.volatility}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Expected DD</span>
              <span className={styles.rowValue}>{fmtPct(risk?.data?.expectedDrawdownPct)}</span>
            </div>
            <p className={styles.empty} style={{ marginTop: 6 }}>
              VIX / realized vol series: NO_DATA
            </p>
          </Panel>

          <Panel title="Critical News" state={market.news.length ? "READY" : "NO_DATA"} className={styles.panelHalf}>
            {market.news.length === 0 ? (
              <p className={styles.empty}>NO_DATA — no news providers / empty gather</p>
            ) : (
              <ul className={styles.list}>
                {market.news.map((n) => (
                  <li key={n.id} className={styles.listItem}>
                    <span className={styles.listPrimary}>{n.title}</span>
                    <span className={styles.listMeta}>
                      {n.source} · {n.publishedAt ? new Date(n.publishedAt).toLocaleString() : "NO_DATA"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Macro Calendar" state={market.macro.length ? "READY" : "NO_DATA"} className={styles.panelHalf}>
            {market.macro.length === 0 ? (
              <p className={styles.empty}>NO_DATA — economic calendar / indicators unavailable</p>
            ) : (
              market.macro.map((e) => (
                <div key={e.key} className={styles.row}>
                  <span className={styles.rowLabel}>{e.label}</span>
                  <span className={styles.rowValue}>
                    {e.value} · {e.period}
                  </span>
                </div>
              ))
            )}
          </Panel>
        </div>

        <aside className={styles.sideRail} aria-label="Side rail">
          <Panel title="Top AI Opportunities" state={opps.candidates.length ? "READY" : opps.error ? "ERROR" : "NO_DATA"}>
            {opps.candidates.length === 0 ? (
              <p className={styles.empty}>{opps.error || "NO_DATA"}</p>
            ) : (
              <ul className={styles.list}>
                {opps.candidates.map((c) => (
                  <li key={c.id} className={styles.listItem}>
                    <span className={styles.listPrimary}>
                      {c.instrument.symbol} · {c.direction} · {c.detection}
                    </span>
                    <span className={styles.listMeta}>
                      score {c.score.toFixed(1)} · conf {(c.confidence * 100).toFixed(0)}% · ANALYSIS_ONLY
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Alerts" state={alerts.length ? "READY" : "NO_DATA"}>
            {alerts.length === 0 ? (
              <p className={styles.empty}>NO_ALERTS / NO_DATA</p>
            ) : (
              alerts.slice(0, 6).map((a) => (
                <div key={a} className={styles.row}>
                  <span className={styles.rowLabel}>{a}</span>
                </div>
              ))
            )}
          </Panel>

          <Panel title="Risks" state={(risk?.state as InvestmentHealthState) ?? "UNAVAILABLE"}>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Level</span>
              <span className={styles.rowValue}>{risk?.data?.level ?? "NO_DATA"}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Concentration</span>
              <span className={styles.rowValue}>{fmtPct(risk?.data?.concentrationRiskPct)}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Liquidity risk</span>
              <span className={styles.rowValue}>{fmtPct(risk?.data?.liquidityRiskPct)}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Expected DD</span>
              <span className={styles.rowValue}>{fmtPct(risk?.data?.expectedDrawdownPct)}</span>
            </div>
          </Panel>

          <Panel title="Pending Orders" state={typeof openOrders === "number" ? "READY" : "NO_DATA"}>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Open (read-only)</span>
              <span className={styles.rowValue}>{fmtNumber(openOrders)}</span>
            </div>
            <p className={styles.empty}>Order submission disabled · see Orders / Broker for detail</p>
          </Panel>
        </aside>
      </div>

      {/* Footer */}
      <footer className={styles.footer} aria-label="Services status">
        <div className={styles.footerCell}>
          <span className={styles.label}>Services</span>
          <span className={styles.value}>
            {provider?.data?.marketProviderStatus ?? provider?.state ?? "UNAVAILABLE"}
          </span>
        </div>
        <div className={styles.footerCell}>
          <span className={styles.label}>Latency</span>
          <span className={styles.value}>
            {market.latencyMs == null ? "NO_DATA" : `${market.latencyMs} ms`}
          </span>
        </div>
        <div className={styles.footerCell}>
          <span className={styles.label}>IBKR</span>
          <span className={styles.value}>{ibkrState}</span>
        </div>
        <div className={styles.footerCell}>
          <span className={styles.label}>Market Data</span>
          <span className={styles.value}>
            {market.providersConfigured > 0 ? `${market.providersConfigured} providers` : "NO_DATA"}
          </span>
        </div>
        <div className={styles.footerCell}>
          <span className={styles.label}>Last sync</span>
          <span className={styles.value}>
            {lastFetchedAt
              ? new Date(lastFetchedAt).toLocaleTimeString()
              : snapshot?.generatedAt
                ? new Date(snapshot.generatedAt).toLocaleTimeString()
                : "NO_DATA"}
          </span>
        </div>
        <div className={styles.footerCell}>
          <span className={styles.label}>MI gather</span>
          <span className={styles.value}>
            {market.updatedAt ? new Date(market.updatedAt).toLocaleTimeString() : "NO_DATA"}
          </span>
        </div>
      </footer>
    </section>
  );
}
