"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import { readLastKnown, writeLastKnown } from "@/lib/investment/client-last-known";
import { getDataRefreshPolicy } from "@/lib/market-data/refresh-policy";
import { MarketsAnalysisPanel } from "./MarketsAnalysisPanel";
import { SectorHeatmap } from "./SectorHeatmap";
import {
  ALL_MARKET_TICKERS,
  MARKET_REGIONS,
  MARKETS_PRIORITY_SYMBOLS,
  type MarketRegion,
  type MarketTicker,
  type TickerQuoteState,
} from "./markets-regional.types";
import styles from "@/styles/investment/markets-regional.module.css";

const LAST_KNOWN_KEY = "markets-quotes";

type BatchQuotesResponse = {
  quotes?: Record<
    string,
    { symbol: string; price: number | null; changePct: number | null }
  >;
};

function emptyQuote(loading = true): TickerQuoteState {
  return { price: null, changePct: null, loading, isClosing: false };
}

function formatPrice(price: number): string {
  return price >= 100 ? price.toFixed(2) : price.toFixed(4);
}

function formatChangePct(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function changeClass(pct: number | null): string {
  if (pct == null) return styles.changeNeutral;
  if (pct > 0) return styles.changeUp;
  if (pct < 0) return styles.changeDown;
  return styles.changeNeutral;
}

function mapBatchQuote(q: {
  price: number | null;
  changePct: number | null;
} | undefined): TickerQuoteState {
  if (!q || q.price == null || !Number.isFinite(q.price)) {
    return { price: null, changePct: null, loading: false, isClosing: false };
  }
  return {
    price: q.price,
    changePct: q.changePct != null && Number.isFinite(q.changePct) ? q.changePct : null,
    loading: false,
    isClosing: false,
  };
}

async function fetchBatchQuotes(symbols: readonly string[]): Promise<Record<string, TickerQuoteState>> {
  if (symbols.length === 0) return {};
  const res = await safeJsonFetch<BatchQuotesResponse>(
    `/api/investment/batch-quotes?symbols=${encodeURIComponent(symbols.join(","))}`,
  );
  if (!res.ok || !res.data?.quotes) return {};
  const out: Record<string, TickerQuoteState> = {};
  for (const symbol of symbols) {
    out[symbol] = mapBatchQuote(res.data.quotes[symbol]);
  }
  return out;
}

function TickerRow({
  ticker,
  quote,
  onAnalyze,
}: {
  ticker: MarketTicker;
  quote: TickerQuoteState;
  onAnalyze: (ticker: MarketTicker) => void;
}) {
  return (
    <li className={styles.tickerRow}>
      <div className={styles.tickerMain}>
        <span className={styles.tickerSymbol}>{ticker.symbol}</span>
        <span className={styles.tickerName}>{ticker.name}</span>
      </div>
      <div className={styles.tickerMetrics}>
        {quote.loading ? (
          <span className={styles.priceLoading} aria-busy="true">
            —
          </span>
        ) : quote.price == null ? (
          <span className={styles.priceClosed}>—</span>
        ) : (
          <>
            <div className={styles.priceRow}>
              {quote.isClosing ? <span className={styles.priceLabel}>Cierre</span> : null}
              <span className={styles.priceValue}>${formatPrice(quote.price)}</span>
            </div>
            <span className={changeClass(quote.changePct)}>
              {quote.changePct != null ? formatChangePct(quote.changePct) : "—"}
            </span>
          </>
        )}
      </div>
      <button
        type="button"
        className={styles.analyzeBtn}
        onClick={() => onAnalyze(ticker)}
      >
        Analizar
      </button>
    </li>
  );
}

function RegionCard({
  region,
  quotes,
  filter,
  onAnalyze,
}: {
  region: MarketRegion;
  quotes: Record<string, TickerQuoteState>;
  filter: string;
  onAnalyze: (ticker: MarketTicker) => void;
}) {
  const q = filter.trim().toLowerCase();
  const visibleTickers = region.tickers.filter((ticker) => {
    if (!q) return true;
    const hay = `${ticker.symbol} ${ticker.name}`.toLowerCase();
    return hay.includes(q);
  });

  if (visibleTickers.length === 0) return null;

  return (
    <article className={styles.regionCard} aria-label={region.name}>
      <header className={styles.regionHeader}>
        <div className={styles.regionHeaderMain}>
          <h2 className={styles.regionTitle}>{region.name}</h2>
          <p className={styles.regionHours}>{region.hoursLabel}</p>
        </div>
        <span className={styles.regionCount}>{visibleTickers.length}</span>
      </header>
      <ul className={styles.tickerList}>
        {visibleTickers.map((ticker) => (
          <TickerRow
            key={ticker.symbol}
            ticker={ticker}
            quote={quotes[ticker.symbol] ?? emptyQuote(true)}
            onAnalyze={onAnalyze}
          />
        ))}
      </ul>
    </article>
  );
}

export function MarketsRegionalDashboard() {
  const [query, setQuery] = useState("");
  const [quotes, setQuotes] = useState<Record<string, TickerQuoteState>>(() => {
    const known = readLastKnown<Record<string, TickerQuoteState>>(LAST_KNOWN_KEY);
    if (known) {
      return Object.fromEntries(
        ALL_MARKET_TICKERS.map((t) => {
          const q = known[t.symbol];
          if (q?.price != null) return [t.symbol, { ...q, loading: false, isClosing: true }];
          return [t.symbol, emptyQuote(true)];
        }),
      );
    }
    return Object.fromEntries(ALL_MARKET_TICKERS.map((t) => [t.symbol, emptyQuote(true)]));
  });
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [analysisTicker, setAnalysisTicker] = useState<MarketTicker | null>(null);
  const inFlight = useRef(false);

  const applyQuotes = useCallback(
    (incoming: Record<string, TickerQuoteState>, symbols: readonly string[]) => {
      setQuotes((prev) => {
        const next = { ...prev };
        for (const symbol of symbols) {
          const fetched = incoming[symbol];
          const cached = prev[symbol];
          if (fetched && fetched.price != null) {
            next[symbol] = fetched;
          } else if (cached?.price != null) {
            next[symbol] = {
              price: cached.price,
              changePct: cached.changePct,
              loading: false,
              isClosing: true,
            };
          } else {
            next[symbol] =
              fetched ?? { price: null, changePct: null, loading: false, isClosing: false };
          }
        }
        writeLastKnown(LAST_KNOWN_KEY, next);
        return next;
      });
    },
    [],
  );

  const refreshQuotes = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    const all = ALL_MARKET_TICKERS.map((t) => t.symbol);
    const prioritySet = new Set<string>(MARKETS_PRIORITY_SYMBOLS);
    const priority = all.filter((s) => prioritySet.has(s));
    const rest = all.filter((s) => !prioritySet.has(s));

    try {
      setQuotes((prev) => {
        const next = { ...prev };
        for (const symbol of priority) {
          const existing = next[symbol] ?? emptyQuote();
          if (existing.price == null) next[symbol] = { ...existing, loading: true };
        }
        return next;
      });

      const first = await fetchBatchQuotes(priority);
      applyQuotes(first, priority);
      setLastUpdated(new Date().toISOString());

      if (rest.length > 0) {
        setQuotes((prev) => {
          const next = { ...prev };
          for (const symbol of rest) {
            const existing = next[symbol] ?? emptyQuote();
            if (existing.price == null) next[symbol] = { ...existing, loading: true };
          }
          return next;
        });
        const second = await fetchBatchQuotes(rest);
        applyQuotes(second, rest);
        setLastUpdated(new Date().toISOString());
      }
    } finally {
      inFlight.current = false;
    }
  }, [applyQuotes]);

  useEffect(() => {
    void refreshQuotes();
    const pollMs = getDataRefreshPolicy().pollMs;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      void refreshQuotes();
    }, pollMs);
    const onVis = () => {
      if (document.visibilityState === "visible") void refreshQuotes();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refreshQuotes]);

  const visibleRegions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MARKET_REGIONS;
    return MARKET_REGIONS.filter((region) =>
      region.tickers.some((ticker) => {
        const hay = `${ticker.symbol} ${ticker.name}`.toLowerCase();
        return hay.includes(q);
      }),
    );
  }, [query]);

  const hasVisibleTickers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return ALL_MARKET_TICKERS.some((ticker) => {
      const hay = `${ticker.symbol} ${ticker.name}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  const searchHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return ALL_MARKET_TICKERS.filter((ticker) => {
      const hay = `${ticker.symbol} ${ticker.name}`.toLowerCase();
      return hay.includes(q);
    }).slice(0, 8);
  }, [query]);

  return (
    <>
      <section className={styles.dashboard} aria-label="Mercados por región">
        <div className={styles.searchSection}>
          <label className={styles.searchLabel} htmlFor="markets-search">
            Buscar ticker
          </label>
          <div className={styles.searchRow}>
            <input
              id="markets-search"
              className={styles.searchInput}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="SPY, AAPL, NVDA…"
              autoComplete="off"
              aria-label="Buscar ticker en todas las regiones"
            />
            <button type="button" className={styles.refreshBtn} onClick={() => void refreshQuotes()}>
              Actualizar
            </button>
          </div>
          {searchHits.length > 0 ? (
            <ul className={styles.searchHits} role="listbox" aria-label="Resultados de búsqueda">
              {searchHits.map((hit) => (
                <li key={hit.symbol}>
                  <button
                    type="button"
                    className={styles.searchHit}
                    onClick={() => setQuery(hit.symbol)}
                  >
                    <span className={styles.searchHitSymbol}>{hit.symbol}</span>
                    <span>{hit.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {lastUpdated ? (
            <p className={styles.meta}>
              Última actualización {new Date(lastUpdated).toLocaleTimeString()} · lote Yahoo · top
              10 primero
            </p>
          ) : (
            <p className={styles.meta}>Cargando cotizaciones…</p>
          )}
        </div>

        {!hasVisibleTickers ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Sin resultados</p>
            <p className={styles.emptyBody}>
              No hay tickers que coincidan con &ldquo;{query.trim()}&rdquo;. Prueba otro símbolo o
              nombre.
            </p>
          </div>
        ) : (
          <>
            <SectorHeatmap />
            <div className={styles.regionGrid}>
              {visibleRegions.map((region) => (
                <RegionCard
                  key={region.id}
                  region={region}
                  quotes={quotes}
                  filter={query}
                  onAnalyze={setAnalysisTicker}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <MarketsAnalysisPanel
        ticker={analysisTicker}
        open={analysisTicker != null}
        onClose={() => setAnalysisTicker(null)}
      />
    </>
  );
}
