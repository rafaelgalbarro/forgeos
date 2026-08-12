"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import styles from "@/styles/investment/workspace.module.css";

type Metrics = {
  cagr: number | null;
  sharpe: number | null;
  sortino: number | null;
  calmar: number | null;
  profitFactor: number | null;
  expectancy: number;
  winRate: number | null;
  maxDrawdownPct: number | null;
  ulcerIndex: number | null;
  tradeCount: number;
  volatility: number | null;
};

type LabRow = {
  strategyId: string;
  name: string;
  description: string;
  version: string;
  status: string;
  enabled: boolean;
  timeHorizon: string;
  compatibleMarkets: readonly string[];
  compatibleAssets: readonly string[];
  historicalMetrics: Metrics;
  metricsSource: "BACKTEST" | "PAPER" | "SHADOW" | "LIVE" | "DEMO";
  metricsLabel: "BACKTEST" | "PAPER" | "SHADOW" | "LIVE" | "DEMO" | "INSUFFICIENT_SAMPLE";
  sampleSize: number;
  sessions: number;
  dataSource: string;
  period: string | null;
  costsIncluded: boolean;
  slippageIncluded: boolean;
  metricsConfidence: "LOW" | "MEDIUM" | "HIGH";
  readiness: "NOT_READY";
  productionRankingEligible: boolean;
  currentConfidence: number | null;
  risk: readonly string[];
  idealConditions: readonly string[];
  unfavorableConditions: readonly string[];
  recommendedCapital: number | null;
};

type Cert = {
  strategyId: string;
  version: string;
  verdict: string;
  readiness: "NOT_READY";
  livePromotionAllowed: false;
  criteria: readonly { id: string; label: string; passed: boolean; evidence: string }[];
};

type Rank = {
  rank: number;
  strategyId: string;
  name: string;
  score: number;
  sharpe: number | null;
  expectancy: number;
  maxDrawdownPct: number | null;
  metricsSource: LabRow["metricsSource"];
  metricsLabel: LabRow["metricsLabel"];
  sampleSize: number;
  sessions: number;
  dataSource: string;
  period: string | null;
  costsIncluded: boolean;
  slippageIncluded: boolean;
  confidence: LabRow["metricsConfidence"];
  readiness: "NOT_READY";
  productionRankingEligible: boolean;
};

type CompareRow = {
  metric: string;
  leftValue: number | null;
  rightValue: number | null;
  winner: string;
};

export type StrategyLabClientSnapshot = {
  generatedAt: string;
  goLive: string;
  autonomousLive: string;
  tradeDataLabel?: LabRow["metricsSource"];
  distinctSessions?: number;
  library: readonly LabRow[];
  ranking: readonly Rank[];
  certifications: readonly Cert[];
  monteCarlo: readonly {
    strategyId: string;
    simulations: number;
    medianFinalEquity: number;
    p5FinalEquity: number;
    p95FinalEquity: number;
    medianMaxDrawdownPct: number | null;
    ruinProbability: number;
  }[];
  optimizer: readonly {
    strategyId: string;
    best: { params: Record<string, number>; score: number } | null;
    trials: readonly { params: Record<string, number>; score: number }[];
    note: string;
  }[];
  portfolioTests: readonly {
    strategyId: string;
    portfolios: readonly { portfolioId: string; label: string; metrics: Metrics }[];
  }[];
  benchmarks: readonly {
    strategyId: string;
    vsSpy: readonly CompareRow[];
  }[];
  comparisons: {
    strategyAvsB: readonly CompareRow[] | null;
    strategyVsPortfolio: readonly CompareRow[] | null;
    strategyVsAi: readonly CompareRow[] | null;
  };
  aiProposals: readonly {
    id: string;
    name: string;
    description: string;
    confidence: number;
    baseStrategies: readonly string[];
  }[];
  aiImprovements: readonly {
    id: string;
    strategyId: string;
    summary: string;
    rationale: string;
    status: string;
    mutatesProduction: false;
  }[][];
  versions: readonly {
    strategyId: string;
    version: string;
    changeSummary: string;
    parentVersion: string | null;
    status: string;
  }[];
  builder: { note: string; templates: readonly string[]; mutatesCore: false };
  note: string;
  memoryRecordId?: string | null;
};

