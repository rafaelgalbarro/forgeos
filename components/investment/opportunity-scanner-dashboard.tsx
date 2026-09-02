"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import { readLastKnown, writeLastKnown } from "@/lib/investment/client-last-known";
import { getDataRefreshPolicy } from "@/lib/market-data/refresh-policy";
import {
  OPPORTUNITY_CENTER_NO_DATA,
  OPPORTUNITY_CENTER_SORT_OPTIONS,
  OPPORTUNITY_QUALITY_FILTER,
  sortOpportunityCenterItems,
  type OpportunityCenterItem,
  type OpportunityCenterSnapshot,
  type OpportunityCenterSortId,
  type OpportunitySide,
} from "@/lib/investment/opportunity-center";
import {
  DEFAULT_OPPORTUNITY_FILTERS,
  filterEnhancedOpportunities,
  filterOpportunityItems,
  OpportunityFilterBar,
  type OpportunityFiltersState,
} from "@/components/investment/OpportunityFilterBar";
import {
  OpportunitySignalCard,
  type OpportunityCardModel,
} from "@/components/investment/OpportunitySignalCard";
import styles from "@/styles/investment/workspace.module.css";

type CenterApiResponse = OpportunityCenterSnapshot & {
  error?: string;
  enhancedScan?: {
    scannedAt: string;
    scanDurationMs: number;
    opportunities: Array<{
      ticker: string;
      score: number;
      signals: string[];
      entry: number;
      stopLoss: number;
      takeProfit: number;
      side: "BUY" | "SELL" | "HOLD";
      news: Array<{ title: string; source: string; sentiment: string; hoursAgo: number }>;
      badges?: Array<
        | "INSIDER BUY"
        | "SHORT SQUEEZE"
        | "OPTIONS FLOW"
        | "CATALYST"
        | "MACRO CAUTION"
        | "GAP UP"
        | "GAP DOWN"
        | "MOMENTUM"
      >;
      macroCaution24h?: boolean;
      confluenceLabel?: string;
      confluenceRatio?: string;
      primaryTimeframe?: "5m" | "1h" | "1d" | "1wk";
      higherTfConfirmation?: boolean;
      mtfHighConfidence?: boolean;
      mtfWeakSignal?: boolean;
    }>;
  };
};

const DENSITY_KEY = "forgeos-opp-density";
const OPP_LAST_KNOWN = "opportunities-center";

type DensityMode = "compact" | "expanded";

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function formatMinutesAgo(iso: string | undefined): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return "—";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "hace menos de 1 minuto";
  if (mins === 1) return "hace 1 minuto";
  return `hace ${mins} minutos`;
}

function fmtField(value: number | string | typeof OPPORTUNITY_CENTER_NO_DATA, digits = 2): string {
  if (value === OPPORTUNITY_CENTER_NO_DATA || value == null) return OPPORTUNITY_CENTER_NO_DATA;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return OPPORTUNITY_CENTER_NO_DATA;
    return value.toFixed(digits);
  }
  return String(value);
}

function sideClass(side: OpportunitySide): string {
  if (side === "BUY") return styles.oppSideBuy;
  if (side === "SELL") return styles.oppSideSell;
  return styles.oppSideHold;
}

