"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import { MarketsAnalysisPanel } from "./MarketsAnalysisPanel";
import { SectorHeatmap } from "./SectorHeatmap";
import {
  ALL_MARKET_TICKERS,
  MARKET_REGIONS,
  MARKETS_POLL_MS,
  type IbkrPricePayload,
  type MarketRegion,
  type MarketTicker,
  type TickerQuoteState,
} from "./markets-regional.types";
import styles from "@/styles/investment/markets-regional.module.css";

function emptyQuote(loading = true): TickerQuoteState {
  return { price: null, changePct: null, loading, isClosing: false };
}

function dailyChangePct(currentPrice: number, change1d: number): number | null {
  const prevClose = currentPrice - change1d;
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return null;
  if (!Number.isFinite(prevClose) || prevClose <= 0) return null;
  const pct = (change1d / prevClose) * 100;
  return Number.isFinite(pct) ? pct : null;
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

function resolveQuoteFromPayload(data: IbkrPricePayload): TickerQuoteState {
  const currentPrice = Number(data.currentPrice);
  const previousClose = Number(data.previousClose);
  const change1d = Number(data.change1d ?? 0);

  const livePrice =
    Number.isFinite(currentPrice) && currentPrice > 0 ? currentPrice : null;
  const closingPrice =
    Number.isFinite(previousClose) && previousClose > 0 ? previousClose : livePrice;

  if (livePrice != null) {
    return {
      price: livePrice,
      changePct: dailyChangePct(livePrice, change1d),
      loading: false,
      isClosing: false,
    };
  }

  if (closingPrice != null) {
    return {
      price: closingPrice,
      changePct: dailyChangePct(closingPrice, change1d),
      loading: false,
      isClosing: true,
    };
  }

  return { price: null, changePct: null, loading: false, isClosing: false };
}

async function fetchTickerQuote(symbol: string): Promise<TickerQuoteState> {
  const res = await safeJsonFetch<IbkrPricePayload>(
    `/api/trading/ibkr?action=price&ticker=${encodeURIComponent(symbol)}`,
  );

  if (!res.ok || !res.data) {
    return { price: null, changePct: null, loading: false, isClosing: false };
  }

  return resolveQuoteFromPayload(res.data);
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
  const [quotes, setQuotes] = useState<Record<string, TickerQuoteState>>(() =>
    Object.fromEntries(ALL_MARKET_TICKERS.map((t) => [t.symbol, emptyQuote(true)])),
  );
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [analysisTicker, setAnalysisTicker] = useState<MarketTicker | null>(null);

  const refreshQuotes = useCallback(async () => {
    const symbols = ALL_MARKET_TICKERS.map((t) => t.symbol);
    setQuotes((prev) => {
      const next = { ...prev };
      for (const symbol of symbols) {
        const existing = next[symbol] ?? emptyQuote();
        next[symbol] = { ...existing, loading: true };
      }
      return next;
    });

    const results = await Promise.all(
      symbols.map(async (symbol) => [symbol, await fetchTickerQuote(symbol)] as const),
    );

    setQuotes((prev) => {
      const next = Object.fromEntries(results);
      for (const symbol of symbols) {
        const fetched = next[symbol];
        const cached = prev[symbol];
        if (fetched.price == null && cached?.price != null) {
          next[symbol] = {
            price: cached.price,
            changePct: cached.changePct,
            loading: false,
            isClosing: true,
          };
        }
      }
      return next;
    });
    setLastUpdated(new Date().toISOString());
  }, []);

  useEffect(() => {
    void refreshQuotes();
    const id = window.setInterval(() => {
      if (document.hidden) return;
      void refreshQuotes();
    }, MARKETS_POLL_MS);
    return () => window.clearInterval(id);
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
              Última actualización {new Date(lastUpdated).toLocaleTimeString()}
            </p>
          ) : null}
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
