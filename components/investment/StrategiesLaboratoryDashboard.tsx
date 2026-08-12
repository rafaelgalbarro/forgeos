"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import type { StrategyCenterClientRow } from "@/components/investment/StrategyCenterDashboard";
import type { StrategyLabClientSnapshot } from "@/components/investment/StrategyLabDashboard";
import styles from "@/styles/investment/workspace.module.css";

type EvalRow = {
  strategyId: string;
  name: string;
  bias: string;
  score: number | null;
  summary: string;
  hasEntryIntent: boolean;
};

type ToggleResponse = {
  ok?: boolean;
  error?: string;
  snapshot?: {
    strategies: StrategyCenterClientRow[];
    enabledCount: number;
    count: number;
  };
};

type LabView = "library" | "compare" | "ranking" | "history" | "learning" | "integrations";

const VIEWS: readonly { id: LabView; label: string }[] = [
  { id: "library", label: "Biblioteca" },
  { id: "compare", label: "Comparar" },
  { id: "ranking", label: "Ranking" },
  { id: "history", label: "Histórico" },
  { id: "learning", label: "Aprendizaje continuo" },
  { id: "integrations", label: "Integraciones" },
];

function fmt(n: number | null | undefined, digits = 3): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "NO_DATA";
  return n.toFixed(digits);
}

function fmtMetric(n: number | null | undefined, tradeCount: number, digits = 3): string {
  if (tradeCount <= 0) return "NO_DATA";
  return fmt(n, digits);
}

function joinList(values: readonly string[] | string | undefined | null): string {
  if (values == null) return "NO_DATA";
  if (typeof values === "string") return values.trim() || "NO_DATA";
  return values.length ? values.join(", ") : "NO_DATA";
}