function numField(value: number | string | typeof OPPORTUNITY_CENTER_NO_DATA): number | null {
  if (value === OPPORTUNITY_CENTER_NO_DATA || value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function toCenterCard(item: OpportunityCenterItem, isNew: boolean): OpportunityCardModel {
  return {
    id: item.id,
    ticker: item.activo,
    side: item.side,
    score: item.score,
    confidence: item.confianza,
    entry: null,
    stopLoss: numField(item.stopLoss),
    takeProfit: numField(item.takeProfit),
    grade: item.grade,
    mercado: item.mercado,
    researchHref: item.researchHref,
    signals: item.details
      .filter((d) => d.status !== "NO_DATA")
      .flatMap((d) => d.bullets.slice(0, 2))
      .slice(0, 4),
    isNew,
  };
}

export function OpportunityScannerDashboard() {
  const [payload, setPayload] = useState<CenterApiResponse | null>(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [sortId, setSortId] = useState<OpportunityCenterSortId>("mayor_score");
  const [filters, setFilters] = useState<OpportunityFiltersState>(DEFAULT_OPPORTUNITY_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, setTimeTick] = useState(0);
  const [freshIds, setFreshIds] = useState<Set<string>>(() => new Set());
  const [density, setDensity] = useState<DensityMode>("expanded");
  const seenIdsRef = useRef<Set<string>>(new Set());
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DENSITY_KEY);
      if (raw === "compact" || raw === "expanded") setDensity(raw);
    } catch {
      /* ignore */
    }
  }, []);

  function setDensityPersist(next: DensityMode) {
    setDensity(next);
    try {
      window.localStorage.setItem(DENSITY_KEY, next);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    const timer = setInterval(() => setTimeTick((n) => n + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function refresh(preferCache = true) {
      const result = await safeJsonFetch<CenterApiResponse>(
        `/api/investment/opportunities?preferCache=${preferCache ? "1" : "0"}&limit=20`,
        { cache: "no-store" },
      );
      if (!result.ok || !result.data) throw new Error(result.error ?? "Opportunity Center unavailable");
      if (!cancelled) {
        setPayload(result.data);
        writeLastKnown(OPP_LAST_KNOWN, result.data);
        setError(result.data.error ?? "");
        setLoaded(true);
        const list = (result.data?.opportunities ?? []).slice(0, 20);
        const enhanced = (result.data?.enhancedScan?.opportunities ?? []).slice(0, 20);
        const seen = seenIdsRef.current;
        if (!bootstrappedRef.current) {
          for (const o of list) seen.add(o.id);
          for (const o of enhanced) seen.add(`enh:${o.ticker}`);
          bootstrappedRef.current = true;
        } else {
          const fresh = new Set<string>();
          for (const o of list) {
            if (!seen.has(o.id)) {
              seen.add(o.id);
              fresh.add(o.id);
            }
          }
          for (const o of enhanced) {
            const key = `enh:${o.ticker}`;
            if (!seen.has(key)) {
              seen.add(key);
              fresh.add(key);
            }
          }
          if (fresh.size > 0) {
            setFreshIds(fresh);
            window.setTimeout(() => {
              setFreshIds((prev) => {
                if (prev.size === 0) return prev;
                const next = new Set(prev);
                for (const id of fresh) next.delete(id);
                return next;
              });
            }, 1200);
          }
        }
        setSelectedId((prev) => {
          if (prev && list.some((o) => o.id === prev)) return prev;
          return list[0]?.id ?? null;
        });
      }
    }

    const known = readLastKnown<CenterApiResponse>(OPP_LAST_KNOWN);
    if (known) {
      setPayload(known);
      setLoaded(true);
    }

    refresh(true)
      .then(() => {
        const pollMs = getDataRefreshPolicy().pollMs;
        timer = setInterval(() => {
          if (document.hidden) return;
          refresh(true).catch((nextError) =>
            setError(nextError instanceof Error ? nextError.message : "Refresh failed"),
          );
        }, pollMs);
      })
      .catch((initialError) => {
        setLoaded(true);
        setError(initialError instanceof Error ? initialError.message : "Cannot load Opportunity Center");
      });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, []);

  const totalOpportunities = payload?.opportunities?.length ?? 0;

  const sorted = useMemo(() => {
    const filtered = filterOpportunityItems(payload?.opportunities ?? [], filters);
    return sortOpportunityCenterItems(filtered, sortId).slice(0, 20);
  }, [payload?.opportunities, filters, sortId]);

  const enhancedFiltered = useMemo(() => {
    const raw = payload?.enhancedScan?.opportunities ?? [];
    return filterEnhancedOpportunities(raw, filters).slice(0, 20);
  }, [payload?.enhancedScan?.opportunities, filters]);

  const tickerSuggestions = useMemo(() => {
    const tickers = new Set<string>();
    for (const item of payload?.opportunities ?? []) tickers.add(item.activo);
    for (const item of payload?.enhancedScan?.opportunities ?? []) tickers.add(item.ticker);
    for (const candidate of payload?.candidates ?? []) {
      const symbol = candidate.instrument?.symbol;
      if (symbol) tickers.add(symbol);
    }
    return Array.from(tickers).sort((a, b) => a.localeCompare(b));
  }, [payload?.opportunities, payload?.enhancedScan?.opportunities, payload?.candidates]);

  const selected = useMemo(
    () => sorted.find((o) => o.id === selectedId) ?? sorted[0] ?? null,
    [sorted, selectedId],
  );

  const quality = payload?.qualityFilter ?? OPPORTUNITY_QUALITY_FILTER;
  const sortOptions = payload?.sortOptions ?? OPPORTUNITY_CENTER_SORT_OPTIONS;

  const systemActive = loaded && !error && payload != null;
  const opportunitiesToday =
    payload?.scannedAt && isToday(payload.scannedAt) ? (payload.count ?? totalOpportunities) : 0;
  const lastSearchLabel = formatMinutesAgo(payload?.scannedAt);

  return (
    <div className={styles.oppRoot}>
      <div className={styles.oppKpiBar}>
        <div className={styles.oppKpiCard}>
          <p className={styles.oppKpiLabel}>Estado del sistema</p>
          <p
            className={
              systemActive ? `${styles.oppKpiValue} ${styles.oppKpiActive}` : `${styles.oppKpiValue} ${styles.oppKpiStopped}`
            }
          >
            {systemActive ? "🟢 Sistema activo" : "🔴 Detenido"}
          </p>
        </div>
        <div className={styles.oppKpiCard}>
          <p className={styles.oppKpiLabel}>Oportunidades encontradas hoy</p>
          <p className={styles.oppKpiValue}>{opportunitiesToday}</p>
        </div>
        <div className={styles.oppKpiCard}>
          <p className={styles.oppKpiLabel}>Última búsqueda</p>
          <p className={styles.oppKpiValue}>{lastSearchLabel}</p>
        </div>
      </div>

      <p className={styles.oppFilterDoc}>
        Filtro: {quality.label} — {quality.description}
      </p>

      {enhancedFiltered.length > 0 ? (
        <div className={styles.oppEnhancedSection}>
          <h2 className={styles.oppEnhancedTitle}>Scanner multi-fuente (confluencia técnica + noticias)</h2>
          <div className={styles.oppCardGrid}>
            {enhancedFiltered.map((opp) => (
              <OpportunitySignalCard
                key={opp.ticker}
                model={{
                  id: `enh:${opp.ticker}`,
                  ticker: opp.ticker,
                  side: opp.side,
                  score: opp.score,
                  entry: opp.entry,
                  stopLoss: opp.stopLoss,
                  takeProfit: opp.takeProfit,
                  signals: opp.signals,
                  badges: opp.badges,
                  newsTitle: opp.news[0]?.title,
                  confluenceLabel: opp.confluenceLabel,
                  isNew: freshIds.has(`enh:${opp.ticker}`),
                }}
                onSelect={() => setSelectedId(null)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {error ? <p className={styles.oppError}>{error}</p> : null}

      <OpportunityFilterBar
        filters={filters}
        onChange={setFilters}
        shown={sorted.length}
        total={totalOpportunities}
        tickerSuggestions={tickerSuggestions}
        sortControl={
          <>
            <div className={styles.oppDensityToggle} role="group" aria-label="Densidad de vista">
              <button
                type="button"
                className={density === "compact" ? styles.oppDensityActive : styles.oppDensityBtn}
                aria-pressed={density === "compact"}
                onClick={() => setDensityPersist("compact")}
              >
                Compacto
              </button>
              <button
                type="button"
                className={density === "expanded" ? styles.oppDensityActive : styles.oppDensityBtn}
                aria-pressed={density === "expanded"}
                onClick={() => setDensityPersist("expanded")}
              >
                Expandido
              </button>
            </div>
            <label className={styles.oppSortLabel}>
              Ordenar
              <select
                value={sortId}
                onChange={(e) => setSortId(e.target.value as OpportunityCenterSortId)}
              >
                {sortOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        }
      />

      <div className={styles.oppLayout}>
        <div className={styles.oppTableWrap} data-density={density}>
          {sorted.length === 0 ? (
            <p className={styles.oppEmpty}>
              {totalOpportunities === 0
                ? `No high-quality (A+/A) opportunities right now. Scanner candidates: ${payload?.candidates?.length ?? 0}. Auto-refresh adapts to market hours (5m open / 30m closed).`
                : `Ninguna oportunidad coincide con los filtros (${totalOpportunities} en total). Ajusta side, score, mercado o ticker.`}
            </p>
          ) : density === "expanded" ? (
            <div className={styles.oppCardGrid}>
              {sorted.map((row) => (
                <OpportunitySignalCard
                  key={row.id}
                  model={toCenterCard(row, freshIds.has(row.id))}
                  selected={selected?.id === row.id}
                  onSelect={() => setSelectedId(row.id)}
                  onExpandAnalysis={() => setSelectedId(row.id)}
                />
              ))}
            </div>
          ) : (
            <table className={styles.oppTable}>
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Side</th>
                  <th>Score</th>
                  <th>Conf.</th>
                  <th>Mercado</th>
                  <th>SL</th>
                  <th>TP</th>
                  <th>R:R</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr
                    key={row.id}
                    data-active={selected?.id === row.id ? "true" : "false"}
                    onClick={() => setSelectedId(row.id)}
                  >
                    <td>
                      <strong>{row.activo}</strong>{" "}
                      <span className={styles.oppNoData}>{row.grade}</span>
                    </td>
                    <td className={sideClass(row.side)}>{row.side}</td>
                    <td data-numeric="true">{fmtField(row.score, 1)}</td>
                    <td data-numeric="true">{fmtField(row.confianza, 2)}</td>
                    <td>{row.mercado}</td>
                    <td data-numeric="true">{fmtField(row.stopLoss, 4)}</td>
                    <td data-numeric="true">{fmtField(row.takeProfit, 4)}</td>
                    <td data-numeric="true">{fmtField(row.ratioRiesgoBeneficio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <aside className={styles.oppDetail}>
          {selected ? <OpportunityDetailPanel item={selected} /> : (
            <p className={styles.oppEmpty}>Select an opportunity for detail sections.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function OpportunityDetailPanel({ item }: { item: OpportunityCenterItem }) {
  return (
    <>
      <div className={styles.oppDetailHead}>
        <h2>
          {item.activo}{" "}
          <span className={sideClass(item.side)}>{item.side}</span>
        </h2>
        <span className={styles.oppBadgeOk}>{item.grade}</span>
        <span className={styles.oppBadge}>ANALYSIS_ONLY</span>
        <Link href={item.researchHref} className={styles.labInlineLink}>
          Open research dossier
        </Link>
      </div>

      <div className={styles.oppDetailGrid}>
        <DetailField label="Activo" value={item.activo} />
        <DetailField label="Mercado" value={item.mercado} />
        <DetailField label="Tipo" value={item.tipo} />
        <DetailField label="BUY/SELL/HOLD" value={item.side} />
        <DetailField label="Confianza" value={fmtField(item.confianza)} />
        <DetailField label="Score" value={fmtField(item.score, 1)} />
        <DetailField label="Rentabilidad esperada" value={fmtField(item.rentabilidadEsperada)} />
        <DetailField
          label="Riesgo"
          value={
            item.riesgo === OPPORTUNITY_CENTER_NO_DATA
              ? OPPORTUNITY_CENTER_NO_DATA
              : `${item.riesgo}${item.riesgoPct !== OPPORTUNITY_CENTER_NO_DATA ? ` (${fmtField(item.riesgoPct)}%)` : ""}`
          }
        />
        <DetailField label="Horizonte temporal" value={fmtField(item.horizonteTemporal)} />
        <DetailField label="Probabilidad" value={fmtField(item.probabilidad)} />
        <DetailField label="Capital recomendado" value={fmtField(item.capitalRecomendado)} />
        <DetailField label="Stop Loss" value={fmtField(item.stopLoss, 4)} />
        <DetailField label="Take Profit" value={fmtField(item.takeProfit, 4)} />
        <DetailField label="Ratio Riesgo Beneficio" value={fmtField(item.ratioRiesgoBeneficio)} />
        <DetailField label="Liquidez" value={fmtField(item.liquidez)} />
        <DetailField label="Volatilidad" value={fmtField(item.volatilidad)} />
      </div>

      {item.details.map((section) => (
        <div key={section.id} className={styles.oppSection}>
          <h3>
            {section.title}{" "}
            {section.status === "NO_DATA" ? (
              <span className={styles.oppNoData}>NO_DATA</span>
            ) : null}
          </h3>
          {section.status === "NO_DATA" ? (
            <p className={styles.oppNoData}>{OPPORTUNITY_CENTER_NO_DATA}</p>
          ) : (
            <>
              <p className={section.id.includes("ai") || /explain|raz[oó]n|thesis/i.test(section.title) ? styles.oppAiExplain : undefined}>
                {section.summary}
              </p>
              {section.bullets.length > 1 ? (
                <ul>
                  {section.bullets.slice(1).map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </div>
      ))}
    </>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.oppDetailField}>
      <span>{label}</span>
      <strong>
        {value === OPPORTUNITY_CENTER_NO_DATA ? (
          <span className={styles.oppNoData}>{OPPORTUNITY_CENTER_NO_DATA}</span>
        ) : (
          value
        )}
      </strong>
    </div>
  );
}
