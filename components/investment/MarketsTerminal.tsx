"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import { MarketsTerminalChart } from "./MarketsTerminalChart";
import { LightweightCandleChart } from "./LightweightCandleChart";
import {
  indicatorAvailability,
  lastFinite,
  pctChange,
  realizedVol,
  seriesAtr,
  seriesEma,
  seriesSma,
  seriesVwap,
  seriesBollinger,
} from "./markets-terminal-indicators";
import {
  ASSET_CLASS_LABELS,
  FAVORITES_KEY,
  INDICATOR_TOGGLES,
  LEFT_NAV_SECTIONS,
  MARKETS_CATALOG,
  POLL_MS,
  WATCHLIST_KEY,
  type AssetClassId,
  type CatalogInstrument,
  type IndicatorId,
  type LeftNavSectionId,
  type MetricValue,
  type MiStatusClientPayload,
  type AuditClientPayload,
  type ScreenerGatherClientPayload,
} from "./markets-terminal.types";
import styles from "@/styles/investment/markets-terminal.module.css";

function readStringList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string").map((s) => s.toUpperCase());
  } catch {
    return [];
  }
}

function writeStringList(key: string, values: readonly string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify([...new Set(values.map((s) => s.toUpperCase()))]));
}

function formatPrice(n: number | undefined, currency?: string): MetricValue {
  if (typeof n !== "number" || !Number.isFinite(n)) {
    return { state: "NO_DATA", value: "NO_DATA" };
  }
  const suffix = currency ? ` ${currency}` : "";
  return { state: "READY", value: `${n.toFixed(n >= 100 ? 2 : 4)}${suffix}`, raw: n };
}

function formatPct(n: number | null): MetricValue {
  if (n == null || !Number.isFinite(n)) return { state: "NO_DATA", value: "NO_DATA" };
  const sign = n > 0 ? "+" : "";
  return { state: "READY", value: `${sign}${n.toFixed(2)}%`, raw: n };
}

function unavailable(label = "UNAVAILABLE"): MetricValue {
  return { state: "UNAVAILABLE", value: label };
}

function changeOverBars(
  bars: readonly { close: number }[],
  lookback: number,
): number | null {
  if (bars.length < lookback + 1) return null;
  const last = bars[bars.length - 1]!.close;
  const prev = bars[bars.length - 1 - lookback]!.close;
  const pct = pctChange(prev, last);
  return Number.isFinite(pct) ? pct : null;
}

