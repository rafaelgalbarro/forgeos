"use client";

import { useMemo, useState, type ReactNode } from "react";
import styles from "@/styles/investment/workspace.module.css";
import { isEuropeTicker } from "@/lib/market-data/europe-indices";
import type { OpportunityCenterItem, OpportunitySide } from "@/lib/investment/opportunity-center";

export type OppSideFilter = OpportunitySide | "ALL";
export type OppScoreFilter = 0 | 40 | 60 | 80;
export type OppMarketFilter = "ALL" | "US" | "EU";
export type OppUrgencyFilter = "ALL" | "HIGH" | "MEDIUM" | "LOW";
export type OppUrgency = "HIGH" | "MEDIUM" | "LOW";

export type OpportunityFiltersState = {
  side: OppSideFilter;
  minScore: OppScoreFilter;
  market: OppMarketFilter;
  urgency: OppUrgencyFilter;
  tickerQuery: string;
};

export const DEFAULT_OPPORTUNITY_FILTERS: OpportunityFiltersState = {
  side: "ALL",
  minScore: 0,
  market: "ALL",
  urgency: "ALL",
  tickerQuery: "",
};

export function resolveMarket(ticker: string, mercado?: string): "US" | "EU" {
  if (isEuropeTicker(ticker)) return "EU";
  if (mercado && /europe|eu\b|stoxx|ibex|dax|cac|ftse/i.test(mercado)) return "EU";
  return "US";
}

export function resolveUrgency(score: number, confidence?: number, escalate?: boolean): OppUrgency {
  if (escalate || score >= 80 || (confidence != null && confidence >= 0.8)) return "HIGH";
  if (score >= 60 || (confidence != null && confidence >= 0.6)) return "MEDIUM";
  return "LOW";
}

export function filterOpportunityItems(
  items: readonly OpportunityCenterItem[],
  filters: OpportunityFiltersState,
): OpportunityCenterItem[] {
  const q = filters.tickerQuery.trim().toUpperCase();
  return items.filter((item) => {
    if (filters.side !== "ALL" && item.side !== filters.side) return false;
    if (item.score < filters.minScore) return false;
    const market = resolveMarket(item.activo, item.mercado);
    if (filters.market !== "ALL" && market !== filters.market) return false;
    const urgency = resolveUrgency(item.score, item.confianza, item.escalateToCommittee);
    if (filters.urgency !== "ALL" && urgency !== filters.urgency) return false;
    if (q && !item.activo.toUpperCase().includes(q)) return false;
    return true;
  });
}

export function filterEnhancedOpportunities<
  T extends { ticker: string; score: number; side: OpportunitySide },
>(items: readonly T[], filters: OpportunityFiltersState): T[] {
  const q = filters.tickerQuery.trim().toUpperCase();
  return items.filter((item) => {
    if (filters.side !== "ALL" && item.side !== filters.side) return false;
    if (item.score < filters.minScore) return false;
    const market = resolveMarket(item.ticker);
    if (filters.market !== "ALL" && market !== filters.market) return false;
    const urgency = resolveUrgency(item.score);
    if (filters.urgency !== "ALL" && urgency !== filters.urgency) return false;
    if (q && !item.ticker.toUpperCase().includes(q)) return false;
    return true;
  });
}

type Props = {
  filters: OpportunityFiltersState;
  onChange: (next: OpportunityFiltersState) => void;
  shown: number;
  total: number;
  tickerSuggestions: readonly string[];
  sortControl?: ReactNode;
};

