"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
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

const POLL_MS = 8_000;

function badgeLabel(badge: string): string {
  switch (badge) {
    case "INSIDER BUY":
      return "🔴 INSIDER BUY";
    case "SHORT SQUEEZE":
      return "🟡 SHORT SQUEEZE";
    case "OPTIONS FLOW":
      return "🟣 OPTIONS FLOW";
    case "CATALYST":
      return "🟢 CATALYST";
    case "GAP UP":
      return "⚡ GAP UP";
    case "GAP DOWN":
      return "⚡ GAP DOWN";
    case "MOMENTUM":
      return "📈 MOMENTUM";
    default:
      return badge;
  }
}

function badgeClassName(badge: string): string {
  if (badge === "MACRO CAUTION" || badge === "GAP DOWN") return styles.oppInstBadgeCaution;
  if (badge === "INSIDER BUY" || badge === "CATALYST" || badge === "GAP UP") return styles.oppInstBadgeBull;
  if (badge === "SHORT SQUEEZE") return styles.oppInstBadgeSqueeze;
  if (badge === "OPTIONS FLOW") return styles.oppInstBadgeFlow;
  if (badge === "MOMENTUM") return styles.oppInstBadgeMomentum;
  return styles.oppInstBadgeNeutral;
}

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

function FieldValue({ value, digits }: { value: number | string; digits?: number }) {
  const text = fmtField(value, digits);
  if (text === OPPORTUNITY_CENTER_NO_DATA) {
    return <span className={styles.oppNoData}>{OPPORTUNITY_CENTER_NO_DATA}</span>;
  }
  return <>{text}</>;
}

