"use client";

import { useEffect, useRef, useState } from "react";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import type { LongTermPortfolioSnapshot } from "@/lib/investment/long-term-portfolio.types";
import { VALUE_SCREEN_CRITERIA } from "@/lib/investment/long-term-portfolio.types";
import styles from "@/styles/investment/long-term-portfolio.module.css";

const POLL_MS = 120_000;

function fmtNum(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "NO_DATA";
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "NO_DATA";
  return `${n.toFixed(digits)}%`;
}

/**
 * Cartera Largo Plazo — visually separated from short-term trading surfaces.
 * ANALYSIS_ONLY · horizon 6m–3y · never places orders.
 */
export function LongTermPortfolioPanel() {
  const [snap, setSnap] = useState<LongTermPortfolioSnapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function refresh() {
      if (inFlight.current) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      inFlight.current = true;
      try {
        const result = await safeJsonFetch<LongTermPortfolioSnapshot & { error?: string }>(
          "/api/investment/long-term-portfolio",
          { cache: "no-store" },
        );
        if (cancelled) return;
        if (!result.ok || !result.data) {
          setError(result.error ?? "Long-term portfolio refresh failed");
          return;
        }
        setSnap(result.data);
        setError(result.data.error ?? "");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Long-term portfolio refresh failed");
        }
      } finally {
        inFlight.current = false;
        if (!cancelled) setLoading(false);
      }
    }

    void refresh();
    timer = setInterval(() => {
      if (cancelled) return;
      if (document.visibilityState === "hidden") return;
      void refresh();
    }, POLL_MS);

    function onVisibility() {
      if (document.visibilityState === "visible") void refresh();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const valueHits = snap?.valueScreener.filter((h) => h.passes) ?? [];
  const dividendRows =
    snap?.dividendGrowth
      .slice()
      .sort(
        (a, b) =>
          Number(b.qualifies) - Number(a.qualifies) ||
          (b.risingYears ?? -1) - (a.risingYears ?? -1),
      )
      .slice(0, 12) ?? [];
  const catalystsOk = snap?.catalysts.filter((c) => c.status === "OK") ?? [];
  const catalystsNodata = snap?.catalysts.filter((c) => c.status === "NO_DATA") ?? [];

  return (
    <section
      className={styles.root}
      aria-label="Cartera Largo Plazo"
      data-panel-id="long-term-portfolio"
    >
      <div className={styles.separator} aria-hidden="true" />

      <header className={styles.header}>
        <div className={styles.headerMain}>
          <p className={styles.eyebrow}>Separado del trading corto plazo</p>
          <h2 className={styles.title}>Cartera Largo Plazo</h2>
          <p className={styles.subtitle}>
            Horizonte {snap?.horizon ?? "6 months – 3 years"} · value · dividendos ·
            rebalance trimestral suave · catalizadores
          </p>
        </div>
        <div className={styles.headerMeta}>
          <span className={styles.badge}>ANALYSIS_ONLY</span>
          <span className={styles.badgeMuted}>NO ORDERS</span>
          <span className={styles.metaText}>
            {loading && !snap ? "Loading…" : snap?.status ?? "NO_DATA"}
            {snap?.generatedAt
              ? ` · ${new Date(snap.generatedAt).toLocaleTimeString()}`
              : ""}
          </span>
          <button
            type="button"
            className={styles.retryBtn}
            onClick={() => {
              setLoading(true);
              void safeJsonFetch("/api/investment/long-term-portfolio", {
                cache: "no-store",
              }).then((r) => {
                if (r.ok && r.data) setSnap(r.data as LongTermPortfolioSnapshot);
                setLoading(false);
              });
            }}
          >
            Refresh
          </button>
        </div>
      </header>

      {error ? <p className={styles.errorText}>{error}</p> : null}

      <p className={styles.note}>
        {snap?.note ??
          "Waiting for Yahoo fundamentals… Missing modules render NO_DATA."}
      </p>

      <div className={styles.criteriaRow} aria-label="Value screen criteria">
        <span>
          P/E &lt; {VALUE_SCREEN_CRITERIA.maxPE}
        </span>
        <span>
          P/B &lt; {VALUE_SCREEN_CRITERIA.maxPB}
        </span>
        <span>
          ROE &gt; {VALUE_SCREEN_CRITERIA.minRoePct}%
        </span>
        <span>
          D/E &lt; {VALUE_SCREEN_CRITERIA.maxDebtEquity}
        </span>
        <span>
          Div. growth ≥ {VALUE_SCREEN_CRITERIA.minDividendRisingYears}y
        </span>
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <h3 className={styles.cardTitle}>Value screener</h3>
          <p className={styles.cardNote}>
            {valueHits.length} pass · scanned {snap?.scannedCount ?? 0}
          </p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>P/E</th>
                  <th>P/B</th>
                  <th>ROE</th>
                  <th>D/E</th>
                  <th>Sector</th>
                </tr>
              </thead>
              <tbody>
                {!snap || valueHits.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      {snap?.status === "DISABLED"
                        ? "DISABLED — LONG_TERM_PORTFOLIO_ENABLED=false"
                        : "NO_DATA — no tickers pass value screen (or Yahoo modules missing)"}
                    </td>
                  </tr>
                ) : (
                  valueHits.slice(0, 16).map((row) => (
                    <tr key={row.ticker}>
                      <td>{row.ticker}</td>
                      <td>{fmtNum(row.pe)}</td>
                      <td>{fmtNum(row.pb)}</td>
                      <td>{fmtPct(row.roePct)}</td>
                      <td>{fmtNum(row.debtEquity)}</td>
                      <td>{row.sector}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className={styles.card}>
          <h3 className={styles.cardTitle}>Dividend growth</h3>
          <p className={styles.cardNote}>
            Rising annual dividends ≥ {VALUE_SCREEN_CRITERIA.minDividendRisingYears} years
          </p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Rising years</th>
                  <th>Latest annual</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {!snap || dividendRows.length === 0 ? (
                  <tr>
                    <td colSpan={4}>NO_DATA — dividend chart events unavailable</td>
                  </tr>
                ) : (
                  dividendRows.map((row) => (
                    <tr key={row.ticker}>
                      <td>{row.ticker}</td>
                      <td>{row.risingYears ?? "NO_DATA"}</td>
                      <td>{fmtNum(row.latestAnnualDividend, 3)}</td>
                      <td>
                        {row.status === "NO_DATA" ? "NO_DATA" : row.note}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className={styles.card}>
          <h3 className={styles.cardTitle}>Suggested quarterly rebalance</h3>
          <p className={styles.cardNote}>
            Soft only · next{" "}
            {snap?.nextQuarterlyRebalance
              ? new Date(snap.nextQuarterlyRebalance).toLocaleDateString()
              : "NO_DATA"}
          </p>
          <ul className={styles.list}>
            {!snap || snap.rebalanceSuggestions.length === 0 ? (
              <li className={styles.listEmpty}>
                NO_DATA — no holdings / candidates for soft rebalance
              </li>
            ) : (
              snap.rebalanceSuggestions.map((s) => (
                <li key={`${s.ticker}-${s.action}`} className={styles.listItem}>
                  <div className={styles.listMain}>
                    <span className={styles.listTicker}>{s.ticker}</span>
                    <span className={styles.action}>{s.action}</span>
                  </div>
                  <p className={styles.listDetail}>
                    {s.rationale}
                    {s.currentWeightPct != null
                      ? ` · now ${fmtPct(s.currentWeightPct)} → ~${fmtPct(s.targetWeightPct)}`
                      : ""}
                  </p>
                </li>
              ))
            )}
          </ul>
        </article>

        <article className={styles.card}>
          <h3 className={styles.cardTitle}>Catalyst alerts</h3>
          <p className={styles.cardNote}>Splits · rating changes · buybacks</p>
          <ul className={styles.list}>
            {!snap || (catalystsOk.length === 0 && catalystsNodata.length === 0) ? (
              <li className={styles.listEmpty}>NO_DATA — Yahoo catalyst modules missing</li>
            ) : (
              <>
                {catalystsOk.map((c) => (
                  <li key={c.id} className={styles.listItem}>
                    <div className={styles.listMain}>
                      <span className={styles.listTicker}>{c.ticker}</span>
                      <span className={styles.kind}>{c.kind}</span>
                    </div>
                    <p className={styles.listDetail}>
                      {c.title}
                      {c.date ? ` · ${new Date(c.date).toLocaleDateString()}` : ""}
                    </p>
                  </li>
                ))}
                {catalystsNodata.slice(0, 4).map((c) => (
                  <li key={c.id} className={styles.listItemNodata}>
                    <div className={styles.listMain}>
                      <span className={styles.listTicker}>{c.ticker}</span>
                      <span className={styles.kind}>{c.kind}</span>
                    </div>
                    <p className={styles.listDetail}>NO_DATA — {c.detail}</p>
                  </li>
                ))}
              </>
            )}
          </ul>
        </article>
      </div>
    </section>
  );
}