function Pill({
  active,
  tone,
  children,
  onClick,
}: {
  active: boolean;
  tone?: "buy" | "sell" | "hold" | "neutral";
  children: React.ReactNode;
  onClick: () => void;
}) {
  const toneClass =
    tone === "buy"
      ? styles.oppPillBuy
      : tone === "sell"
        ? styles.oppPillSell
        : tone === "hold"
          ? styles.oppPillHold
          : styles.oppPillNeutral;
  return (
    <button
      type="button"
      className={`${styles.oppPill} ${toneClass} ${active ? styles.oppPillActive : ""}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function OpportunityFilterBar({
  filters,
  onChange,
  shown,
  total,
  tickerSuggestions,
  sortControl,
}: Props) {
  const [suggestOpen, setSuggestOpen] = useState(false);

  const suggestions = useMemo(() => {
    const q = filters.tickerQuery.trim().toUpperCase();
    if (!q) return tickerSuggestions.slice(0, 8);
    return tickerSuggestions.filter((t) => t.toUpperCase().includes(q)).slice(0, 8);
  }, [filters.tickerQuery, tickerSuggestions]);

  return (
    <div className={styles.oppFilterBar} aria-label="Filtros de oportunidades">
      <div className={styles.oppFilterRow}>
        <span className={styles.oppFilterLabel}>Side</span>
        <div className={styles.oppPillGroup}>
          <Pill
            active={filters.side === "BUY"}
            tone="buy"
            onClick={() => onChange({ ...filters, side: "BUY" })}
          >
            🟢 BUY
          </Pill>
          <Pill
            active={filters.side === "SELL"}
            tone="sell"
            onClick={() => onChange({ ...filters, side: "SELL" })}
          >
            🔴 SELL
          </Pill>
          <Pill
            active={filters.side === "HOLD"}
            tone="hold"
            onClick={() => onChange({ ...filters, side: "HOLD" })}
          >
            ⚪ HOLD
          </Pill>
          <Pill
            active={filters.side === "ALL"}
            onClick={() => onChange({ ...filters, side: "ALL" })}
          >
            ⭐ TODOS
          </Pill>
        </div>
      </div>

      <div className={styles.oppFilterRow}>
        <span className={styles.oppFilterLabel}>Score</span>
        <div className={styles.oppPillGroup}>
          {([0, 40, 60, 80] as const).map((min) => (
            <Pill
              key={min}
              active={filters.minScore === min}
              onClick={() => onChange({ ...filters, minScore: min })}
            >
              {min === 0 ? "Todos" : `Score >${min}`}
            </Pill>
          ))}
        </div>
      </div>

      <div className={styles.oppFilterRow}>
        <span className={styles.oppFilterLabel}>Mercado</span>
        <div className={styles.oppPillGroup}>
          <Pill
            active={filters.market === "US"}
            onClick={() => onChange({ ...filters, market: "US" })}
          >
            🇺🇸 USA
          </Pill>
          <Pill
            active={filters.market === "EU"}
            onClick={() => onChange({ ...filters, market: "EU" })}
          >
            🇪🇺 Europa
          </Pill>
          <Pill
            active={filters.market === "ALL"}
            onClick={() => onChange({ ...filters, market: "ALL" })}
          >
            🌍 Todos
          </Pill>
        </div>
      </div>

      <div className={styles.oppFilterRow}>
        <span className={styles.oppFilterLabel}>Urgencia</span>
        <div className={styles.oppPillGroup}>
          <Pill
            active={filters.urgency === "HIGH"}
            tone="sell"
            onClick={() => onChange({ ...filters, urgency: "HIGH" })}
          >
            🔥 HIGH
          </Pill>
          <Pill
            active={filters.urgency === "MEDIUM"}
            onClick={() => onChange({ ...filters, urgency: "MEDIUM" })}
          >
            ⚡ MEDIUM
          </Pill>
          <Pill
            active={filters.urgency === "LOW"}
            tone="hold"
            onClick={() => onChange({ ...filters, urgency: "LOW" })}
          >
            📊 LOW
          </Pill>
          <Pill
            active={filters.urgency === "ALL"}
            onClick={() => onChange({ ...filters, urgency: "ALL" })}
          >
            Todas
          </Pill>
        </div>
      </div>

      <div className={styles.oppFilterRow}>
        <span className={styles.oppFilterLabel}>Ticker</span>
        <div className={styles.oppSearchWrap}>
          <input
            className={styles.oppSearchInput}
            type="search"
            placeholder="Buscar ticker…"
            value={filters.tickerQuery}
            autoComplete="off"
            onChange={(e) => {
              onChange({ ...filters, tickerQuery: e.target.value.toUpperCase() });
              setSuggestOpen(true);
            }}
            onFocus={() => setSuggestOpen(true)}
            onBlur={() => window.setTimeout(() => setSuggestOpen(false), 150)}
            aria-label="Buscar por ticker"
          />
          {suggestOpen && suggestions.length > 0 ? (
            <ul className={styles.oppSuggestList} role="listbox">
              {suggestions.map((t) => (
                <li key={t}>
                  <button
                    type="button"
                    className={styles.oppSuggestItem}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange({ ...filters, tickerQuery: t });
                      setSuggestOpen(false);
                    }}
                  >
                    {t}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {sortControl}
        <p className={styles.oppFilterCount}>
          Mostrando <strong>{shown}</strong> de <strong>{total}</strong> oportunidades
        </p>
      </div>
    </div>
  );
}