function MarketsTerminalRightExtras({
  symbol,
  news,
  sentiment,
  economic,
  auditItems,
}: {
  symbol: string;
  news: NonNullable<NonNullable<ScreenerGatherClientPayload["result"]>["news"]>;
  sentiment: NonNullable<NonNullable<ScreenerGatherClientPayload["result"]>["sentiment"]>;
  economic: NonNullable<NonNullable<ScreenerGatherClientPayload["result"]>["economicIndicators"]>;
  auditItems: NonNullable<AuditClientPayload["items"]>;
}) {
  const symbolNews = news.filter(
    (n) => !n.symbols?.length || n.symbols.some((s) => s.toUpperCase() === symbol),
  );
  const symbolSent = sentiment.filter((s) => s.target.toUpperCase() === symbol || s.target === "*");
  const relatedAudit = auditItems.filter(
    (i) => !i.symbol || i.symbol.toUpperCase() === symbol,
  );

  return (
    <>
      <article className={styles.rightPanel}>
        <div className={styles.panelTitleRow}>
          <h3 className={styles.panelTitle}>News</h3>
          <span className={symbolNews.length ? styles.badgeOk : styles.badgeWarn}>
            {symbolNews.length ? `${symbolNews.length}` : "NO_DATA"}
          </span>
        </div>
        <ul className={styles.rightBody}>
          {symbolNews.length === 0 ? <li>NO_DATA — no MI news for this symbol</li> : null}
          {symbolNews.slice(0, 8).map((n) => (
            <li key={n.id}>
              <a className={styles.rightLink} href={n.url} target="_blank" rel="noreferrer">
                {n.title}
              </a>
              <div className={styles.searchHitMeta}>
                {n.source} · {new Date(n.publishedAt).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      </article>

      <article className={styles.rightPanel}>
        <div className={styles.panelTitleRow}>
          <h3 className={styles.panelTitle}>Sentiment</h3>
          <span className={symbolSent.length ? styles.badgeOk : styles.badgeWarn}>
            {symbolSent.length ? "READY" : "NO_DATA"}
          </span>
        </div>
        <ul className={styles.rightBody}>
          {symbolSent.length === 0 ? <li>NO_DATA — no MI sentiment signals</li> : null}
          {symbolSent.slice(0, 6).map((s) => (
            <li key={s.signalId}>
              Score {s.score.toFixed(2)} · conf {s.confidence.toFixed(2)} · {s.providerId}
              {s.rationale ? <div className={styles.searchHitMeta}>{s.rationale}</div> : null}
            </li>
          ))}
        </ul>
      </article>

      <article className={styles.rightPanel}>
        <div className={styles.panelTitleRow}>
          <h3 className={styles.panelTitle}>Macro / Calendar</h3>
          <span className={economic.length ? styles.badgeOk : styles.badgeWarn}>
            {economic.length ? `${economic.length}` : "NO_DATA"}
          </span>
        </div>
        <ul className={styles.rightBody}>
          {economic.length === 0 ? (
            <li>
              NO_DATA — economic providers empty.{" "}
              <Link className={styles.rightLink} href="/investment/calendar">
                Calendar →
              </Link>
            </li>
          ) : null}
          {economic.slice(0, 8).map((e) => (
            <li key={`${e.key}-${e.period}`}>
              {e.label}: {e.value}
              {e.unit ? ` ${e.unit}` : ""} · {e.period}
            </li>
          ))}
        </ul>
      </article>

      <article className={styles.rightPanel}>
        <div className={styles.panelTitleRow}>
          <h3 className={styles.panelTitle}>Earnings</h3>
          <span className={styles.badgeWarn}>UNAVAILABLE</span>
        </div>
        <ul className={styles.rightBody}>
          <li>UNAVAILABLE — no earnings calendar API wired in MI gather yet</li>
        </ul>
      </article>

      <article className={styles.rightPanel}>
        <div className={styles.panelTitleRow}>
          <h3 className={styles.panelTitle}>AI Rating / Committee</h3>
          <span className={relatedAudit.length ? styles.badgeOk : styles.badgeWarn}>
            {relatedAudit.length ? "AUDIT" : "NO_DATA"}
          </span>
        </div>
        <ul className={styles.rightBody}>
          {relatedAudit.length === 0 ? (
            <li>
              NO_DATA — no audit/committee artifacts for {symbol}.{" "}
              <Link className={styles.rightLink} href="/investment/committee">
                Committee →
              </Link>{" "}
              <Link className={styles.rightLink} href="/investment/alpha">
                Alpha →
              </Link>
            </li>
          ) : null}
          {relatedAudit.slice(0, 5).map((i) => (
            <li key={i.id}>
              [{i.kind}] {i.summary}
              <div className={styles.searchHitMeta}>{new Date(i.occurredAt).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      </article>

      <article className={styles.rightPanel}>
        <div className={styles.panelTitleRow}>
          <h3 className={styles.panelTitle}>Risks</h3>
          <span className={styles.badgeLocked}>ANALYSIS_ONLY</span>
        </div>
        <ul className={styles.rightBody}>
          <li>
            Trade gate: NO_TRADE on delayed/stale. Orders disabled.{" "}
            <Link className={styles.rightLink} href="/investment/risk">
              Risk desk →
            </Link>
          </li>
        </ul>
      </article>
    </>
  );
}

export function MarketsTerminal({
  initialStatus,
}: {
  initialStatus: MiStatusClientPayload;
}) {
  const [query, setQuery] = useState("");
  const [assetFilter, setAssetFilter] = useState<AssetClassId | "ALL">("ALL");
  const [leftSection, setLeftSection] = useState<LeftNavSectionId>("favorites");
  const [selected, setSelected] = useState<CatalogInstrument>(
    () => MARKETS_CATALOG.find((c) => c.symbol === "SPY" && c.assetClass === "etf") ?? MARKETS_CATALOG[0]!,
  );
  const [favorites, setFavorites] = useState<string[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [activeIndicators, setActiveIndicators] = useState<Set<IndicatorId>>(
    () => new Set<IndicatorId>(["sma", "ema", "rsi", "atr"]),
  );
  const [gather, setGather] = useState<ScreenerGatherClientPayload | null>(null);
  const [audit, setAudit] = useState<AuditClientPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    setFavorites(readStringList(FAVORITES_KEY));
    setWatchlist(readStringList(WATCHLIST_KEY));
  }, []);

  const refresh = useCallback(
    (symbol: string) => {
      startTransition(async () => {
        const [screenerRes, auditRes] = await Promise.all([
          safeJsonFetch<ScreenerGatherClientPayload>(
            `/api/investment/screener?symbols=${encodeURIComponent(symbol)}`,
          ),
          safeJsonFetch<AuditClientPayload>(
            `/api/investment/audit?symbol=${encodeURIComponent(symbol)}&limit=12`,
          ),
        ]);
        if (!screenerRes.ok) {
          setError(screenerRes.error ?? "Screener gather failed");
        } else {
          setError(null);
          setGather(screenerRes.data);
          setUpdatedAt(new Date().toISOString());
        }
        if (auditRes.ok) setAudit(auditRes.data);
      });
    },
    [],
  );

  useEffect(() => {
    refresh(selected.symbol);
    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      refresh(selected.symbol);
    };
    const id = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh, selected.symbol]);

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MARKETS_CATALOG.filter((c) => {
      if (assetFilter !== "ALL" && c.assetClass !== assetFilter) return false;
      if (!q) return true;
      const hay = `${c.symbol} ${c.name} ${c.market} ${c.sector ?? ""} ${c.country ?? ""} ${ASSET_CLASS_LABELS[c.assetClass]}`.toLowerCase();
      return hay.includes(q);
    }).slice(0, 24);
  }, [query, assetFilter]);

  const snapshot = useMemo(() => {
    const snaps = gather?.result?.marketSnapshots ?? [];
    return snaps.find((s) => s.symbol.toUpperCase() === selected.symbol.toUpperCase()) ?? snaps[0] ?? null;
  }, [gather, selected.symbol]);

  const bars = useMemo(() => {
    const points = snapshot?.timeSeries?.points ?? [];
    return points.filter(
      (p) =>
        Number.isFinite(p.open) &&
        Number.isFinite(p.high) &&
        Number.isFinite(p.low) &&
        Number.isFinite(p.close),
    );
  }, [snapshot]);

  const hasVolume = bars.some((b) => typeof b.volume === "number" && Number.isFinite(b.volume));

  const metrics: { label: string; metric: MetricValue }[] = useMemo(() => {
    const last = snapshot?.quote?.price ?? (bars.length ? bars[bars.length - 1]!.close : undefined);
    const currency = snapshot?.quote?.currency ?? selected.currency;
    const atr = lastFinite(seriesAtr(bars));
    const vol = realizedVol(bars, 20);
    return [
      { label: "Name", metric: { state: "READY", value: selected.name } },
      { label: "Ticker", metric: { state: "READY", value: selected.symbol } },
      { label: "Market", metric: { state: "READY", value: selected.market } },
      { label: "Last", metric: formatPrice(last, currency) },
      { label: "Daily Δ", metric: formatPct(changeOverBars(bars, 1)) },
      { label: "Weekly Δ", metric: formatPct(changeOverBars(bars, 5)) },
      { label: "Monthly Δ", metric: formatPct(changeOverBars(bars, 21)) },
      {
        label: "Volume",
        metric: hasVolume
          ? {
              state: "READY",
              value: String(bars[bars.length - 1]?.volume ?? "NO_DATA"),
            }
          : { state: "NO_DATA", value: "NO_DATA" },
      },
      { label: "Spread", metric: unavailable() },
      {
        label: "ATR",
        metric:
          atr != null
            ? { state: "READY", value: atr.toFixed(4), raw: atr }
            : { state: bars.length ? "UNAVAILABLE" : "NO_DATA", value: bars.length ? "UNAVAILABLE" : "NO_DATA" },
      },
      {
        label: "Volatility",
        metric:
          vol != null
            ? { state: "READY", value: `${vol.toFixed(2)}% ann.`, raw: vol }
            : { state: bars.length ? "UNAVAILABLE" : "NO_DATA", value: bars.length ? "UNAVAILABLE" : "NO_DATA" },
      },
      { label: "Beta", metric: unavailable() },
      { label: "Market Cap", metric: unavailable() },
      {
        label: "Sector",
        metric: selected.sector
          ? { state: "READY", value: selected.sector }
          : snapshot?.assetClass
            ? { state: "READY", value: snapshot.assetClass }
            : unavailable(),
      },
      { label: "Industry", metric: unavailable() },
      {
        label: "Country",
        metric: selected.country ? { state: "READY", value: selected.country } : unavailable(),
      },
    ];
  }, [bars, hasVolume, selected, snapshot]);

  const leftItems = useMemo(() => {
    if (leftSection === "favorites") {
      return MARKETS_CATALOG.filter((c) => favorites.includes(c.symbol));
    }
    if (leftSection === "watchlists") {
      return MARKETS_CATALOG.filter((c) => watchlist.includes(c.symbol));
    }
    if (leftSection === "sectors") {
      const sectors = [...new Set(MARKETS_CATALOG.map((c) => c.sector).filter(Boolean))] as string[];
      return sectors.map((sector) => ({
        symbol: sector,
        name: sector,
        assetClass: "stocks" as const,
        market: "SECTOR",
        sector,
      }));
    }
    if (leftSection === "countries") {
      const countries = [...new Set(MARKETS_CATALOG.map((c) => c.country).filter(Boolean))] as string[];
      return countries.map((country) => ({
        symbol: country,
        name: country,
        assetClass: "stocks" as const,
        market: "COUNTRY",
        country,
      }));
    }
    if (leftSection === "currencies") {
      return MARKETS_CATALOG.filter((c) => c.assetClass === "forex");
    }
    if (leftSection === "indices") {
      return MARKETS_CATALOG.filter((c) => c.assetClass === "indices");
    }
    // filters — show asset-class buckets
    return (Object.keys(ASSET_CLASS_LABELS) as AssetClassId[]).map((id) => ({
      symbol: id.toUpperCase(),
      name: ASSET_CLASS_LABELS[id],
      assetClass: id,
      market: "FILTER",
    }));
  }, [favorites, leftSection, watchlist]);

  function selectInstrument(inst: CatalogInstrument) {
    setSelected(inst);
    setQuery(inst.symbol);
    setSearchOpen(false);
  }

  function selectRawSymbol(raw: string) {
    const symbol = raw.trim().toUpperCase();
    if (!symbol) return;
    const known = MARKETS_CATALOG.find((c) => c.symbol === symbol);
    if (known) {
      selectInstrument(known);
      return;
    }
    selectInstrument({
      symbol,
      name: symbol,
      assetClass: assetFilter === "ALL" ? "stocks" : assetFilter,
      market: "CUSTOM",
    });
  }

  function onLeftClick(item: CatalogInstrument) {
    if (leftSection === "sectors" && item.sector) {
      setAssetFilter("stocks");
      setQuery(item.sector);
      setSearchOpen(true);
      return;
    }
    if (leftSection === "countries" && item.country) {
      setQuery(item.country);
      setSearchOpen(true);
      return;
    }
    if (leftSection === "filters") {
      setAssetFilter(item.assetClass);
      setQuery("");
      setSearchOpen(true);
      return;
    }
    const real = MARKETS_CATALOG.find(
      (c) => c.symbol === item.symbol && (c.assetClass === item.assetClass || item.market !== "FILTER"),
    );
    if (real) selectInstrument(real);
  }

  function toggleFavorite() {
    setFavorites((prev) => {
      const next = prev.includes(selected.symbol)
        ? prev.filter((s) => s !== selected.symbol)
        : [...prev, selected.symbol];
      writeStringList(FAVORITES_KEY, next);
      return next;
    });
  }

  function toggleWatchlist() {
    setWatchlist((prev) => {
      const next = prev.includes(selected.symbol)
        ? prev.filter((s) => s !== selected.symbol)
        : [...prev, selected.symbol];
      writeStringList(WATCHLIST_KEY, next);
      return next;
    });
  }

  function toggleIndicator(id: IndicatorId) {
    const avail = indicatorAvailability(id, bars, hasVolume);
    if (avail !== "READY") return;
    setActiveIndicators((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const providersConfigured = gather?.providersConfigured ?? initialStatus.totalConfigured ?? 0;

  return (
    <section className={styles.terminal} aria-label="Markets analysis terminal">
      <header className={styles.topBar}>
        <div className={styles.searchBlock}>
          <div className={styles.searchRow}>
            <input
              className={styles.searchInput}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (hits[0]) selectInstrument(hits[0]);
                  else selectRawSymbol(query);
                } else if (e.key === "Escape") {
                  setSearchOpen(false);
                }
              }}
              placeholder="Buscar: Acciones, ETFs, Forex, Índices, Futuros, Opciones, Bonos, Materias primas, Cripto…"
              aria-label="Universal markets search"
              autoComplete="off"
            />
            <button
              type="button"
              className={styles.refreshBtn}
              disabled={pending}
              onClick={() => refresh(selected.symbol)}
            >
              {pending ? "Updating…" : "Refresh"}
            </button>
          </div>
          <div className={styles.classChips} role="group" aria-label="Asset class filter">
            <button
              type="button"
              className={assetFilter === "ALL" ? styles.chipActive : styles.chip}
              onClick={() => setAssetFilter("ALL")}
            >
              All
            </button>
            {(Object.keys(ASSET_CLASS_LABELS) as AssetClassId[]).map((id) => (
              <button
                key={id}
                type="button"
                className={assetFilter === id ? styles.chipActive : styles.chip}
                onClick={() => {
                  setAssetFilter(id);
                  setSearchOpen(true);
                }}
              >
                {ASSET_CLASS_LABELS[id]}
              </button>
            ))}
          </div>
          {searchOpen && hits.length > 0 ? (
            <ul className={styles.searchHits} role="listbox">
              {hits.map((h) => (
                <li key={`${h.assetClass}-${h.symbol}-${h.name}`}>
                  <button
                    type="button"
                    className={
                      selected.symbol === h.symbol && selected.assetClass === h.assetClass
                        ? `${styles.searchHit} ${styles.searchHitActive}`
                        : styles.searchHit
                    }
                    onClick={() => selectInstrument(h)}
                  >
                    <span className={styles.searchHitSymbol}>{h.symbol}</span>
                    <span>{h.name}</span>
                    <span className={styles.searchHitMeta}>
                      {ASSET_CLASS_LABELS[h.assetClass]} · {h.market}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className={styles.statusStrip}>
          <span className={styles.badgeLocked}>ANALYSIS_ONLY</span>
          <span className={styles.badgeLocked}>NO ORDERS</span>
          <span className={providersConfigured > 0 ? styles.badgeOk : styles.badgeWarn}>
            MI {providersConfigured > 0 ? `${providersConfigured} providers` : "NO_DATA"}
          </span>
          <span className={providersConfigured > 0 ? styles.badgeOk : styles.badgeWarn}>
            {providersConfigured > 0 ? "REAL PROVIDERS" : "UNAVAILABLE"}
          </span>
          <span>
            {updatedAt ? `Updated ${new Date(updatedAt).toLocaleTimeString()}` : "—"} · poll {POLL_MS / 1000}s
          </span>
        </div>
      </header>

      {error ? <p className={styles.error}>{error}</p> : null}
      {gather?.note ? <p className={styles.note}>{gather.note}</p> : null}
      {gather?.empty ? (
        <p className={styles.note}>
          Gather empty — configure MI providers in env. UI polling is active; quotes remain NO_DATA (not DEMO).
        </p>
      ) : null}

      <div className={styles.body}>
        <aside className={styles.side} aria-label="Markets navigation">
          <div className={styles.sideHeader}>
            <h2 className={styles.sideTitle}>Workspace</h2>
            <span className={styles.badgeOk}>LOCAL</span>
          </div>
          <nav className={styles.sideNav}>
            {LEFT_NAV_SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={leftSection === s.id ? styles.sideNavActive : styles.sideNavBtn}
                onClick={() => setLeftSection(s.id)}
              >
                {s.label}
              </button>
            ))}
          </nav>
          {leftItems.length === 0 ? (
            <p className={styles.sideEmpty}>
              {leftSection === "favorites" || leftSection === "watchlists"
                ? "Empty — star assets from the center panel (localStorage only)."
                : "NO_DATA"}
            </p>
          ) : (
            <ul className={styles.sideList}>
              {leftItems.map((item) => (
                <li key={`${leftSection}-${item.symbol}-${item.name}`}>
                  <button
                    type="button"
                    className={
                      selected.symbol === item.symbol ? `${styles.sideItem} ${styles.sideItemActive}` : styles.sideItem
                    }
                    onClick={() => onLeftClick(item as CatalogInstrument)}
                  >
                    <span className={styles.searchHitSymbol}>{item.symbol}</span>
                    <span className={styles.searchHitMeta}>{item.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className={styles.center} aria-label="Asset analysis">
          <div className={styles.centerHeader}>
            <div>
              <h2 className={styles.centerTitle}>
                {selected.symbol} · {selected.name}
              </h2>
              <p className={styles.note} style={{ padding: "4px 0 0" }}>
                {ASSET_CLASS_LABELS[selected.assetClass]} · {selected.market}
                {snapshot?.providerId ? ` · via ${snapshot.providerId}` : " · awaiting MI quote"}
              </p>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" className={styles.favBtn} onClick={toggleFavorite}>
                {favorites.includes(selected.symbol) ? "★ Fav" : "☆ Fav"}
              </button>
              <button type="button" className={styles.favBtn} onClick={toggleWatchlist}>
                {watchlist.includes(selected.symbol) ? "Watch ✓" : "+ Watch"}
              </button>
            </div>
          </div>

          <div className={styles.metricsGrid}>
            {metrics.map((m) => (
              <div key={m.label} className={styles.metric}>
                <span className={styles.metricLabel}>{m.label}</span>
                <span
                  className={
                    m.metric.state === "READY" ? styles.metricValue : styles.metricMuted
                  }
                >
                  {m.metric.value}
                </span>
              </div>
            ))}
          </div>

          <div className={styles.indicatorBar} role="group" aria-label="Indicators">
            {INDICATOR_TOGGLES.map((ind) => {
              const avail = indicatorAvailability(ind.id, bars, hasVolume);
              const on = activeIndicators.has(ind.id);
              const disabled = avail !== "READY";
              return (
                <button
                  key={ind.id}
                  type="button"
                  title={
                    disabled
                      ? `${ind.label}: ${avail} — needs ≥${ind.minBars} real bars${ind.needsVolume ? " + volume" : ""}`
                      : ind.label
                  }
                  className={disabled ? styles.indDisabled : on ? styles.indActive : styles.indBtn}
                  disabled={disabled}
                  onClick={() => toggleIndicator(ind.id)}
                >
                  {ind.label}
                  {disabled ? ` · ${avail}` : ""}
                </button>
              );
            })}
          </div>

          <LightweightCandleChart
            bars={bars.map((b) => ({
              open: b.open,
              high: b.high,
              low: b.low,
              close: b.close,
              volume: b.volume,
              timestamp: b.timestamp,
            }))}
            symbol={selected.symbol}
            height={300}
            className={styles.chartWrap}
            emptyClassName={styles.chartEmpty}
            lines={[
              ...(activeIndicators.has("sma")
                ? [{ id: "SMA20", color: "#7eb6ff", values: seriesSma(bars, 20) }]
                : []),
              ...(activeIndicators.has("ema")
                ? [{ id: "EMA20", color: "#f8b84e", values: seriesEma(bars, 20) }]
                : []),
              ...(activeIndicators.has("vwap")
                ? [{ id: "VWAP", color: "#c084fc", values: seriesVwap(bars) }]
                : []),
              ...(activeIndicators.has("bollinger")
                ? (() => {
                    const bb = seriesBollinger(bars);
                    return [
                      { id: "BB-U", color: "#9fb4c9", values: bb.upper },
                      { id: "BB-M", color: "#7eb6ff", values: bb.mid },
                      { id: "BB-L", color: "#9fb4c9", values: bb.lower },
                    ];
                  })()
                : []),
            ]}
          />
          {/* Oscillators / advanced overlays remain on the SVG chart when active. */}
          {(activeIndicators.has("rsi") ||
            activeIndicators.has("macd") ||
            activeIndicators.has("adx") ||
            activeIndicators.has("fibonacci") ||
            activeIndicators.has("pivot") ||
            activeIndicators.has("liquidity") ||
            activeIndicators.has("supertrend") ||
            activeIndicators.has("donchian") ||
            activeIndicators.has("ichimoku")) && bars.length >= 2 ? (
            <MarketsTerminalChart bars={bars} active={activeIndicators} symbol={selected.symbol} />
          ) : null}
        </div>

        <aside className={styles.rightStack} aria-label="Context panels">
          <Suspense
            fallback={
              <article className={styles.rightPanel}>
                <div className={styles.panelTitleRow}>
                  <h3 className={styles.panelTitle}>Context</h3>
                  <span className={styles.badgeWarn}>Loading…</span>
                </div>
              </article>
            }
          >
            <MarketsTerminalRightExtras
              symbol={selected.symbol}
              news={gather?.result?.news ?? []}
              sentiment={gather?.result?.sentiment ?? []}
              economic={gather?.result?.economicIndicators ?? []}
              auditItems={audit?.items ?? []}
            />
          </Suspense>
        </aside>
      </div>
    </section>
  );
}