export function OpportunityScannerDashboard() {
  const [payload, setPayload] = useState<CenterApiResponse | null>(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [sortId, setSortId] = useState<OpportunityCenterSortId>("mayor_score");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, setTimeTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTimeTick((n) => n + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function refresh() {
      const result = await safeJsonFetch<CenterApiResponse>("/api/investment/opportunities", {
        cache: "no-store",
      });
      if (!result.ok || !result.data) throw new Error(result.error ?? "Opportunity Center unavailable");
      if (!cancelled) {
        setPayload(result.data);
        setError(result.data.error ?? "");
        setLoaded(true);
        setSelectedId((prev) => {
          const list = result.data?.opportunities ?? [];
          if (prev && list.some((o) => o.id === prev)) return prev;
          return list[0]?.id ?? null;
        });
      }
    }

    refresh()
      .then(() => {
        timer = setInterval(() => {
          refresh().catch((nextError) =>
            setError(nextError instanceof Error ? nextError.message : "Refresh failed"),
          );
        }, POLL_MS);
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

  const sorted = useMemo(() => {
    const items = payload?.opportunities ?? [];
    return sortOpportunityCenterItems(items, sortId);
  }, [payload?.opportunities, sortId]);

  const selected = useMemo(
    () => sorted.find((o) => o.id === selectedId) ?? sorted[0] ?? null,
    [sorted, selectedId],
  );

  const quality = payload?.qualityFilter ?? OPPORTUNITY_QUALITY_FILTER;
  const sortOptions = payload?.sortOptions ?? OPPORTUNITY_CENTER_SORT_OPTIONS;

  const systemActive = loaded && !error && payload != null;
  const opportunitiesToday =
    payload?.scannedAt && isToday(payload.scannedAt) ? (payload.count ?? sorted.length) : 0;
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

      {(payload?.enhancedScan?.opportunities?.length ?? 0) > 0 ? (
        <div className={styles.oppEnhancedSection}>
          <h2 className={styles.oppEnhancedTitle}>Scanner multi-fuente (confluencia técnica + noticias)</h2>
          <div className={styles.oppEnhancedGrid}>
            {payload!.enhancedScan!.opportunities.slice(0, 6).map((opp) => (
              <article key={opp.ticker} className={styles.oppEnhancedCard}>
                <header className={styles.oppEnhancedHead}>
                  <strong>{opp.ticker}</strong>
                  <span className={sideClass(opp.side)}>{opp.side}</span>
                  <span className={styles.oppEnhancedScore}>Score {opp.score}</span>
                </header>
                {(opp.confluenceLabel ||
                opp.primaryTimeframe ||
                opp.higherTfConfirmation ||
                (opp.badges?.length ?? 0) > 0) ? (
                  <div className={styles.oppInstitutionalBadges}>
                    {opp.confluenceLabel ? (
                      <span
                        className={
                          opp.mtfHighConfidence
                            ? styles.oppInstBadgeBull
                            : opp.mtfWeakSignal
                              ? styles.oppInstBadgeCaution
                              : styles.oppInstBadgeNeutral
                        }
                      >
                        {opp.confluenceLabel}
                      </span>
                    ) : null}
                    {opp.primaryTimeframe ? (
                      <span className={styles.oppInstBadgeNeutral}>TF {opp.primaryTimeframe}</span>
                    ) : null}
                    {opp.higherTfConfirmation ? (
                      <span className={styles.oppInstBadgeBull}>TF↑ confirm</span>
                    ) : null}
                    {(opp.badges?.length ?? 0) > 0
                      ? opp.badges!.map((badge) => (
                          <span key={badge} className={badgeClassName(badge)}>
                            {badgeLabel(badge)}
                          </span>
                        ))
                      : null}
                  </div>
                ) : null}
                <ul className={styles.oppEnhancedSignals}>
                  {opp.signals.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <p className={styles.oppEnhancedLevels}>
                  Entry ${opp.entry.toFixed(2)} · SL ${opp.stopLoss.toFixed(2)} · TP ${opp.takeProfit.toFixed(2)}
                </p>
                {opp.news.length > 0 ? (
                  <p className={styles.oppEnhancedNews}>{opp.news[0]!.title}</p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <p className={styles.oppError}>{error}</p> : null}

      <div className={styles.oppControls}>
        <label>
          Ordenar por
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
      </div>

      <div className={styles.oppLayout}>
        <div className={styles.oppTableWrap}>
          {sorted.length === 0 ? (
            <p className={styles.oppEmpty}>
              No high-quality (A+/A) opportunities right now. Scanner candidates:{" "}
              {payload?.candidates?.length ?? 0}. Auto-refresh every {POLL_MS / 1000}s.
            </p>
          ) : (
            <table className={styles.oppTable}>
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Research</th>
                  <th>Mercado</th>
                  <th>Tipo</th>
                  <th>Side</th>
                  <th>Confianza</th>
                  <th>Score</th>
                  <th>Rentab.</th>
                  <th>Riesgo</th>
                  <th>Horizonte</th>
                  <th>Prob.</th>
                  <th>Capital</th>
                  <th>SL</th>
                  <th>TP</th>
                  <th>R:R</th>
                  <th>Liquidez</th>
                  <th>Vol</th>
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
                    <td>
                      <Link
                        href={row.researchHref}
                        className={styles.labInlineLink}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Dossier
                      </Link>
                    </td>
                    <td>{row.mercado}</td>
                    <td>{row.tipo}</td>
                    <td className={sideClass(row.side)}>{row.side}</td>
                    <td>{fmtField(row.confianza, 2)}</td>
                    <td>{fmtField(row.score, 1)}</td>
                    <td>
                      <FieldValue value={row.rentabilidadEsperada} />
                    </td>
                    <td>
                      <FieldValue value={row.riesgo} />
                      {row.riesgoPct !== OPPORTUNITY_CENTER_NO_DATA ? (
                        <span className={styles.oppNoData}> ({fmtField(row.riesgoPct)}%)</span>
                      ) : null}
                    </td>
                    <td>
                      <FieldValue value={row.horizonteTemporal} />
                    </td>
                    <td>
                      <FieldValue value={row.probabilidad} />
                    </td>
                    <td>
                      <FieldValue value={row.capitalRecomendado} />
                    </td>
                    <td>
                      <FieldValue value={row.stopLoss} digits={4} />
                    </td>
                    <td>
                      <FieldValue value={row.takeProfit} digits={4} />
                    </td>
                    <td>
                      <FieldValue value={row.ratioRiesgoBeneficio} />
                    </td>
                    <td>
                      <FieldValue value={row.liquidez} />
                    </td>
                    <td>
                      <FieldValue value={row.volatilidad} />
                    </td>
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