export function StrategiesLaboratoryDashboard({
  lab,
  centerRows,
  enabledCount,
  count,
  evaluationRows,
  dataLabel,
}: {
  lab: StrategyLabClientSnapshot;
  centerRows: readonly StrategyCenterClientRow[];
  enabledCount: number;
  count: number;
  evaluationRows: readonly EvalRow[];
  dataLabel: "BACKTEST" | "PAPER" | "SHADOW" | "LIVE" | "DEMO";
}) {
  const router = useRouter();
  const [view, setView] = useState<LabView>("library");
  const [rows, setRows] = useState(centerRows);
  const [enabled, setEnabled] = useState(enabledCount);
  const [selectedId, setSelectedId] = useState(
    lab.ranking[0]?.strategyId ?? lab.library[0]?.strategyId ?? "",
  );
  const [compareA, setCompareA] = useState(lab.library[0]?.strategyId ?? "");
  const [compareB, setCompareB] = useState(lab.library[1]?.strategyId ?? lab.library[0]?.strategyId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const libraryById = useMemo(() => {
    const map = new Map(lab.library.map((r) => [r.strategyId, r]));
    return map;
  }, [lab.library]);

  const centerById = useMemo(() => {
    const map = new Map(rows.map((r) => [r.strategyId, r]));
    return map;
  }, [rows]);

  const selected = libraryById.get(selectedId) ?? lab.library[0];
  const left = libraryById.get(compareA);
  const right = libraryById.get(compareB);
  const evalById = useMemo(() => new Map(evaluationRows.map((r) => [r.strategyId, r])), [evaluationRows]);

  function toggle(strategyId: string, next: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await safeJsonFetch<ToggleResponse>("/api/investment/strategy-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategyId, enabled: next }),
      });
      if (!res.ok || res.data?.ok === false) {
        setError(res.data?.error ?? res.error ?? "Toggle failed");
        return;
      }
      if (res.data?.snapshot?.strategies) {
        setRows(res.data.snapshot.strategies);
        setEnabled(res.data.snapshot.enabledCount);
      } else {
        setRows((prev) =>
          prev.map((r) =>
            r.strategyId === strategyId
              ? { ...r, enabled: next, status: next ? "ENABLED" : "DISABLED" }
              : r,
          ),
        );
        setEnabled((n) => n + (next ? 1 : -1));
      }
      router.refresh();
    });
  }

  const compareMetrics = [
    { key: "profitFactor", label: "Profit Factor" },
    { key: "winRate", label: "Win Rate" },
    { key: "expectancy", label: "Expectancy" },
    { key: "sharpe", label: "Sharpe" },
    { key: "sortino", label: "Sortino" },
    { key: "maxDrawdownPct", label: "Drawdown" },
    { key: "volatility", label: "Volatilidad" },
    { key: "tradeCount", label: "Operaciones" },
  ] as const;

  return (
    <div className={styles.labRoot}>
      <div className={styles.labToolbar}>
        <p className={styles.labNote}>
          Strategies Laboratory — catalog + IBKR historical/paper metrics. ANALYSIS_ONLY · AUTONOMOUS_LIVE LOCKED ·
          no order submission. {enabled}/{count} enabled
          {pending ? " · updating…" : ""}
        </p>
        <div className={styles.labMeta}>
          <span>Data {dataLabel}</span>
          <span>GO_LIVE {lab.goLive}</span>
          <span>AUTONOMOUS {lab.autonomousLive}</span>
          <span>Sessions {lab.distinctSessions ?? "NO_DATA"}</span>
        </div>
      </div>

      {error ? <p className={styles.monitorError}>{error}</p> : null}

      <div className={styles.labSectionNav} role="tablist" aria-label="Strategies Laboratory views">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={view === v.id}
            className={view === v.id ? styles.labSectionActive : styles.labSectionBtn}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === "library" ? (
        <section className={styles.labPanel} aria-label="Strategy library">
          <h2 className={styles.labHeading}>Biblioteca de estrategias</h2>
          <div className={styles.grid}>
            {lab.library.map((row) => {
              const center = centerById.get(row.strategyId);
              const m = row.historicalMetrics;
              const trades = m.tradeCount;
              const status = center?.status ?? (row.enabled ? "ENABLED" : "DISABLED");
              return (
                <article
                  key={row.strategyId}
                  className={styles.panel}
                  data-active={row.strategyId === selected?.strategyId ? "true" : "false"}
                  onClick={() => setSelectedId(row.strategyId)}
                  style={{ cursor: "pointer" }}
                >
                  <div className={styles.panelHeader}>
                    <h3 className={styles.panelTitle}>{row.name}</h3>
                    <span className={status === "ENABLED" ? styles.monitorOk : styles.monitorWarn}>
                      {status}
                    </span>
                  </div>
                  <ul className={styles.panelList}>
                    <li>
                      <strong>Nombre:</strong> {row.name}
                    </li>
                    <li>
                      <strong>Descripción:</strong> {row.description || "NO_DATA"}
                    </li>
                    <li>
                      <strong>Mercados:</strong> {joinList(row.compatibleMarkets)}
                    </li>
                    <li>
                      <strong>Productos:</strong> {joinList(row.compatibleAssets)}
                    </li>
                    <li>
                      <strong>Versión:</strong> {row.version || center?.version || "NO_DATA"}
                    </li>
                    <li>
                      <strong>Estado:</strong> {status}
                    </li>
                  </ul>
                  <div className={styles.labDetailGrid} style={{ marginTop: 8 }}>
                    <article>
                      <h3>Métricas ({row.metricsSource})</h3>
                      <ul className={styles.labMetricList}>
                        <li>Profit Factor {fmtMetric(m.profitFactor, trades)}</li>
                        <li>Win Rate {fmtMetric(m.winRate, trades)}</li>
                        <li>Expectancy {trades > 0 ? fmt(m.expectancy, 2) : "NO_DATA"}</li>
                        <li>
                          Sharpe {fmtMetric(m.sharpe, trades)} ·{" "}
                          <span className={row.metricsSource === "DEMO" ? styles.monitorWarn : styles.monitorOk}>
                            {row.metricsSource}
                          </span>
                        </li>
                        <li>Sortino {fmtMetric(m.sortino, trades)}</li>
                        <li>Drawdown {fmtMetric(m.maxDrawdownPct, trades, 2)}</li>
                        <li>Volatilidad {fmtMetric(m.volatility, trades)}</li>
                        <li>Operaciones {trades > 0 ? String(trades) : "NO_DATA"}</li>
                        <li>
                          {row.metricsLabel} · {row.readiness}
                        </li>
                        <li>
                          sessions={row.sessions} · period={row.period ?? "NO_DATA"} · confidence=
                          {row.metricsConfidence}
                        </li>
                        <li>
                          costs={row.costsIncluded ? "included" : "not included"} · slippage=
                          {row.slippageIncluded ? "included" : "not included"}
                        </li>
                      </ul>
                    </article>
                  </div>
                  <div className={styles.filterBar} style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className={styles.filterBtn}
                      disabled={pending}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(row.strategyId, !(center?.enabled ?? row.enabled));
                      }}
                    >
                      {(center?.enabled ?? row.enabled) ? "Disable" : "Enable"}
                    </button>
                    <Link
                      className={styles.labInlineLink}
                      href={`/investment/strategy-lab?focus=${encodeURIComponent(row.strategyId)}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Lab profundo →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          {selected ? (
            <div className={styles.labDetailGrid} style={{ marginTop: 14 }}>
              <article className={styles.labPanel}>
                <h3>Strategy evaluation · {selected.name}</h3>
                <p>
                  Bias: {evalById.get(selected.strategyId)?.bias ?? "NO_DATA"} · Score:{" "}
                  {fmt(evalById.get(selected.strategyId)?.score ?? null)} · Entry intent:{" "}
                  {evalById.get(selected.strategyId)?.hasEntryIntent ? "yes (not sent)" : "none"}
                </p>
                <p>{evalById.get(selected.strategyId)?.summary ?? "NO_DATA"}</p>
              </article>
            </div>
          ) : null}
        </section>
      ) : null}

      {view === "compare" ? (
        <section className={styles.labPanel} aria-label="Compare strategies">
          <h2 className={styles.labHeading}>Comparar estrategias</h2>
          <div className={styles.labFocusRow}>
            <label className={styles.labLabel}>
              Estrategia A
              <select className={styles.labSelect} value={compareA} onChange={(e) => setCompareA(e.target.value)}>
                {lab.library.map((r) => (
                  <option key={r.strategyId} value={r.strategyId}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.labLabel}>
              Estrategia B
              <select className={styles.labSelect} value={compareB} onChange={(e) => setCompareB(e.target.value)}>
                {lab.library.map((r) => (
                  <option key={r.strategyId} value={r.strategyId}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <Link
              className={styles.labInlineLink}
              href={`/investment/strategy-lab?focus=${encodeURIComponent(compareA)}&compare=${encodeURIComponent(compareB)}`}
            >
              Abrir compare en Strategy Lab →
            </Link>
          </div>
          {left && right ? (
            <div className={styles.labTableWrap} style={{ marginTop: 12 }}>
              <table className={styles.labTable}>
                <thead>
                  <tr>
                    <th>Métrica</th>
                    <th>{left.name}</th>
                    <th>{right.name}</th>
                  </tr>
                </thead>
                <tbody>
                  {compareMetrics.map((cm) => {
                    const lv = left.historicalMetrics[cm.key];
                    const rv = right.historicalMetrics[cm.key];
                    const lt = left.historicalMetrics.tradeCount;
                    const rt = right.historicalMetrics.tradeCount;
                    return (
                      <tr key={cm.key}>
                        <td>{cm.label}</td>
                        <td>
                          {cm.key === "tradeCount"
                            ? lt > 0
                              ? String(lt)
                              : "NO_DATA"
                            : cm.key === "expectancy"
                              ? lt > 0
                                ? fmt(Number(lv), 2)
                                : "NO_DATA"
                              : fmtMetric(typeof lv === "number" ? lv : null, lt)}
                        </td>
                        <td>
                          {cm.key === "tradeCount"
                            ? rt > 0
                              ? String(rt)
                              : "NO_DATA"
                            : cm.key === "expectancy"
                              ? rt > 0
                                ? fmt(Number(rv), 2)
                                : "NO_DATA"
                              : fmtMetric(typeof rv === "number" ? rv : null, rt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.hubNote}>NO_DATA — select two strategies to compare.</p>
          )}
          {(lab.comparisons.strategyAvsB ?? []).length > 0 ? (
            <div style={{ marginTop: 12 }}>
              <h3 className={styles.labHeading}>Lab compare snapshot</h3>
              {(lab.comparisons.strategyAvsB ?? []).slice(0, 8).map((r) => (
                <p key={r.metric}>
                  {r.metric}: {fmt(r.leftValue)} vs {fmt(r.rightValue)} → {r.winner}
                </p>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {view === "ranking" ? (
        <section className={styles.labPanel} aria-label="Strategy ranking">
          <h2 className={styles.labHeading}>Ranking</h2>
          <p className={styles.hubNote}>
            Research-only score with per-row sources. DEMO and insufficient samples are NOT_READY and
            excluded from Alpha production influence.
          </p>
          <div className={styles.labTableWrap}>
            <table className={styles.labTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nombre</th>
                  <th>Score</th>
                  <th>Sharpe</th>
                  <th>Source</th>
                  <th>Readiness</th>
                  <th>Expectancy</th>
                  <th>Drawdown</th>
                </tr>
              </thead>
              <tbody>
                {lab.ranking.map((r) => {
                  const trades = libraryById.get(r.strategyId)?.historicalMetrics.tradeCount ?? 0;
                  return (
                    <tr
                      key={r.strategyId}
                      data-active={r.strategyId === selectedId ? "true" : "false"}
                      onClick={() => {
                        setSelectedId(r.strategyId);
                        setView("library");
                      }}
                    >
                      <td>{r.rank}</td>
                      <td>{r.name}</td>
                      <td>{trades > 0 ? fmt(r.score, 2) : "NO_DATA"}</td>
                      <td>{fmtMetric(r.sharpe, trades)}</td>
                      <td>
                        <span className={r.metricsSource === "DEMO" ? styles.monitorWarn : styles.monitorOk}>
                          {r.metricsSource}
                        </span>
                      </td>
                      <td>
                        {r.metricsLabel === "INSUFFICIENT_SAMPLE"
                          ? "INSUFFICIENT_SAMPLE · NOT_READY"
                          : r.readiness}
                      </td>
                      <td>{trades > 0 ? fmt(r.expectancy, 2) : "NO_DATA"}</td>
                      <td>{fmtMetric(r.maxDrawdownPct, trades, 2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {view === "history" ? (
        <section className={styles.labPanel} aria-label="Strategy history">
          <h2 className={styles.labHeading}>Histórico de versiones</h2>
          <p className={styles.hubNote}>
            Lab version store only — productionMutation=forbidden. Certifications remain BLOCKED_LIVE.
          </p>
          {lab.versions.length === 0 ? (
            <p>NO_DATA</p>
          ) : (
            <div className={styles.labTableWrap}>
              <table className={styles.labTable}>
                <thead>
                  <tr>
                    <th>Strategy</th>
                    <th>Versión</th>
                    <th>Parent</th>
                    <th>Cambio</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {lab.versions.map((v) => (
                    <tr key={`${v.strategyId}-${v.version}`}>
                      <td>{v.strategyId}</td>
                      <td>{v.version}</td>
                      <td>{v.parentVersion ?? "root"}</td>
                      <td>{v.changeSummary || "NO_DATA"}</td>
                      <td>{v.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <h3 className={styles.labHeading} style={{ marginTop: 16 }}>
            Certificación (read-only)
          </h3>
          <ul className={styles.labMetricList}>
            {lab.certifications.slice(0, 12).map((c) => (
              <li key={c.strategyId}>
                {c.strategyId} v{c.version} → {c.verdict} · {c.readiness} · livePromotionAllowed=
                {String(c.livePromotionAllowed)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {view === "learning" ? (
        <section className={styles.labPanel} aria-label="Continuous learning">
          <h2 className={styles.labHeading}>Aprendizaje continuo</h2>
          <p className={styles.labLocked}>
            ANALYSIS_ONLY proposals from Strategy Lab AI Improvements / memory. Never auto-modifies
            production strategies.
          </p>
          {(lab.aiImprovements.flat().length
            ? lab.aiImprovements.flat()
            : []
          ).slice(0, 16).map((imp) => (
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
          {lab.aiImprovements.flat().length === 0 ? <p>NO_DATA</p> : null}
          {lab.aiProposals.length > 0 ? (
            <>
              <h3 className={styles.labHeading} style={{ marginTop: 14 }}>
                Propuestas AI (draft)
              </h3>
              {lab.aiProposals.map((p) => (
                <article key={p.id} className={styles.labCard}>
                  <h3>{p.name}</h3>
                  <p>{p.description}</p>
                  <p>
                    Bases: {p.baseStrategies.join(", ") || "NO_DATA"} · confidence {fmt(p.confidence)}
                  </p>
                </article>
              ))}
            </>
          ) : null}
          <p style={{ marginTop: 10 }}>
            <Link className={styles.labInlineLink} href="/investment/strategy-lab">
              Abrir Strategy Lab (métricas / cert / MC) →
            </Link>
          </p>
        </section>
      ) : null}

      {view === "integrations" ? (
        <section className={styles.labPanel} aria-label="Module integrations">
          <h2 className={styles.labHeading}>Integraciones (módulos existentes)</h2>
          <p className={styles.hubNote}>
            Links into existing runners — no new engines. Forward testing reuses paper / shadow /
            walk-forward.
          </p>
          <div className={styles.grid} style={{ marginTop: 10 }}>
            <article className={styles.panel}>
              <h3 className={styles.panelTitle}>Backtesting</h3>
              <p className={styles.hubNote}>Strategy Engine DEMO / MI walk via backtest runner.</p>
              <Link className={styles.labInlineLink} href="/investment/backtesting">
                /investment/backtesting →
              </Link>
            </article>
            <article className={styles.panel}>
              <h3 className={styles.panelTitle}>Paper Trading</h3>
              <p className={styles.hubNote}>Paper orchestrator — analysis / simulated fills only.</p>
              <Link className={styles.labInlineLink} href="/investment/paper">
                /investment/paper →
              </Link>
            </article>
            <article className={styles.panel}>
              <h3 className={styles.panelTitle}>Shadow Trading</h3>
              <p className={styles.hubNote}>Shadow / memory path — no live orders.</p>
              <Link className={styles.labInlineLink} href="/investment/shadow">
                /investment/shadow →
              </Link>
            </article>
            <article className={styles.panel}>
              <h3 className={styles.panelTitle}>Forward Testing</h3>
              <p className={styles.hubNote}>
                Label: Forward Testing = Paper + Shadow + Walk-Forward (out-of-sample). Not live.
              </p>
              <ul className={styles.panelList}>
                <li>
                  <Link className={styles.labInlineLink} href="/investment/paper">
                    Paper forward →
                  </Link>
                </li>
                <li>
                  <Link className={styles.labInlineLink} href="/investment/shadow">
                    Shadow forward →
                  </Link>
                </li>
                <li>
                  <Link className={styles.labInlineLink} href="/investment/backtesting?mode=walkforward">
                    Walk-forward →
                  </Link>
                </li>
              </ul>
            </article>
          </div>
        </section>
      ) : null}
    </div>
  );
}