function fmt(n: number | null | undefined, digits = 3): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "NO_DATA";
  return n.toFixed(digits);
}

const SECTIONS = [
  { id: "library", label: "Strategy Library" },
  { id: "builder", label: "Strategy Builder" },
  { id: "backtesting", label: "Backtesting" },
  { id: "walk-forward", label: "Walk Forward" },
  { id: "monte-carlo", label: "Monte Carlo" },
  { id: "optimizer", label: "Optimizer" },
  { id: "portfolio-tester", label: "Portfolio Tester" },
  { id: "benchmark", label: "Benchmark" },
  { id: "ai-generator", label: "AI Strategy Generator" },
  { id: "performance-ranking", label: "Performance Ranking" },
  { id: "ai-improvements", label: "AI Improvements" },
  { id: "certification", label: "Certification" },
  { id: "compare", label: "Compare" },
] as const;

export function StrategyLabDashboard({
  initial,
}: {
  initial: StrategyLabClientSnapshot;
}) {
  const router = useRouter();
  const [section, setSection] = useState<(typeof SECTIONS)[number]["id"]>("library");
  const [focusId, setFocusId] = useState(initial.ranking[0]?.strategyId ?? initial.library[0]?.strategyId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const focus = useMemo(
    () => initial.library.find((r) => r.strategyId === focusId) ?? initial.library[0],
    [initial.library, focusId],
  );

  const focusCert = initial.certifications.find((c) => c.strategyId === focus?.strategyId);
  const improvements = initial.aiImprovements.flat().filter((i) => i.strategyId === focus?.strategyId);
  const versionHistory = initial.versions.filter((v) => v.strategyId === focus?.strategyId);

  function bumpVersion() {
    if (!focus) return;
    setError(null);
    startTransition(async () => {
      const res = await safeJsonFetch<{ ok?: boolean; error?: string }>("/api/investment/strategy-lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "version",
          strategyId: focus.strategyId,
          changeSummary: `Lab parameter review @ ${new Date().toISOString()}`,
        }),
      });
      if (!res.ok || res.data?.ok === false) {
        setError(res.data?.error ?? res.error ?? "Version commit failed");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className={styles.labRoot}>
      <div className={styles.labToolbar}>
        <p className={styles.labNote}>{initial.note}</p>
        <div className={styles.labMeta}>
          <span>GO_LIVE {initial.goLive}</span>
          <span>AUTONOMOUS {initial.autonomousLive}</span>
          <span>Data {initial.tradeDataLabel ?? "DEMO"}</span>
          <span>Sessions {initial.distinctSessions ?? "NO_DATA"}</span>
          <span>Memory {initial.memoryRecordId ?? "deferred"}</span>
        </div>
      </div>

      <div className={styles.labSectionNav} role="tablist" aria-label="Strategy Lab sections">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={section === s.id}
            className={section === s.id ? styles.labSectionActive : styles.labSectionBtn}
            onClick={() => setSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className={styles.labFocusRow}>
        <label className={styles.labLabel}>
          Focus strategy
          <select
            className={styles.labSelect}
            value={focus?.strategyId ?? ""}
            onChange={(e) => setFocusId(e.target.value)}
          >
            {initial.library.map((r) => (
              <option key={r.strategyId} value={r.strategyId}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className={styles.labAction} disabled={pending || !focus} onClick={bumpVersion}>
          Commit lab version
        </button>
        {error ? <span className={styles.labError}>{error}</span> : null}
      </div>

      {section === "library" && focus ? (
        <section className={styles.labPanel} aria-label="Strategy Library">
          <h2 className={styles.labHeading}>Strategy Library</h2>
          <div className={styles.labTableWrap}>
            <table className={styles.labTable}>
              <thead>
                <tr>
                  <th>Strategy</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Readiness</th>
                  <th>Horizon</th>
                  <th>Sharpe</th>
                  <th>Expectancy</th>
                  <th>DD%</th>
                  <th>Trades</th>
                </tr>
              </thead>
              <tbody>
                {initial.library.map((r) => (
                  <tr
                    key={r.strategyId}
                    data-active={r.strategyId === focus.strategyId ? "true" : "false"}
                    onClick={() => setFocusId(r.strategyId)}
                  >
                    <td>{r.name}</td>
                    <td>{r.version}</td>
                    <td>{r.status}</td>
                    <td>{r.metricsLabel === "INSUFFICIENT_SAMPLE" ? "INSUFFICIENT_SAMPLE · NOT_READY" : r.readiness}</td>
                    <td>{r.timeHorizon}</td>
                    <td>
                      {fmt(r.historicalMetrics.sharpe)}{" "}
                      <span className={r.metricsSource === "DEMO" ? styles.monitorWarn : styles.monitorOk}>
                        {r.metricsSource}
                      </span>
                    </td>
                    <td>{fmt(r.historicalMetrics.expectancy, 2)}</td>
                    <td>{fmt(r.historicalMetrics.maxDrawdownPct, 2)}</td>
                    <td>{r.historicalMetrics.tradeCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.labDetailGrid}>
            <article>
              <h3>{focus.name}</h3>
              <p>{focus.description}</p>
              <p>Markets: {focus.compatibleMarkets.join(", ") || "NO_DATA"}</p>
              <p>Products: {focus.compatibleAssets?.join(", ") || "NO_DATA"}</p>
              <p>Ideal: {focus.idealConditions.join("; ") || "NO_DATA"}</p>
              <p>Unfavorable: {focus.unfavorableConditions.join("; ") || "NO_DATA"}</p>
              <p>Risk: {focus.risk.join("; ") || "NO_DATA"}</p>
              <p>Recommended capital: {focus.recommendedCapital ?? "NO_DATA"}</p>
              <p>
                Source: {focus.dataSource} · period {focus.period ?? "NO_DATA"} · sessions {focus.sessions}
              </p>
              <p>
                Sample {focus.sampleSize} · costs {focus.costsIncluded ? "included" : "not included"} ·
                slippage {focus.slippageIncluded ? "included" : "not included"} · confidence{" "}
                {focus.metricsConfidence}
              </p>
            </article>
            <article>
              <h3>Metrics</h3>
              <ul className={styles.labMetricList}>
                <li>CAGR {fmt(focus.historicalMetrics.cagr)}</li>
                <li>
                  Sharpe {fmt(focus.historicalMetrics.sharpe)} · {focus.metricsSource}
                </li>
                <li>{focus.metricsLabel} · {focus.readiness}</li>
                <li>Sortino {fmt(focus.historicalMetrics.sortino)}</li>
                <li>Calmar {fmt(focus.historicalMetrics.calmar)}</li>
                <li>PF {fmt(focus.historicalMetrics.profitFactor)}</li>
                <li>Win rate {fmt(focus.historicalMetrics.winRate)}</li>
                <li>Ulcer {fmt(focus.historicalMetrics.ulcerIndex)}</li>
                <li>Vol {fmt(focus.historicalMetrics.volatility)}</li>
              </ul>
            </article>
          </div>
        </section>
      ) : null}

      {section === "builder" ? (
        <section className={styles.labPanel}>
          <h2 className={styles.labHeading}>Strategy Builder</h2>
          <p>{initial.builder.note}</p>
          <p>Templates: {initial.builder.templates.join(", ")}</p>
          <p className={styles.labLocked}>mutatesCore=false — production strategies are never overwritten.</p>
        </section>
      ) : null}

      {section === "backtesting" ? (
        <section className={styles.labPanel}>
          <h2 className={styles.labHeading}>Backtesting</h2>
          <p>Uses existing Strategy Engine backtest runner (DEMO / Market Intelligence bars).</p>
          <p>
            Open dedicated runner:{" "}
            <a className={styles.labInlineLink} href="/investment/backtesting">
              /investment/backtesting
            </a>
          </p>
        </section>
      ) : null}

      {section === "walk-forward" ? (
        <section className={styles.labPanel}>
          <h2 className={styles.labHeading}>Walk Forward Analysis</h2>
          <p>Out-of-sample windows via existing walk-forward adapter.</p>
          <p>
            <a className={styles.labInlineLink} href="/investment/backtesting?mode=walkforward">
              Run walk-forward
            </a>
          </p>
        </section>
      ) : null}

      {section === "monte-carlo" ? (
        <section className={styles.labPanel}>
          <h2 className={styles.labHeading}>Monte Carlo Simulation</h2>
          <div className={styles.labTableWrap}>
            <table className={styles.labTable}>
              <thead>
                <tr>
                  <th>Strategy</th>
                  <th>Sims</th>
                  <th>P5 equity</th>
                  <th>Median</th>
                  <th>P95</th>
                  <th>Med DD%</th>
                  <th>Ruin P</th>
                </tr>
              </thead>
              <tbody>
                {initial.monteCarlo.map((m) => (
                  <tr key={m.strategyId}>
                    <td>{m.strategyId}</td>
                    <td>{m.simulations}</td>
                    <td>{fmt(m.p5FinalEquity, 0)}</td>
                    <td>{fmt(m.medianFinalEquity, 0)}</td>
                    <td>{fmt(m.p95FinalEquity, 0)}</td>
                    <td>{fmt(m.medianMaxDrawdownPct, 2)}</td>
                    <td>{fmt(m.ruinProbability, 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {section === "optimizer" ? (
        <section className={styles.labPanel}>
          <h2 className={styles.labHeading}>Optimizer</h2>
          {initial.optimizer.map((o) => (
            <div key={o.strategyId}>
              <p>{o.note}</p>
              <p>
                Best: score {fmt(o.best?.score)} params {JSON.stringify(o.best?.params ?? {})}
              </p>
              <ul className={styles.labMetricList}>
                {o.trials.slice(0, 5).map((t, i) => (
                  <li key={i}>
                    #{i + 1} score {fmt(t.score)} {JSON.stringify(t.params)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}

      {section === "portfolio-tester" ? (
        <section className={styles.labPanel}>
          <h2 className={styles.labHeading}>Portfolio Tester</h2>
          {initial.portfolioTests.map((pt) => (
            <div key={pt.strategyId} className={styles.labTableWrap}>
              <table className={styles.labTable}>
                <thead>
                  <tr>
                    <th>Portfolio</th>
                    <th>Sharpe</th>
                    <th>Expectancy</th>
                    <th>DD%</th>
                  </tr>
                </thead>
                <tbody>
                  {pt.portfolios.map((p) => (
                    <tr key={p.portfolioId}>
                      <td>{p.label}</td>
                      <td>{fmt(p.metrics.sharpe)}</td>
                      <td>{fmt(p.metrics.expectancy, 2)}</td>
                      <td>{fmt(p.metrics.maxDrawdownPct, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      ) : null}

      {section === "benchmark" ? (
        <section className={styles.labPanel}>
          <h2 className={styles.labHeading}>Benchmark</h2>
          {(initial.benchmarks[0]?.vsSpy ?? []).slice(0, 8).map((row) => (
            <p key={row.metric}>
              vs SPY · {row.metric}: {fmt(row.leftValue)} / {fmt(row.rightValue)} → {row.winner}
            </p>
          ))}
        </section>
      ) : null}

      {section === "ai-generator" ? (
        <section className={styles.labPanel}>
          <h2 className={styles.labHeading}>AI Strategy Generator</h2>
          {initial.aiProposals.map((p) => (
            <article key={p.id} className={styles.labCard}>
              <h3>{p.name}</h3>
              <p>{p.description}</p>
              <p>
                Bases: {p.baseStrategies.join(", ")} · confidence {fmt(p.confidence)} · status draft_proposal
              </p>
            </article>
          ))}
        </section>
      ) : null}

      {section === "performance-ranking" ? (
        <section className={styles.labPanel}>
          <h2 className={styles.labHeading}>Performance Ranking</h2>
          <p className={styles.labNote}>
            Research ranking only. DEMO and INSUFFICIENT_SAMPLE rows are NOT_READY and excluded from
            production influence.
          </p>
          <div className={styles.labTableWrap}>
            <table className={styles.labTable}>
              <thead>
                <tr>
                  <th>Research #</th>
                  <th>Strategy</th>
                  <th>Score</th>
                  <th>Sharpe</th>
                  <th>Source</th>
                  <th>Readiness</th>
                  <th>Expectancy</th>
                  <th>DD%</th>
                </tr>
              </thead>
              <tbody>
                {initial.ranking.map((r) => (
                  <tr key={r.strategyId}>
                    <td>{r.rank}</td>
                    <td>{r.name}</td>
                    <td>{fmt(r.score, 2)}</td>
                    <td>{fmt(r.sharpe)}</td>
                    <td>
                      <span className={r.metricsSource === "DEMO" ? styles.monitorWarn : styles.monitorOk}>
                        {r.metricsSource}
                      </span>
                    </td>
                    <td>{r.metricsLabel === "INSUFFICIENT_SAMPLE" ? "INSUFFICIENT_SAMPLE · NOT_READY" : r.readiness}</td>
                    <td>{fmt(r.expectancy, 2)}</td>
                    <td>{fmt(r.maxDrawdownPct, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {section === "ai-improvements" ? (
        <section className={styles.labPanel}>
          <h2 className={styles.labHeading}>AI Improvements</h2>
          <p className={styles.labLocked}>Never modifies production. Proposals require re-validation.</p>
          {(improvements.length ? improvements : initial.aiImprovements.flat().slice(0, 8)).map((imp) => (
            <article key={imp.id} className={styles.labCard}>
              <h3>
                {imp.strategyId} · {imp.summary}
              </h3>
              <p>{imp.rationale}</p>
              <p>
                status={imp.status} · mutatesProduction={String(imp.mutatesProduction)}
              </p>
            </article>
          ))}
        </section>
      ) : null}

      {section === "certification" && focusCert ? (
        <section className={styles.labPanel}>
          <h2 className={styles.labHeading}>Certification</h2>
          <p>
            {focusCert.strategyId} v{focusCert.version} → <strong>{focusCert.verdict}</strong> ·{" "}
            <strong>{focusCert.readiness}</strong>
          </p>
          <p className={styles.labLocked}>livePromotionAllowed=false</p>
          <ul className={styles.labMetricList}>
            {focusCert.criteria.map((c) => (
              <li key={c.id}>
                {c.passed ? "PASS" : "FAIL"} · {c.label} · {c.evidence}
              </li>
            ))}
          </ul>
          <h3>Version history</h3>
          <ul className={styles.labMetricList}>
            {versionHistory.map((v) => (
              <li key={v.version}>
                {v.version} ← {v.parentVersion ?? "root"} · {v.changeSummary} · {v.status}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {section === "compare" ? (
        <section className={styles.labPanel}>
          <h2 className={styles.labHeading}>Compare</h2>
          <h3>A vs B</h3>
          {(initial.comparisons.strategyAvsB ?? []).slice(0, 6).map((r) => (
            <p key={`ab-${r.metric}`}>
              {r.metric}: {fmt(r.leftValue)} vs {fmt(r.rightValue)} → {r.winner}
            </p>
          ))}
          <h3>Strategy vs portfolio</h3>
          {(initial.comparisons.strategyVsPortfolio ?? []).slice(0, 4).map((r) => (
            <p key={`pf-${r.metric}`}>
              {r.metric}: {fmt(r.leftValue)} vs {fmt(r.rightValue)} → {r.winner}
            </p>
          ))}
          <h3>Strategy vs AI</h3>
          {(initial.comparisons.strategyVsAi ?? []).slice(0, 4).map((r) => (
            <p key={`ai-${r.metric}`}>
              {r.metric}: {fmt(r.leftValue)} vs {fmt(r.rightValue)} → {r.winner}
            </p>
          ))}
        </section>
      ) : null}
    </div>
  );
}
