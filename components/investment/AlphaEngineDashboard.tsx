"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/styles/investment/workspace.module.css";

type Opp = {
  id: string;
  asset: string;
  market: string;
  direction: string;
  strategy: string;
  strategiesAgreeing: readonly string[];
  agentsAgreeing: readonly string[];
  timeHorizon: string;
  entryEstimated: number | null;
  stop: number | null;
  target: number | null;
  expectedReturnPct: number | null;
  expectedRiskPct: number | null;
  spread: number | null;
  liquidity: number | null;
  dataQuality: string;
  confidence: number;
  score: number;
  grade: string;
  status: string;
  whyDetected: string;
  risks: readonly string[];
  thesisInvalidation: readonly string[];
  acceptOrRejectReason: string;
  sources: readonly string[];
  portfolioImpact: string;
  escalateToCommittee: boolean;
  escalateToRisk: boolean;
  evidence: readonly string[];
};

export type AlphaEngineClientSnapshot = {
  generatedAt: string;
  goLive: string;
  autonomousLive: string;
  ordersSubmitted: number;
  liveTradingEnabled: false;
  topOpportunities: readonly Opp[];
  rejectedOpportunities: readonly Opp[];
  alphaRanking: readonly Opp[];
  committeeEscalations: readonly { opportunityId: string; asset: string; grade: string; note: string }[];
  riskEscalations: readonly { opportunityId: string; asset: string; note: string }[];
  note: string;
  memoryRecordId?: string | null;
  integrations: Readonly<Record<string, string>>;
  filtersApplied?: {
    market?: string;
    asset?: string;
    strategy?: string;
    minConfidence?: number;
    maxRiskPct?: number;
    timeHorizon?: string;
  };
};

function fmt(n: number | null | undefined, d = 2): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toFixed(d);
}

type ViewId = "top" | "rejected" | "ranking";

export function AlphaEngineDashboard({ initial }: { initial: AlphaEngineClientSnapshot }) {
  const router = useRouter();
  const [view, setView] = useState<ViewId>("top");
  const [selectedId, setSelectedId] = useState<string | null>(
    initial.topOpportunities[0]?.id ?? initial.alphaRanking[0]?.id ?? null,
  );

  const [market, setMarket] = useState(initial.filtersApplied?.market ?? "all");
  const [asset, setAsset] = useState(initial.filtersApplied?.asset ?? "");
  const [strategy, setStrategy] = useState(initial.filtersApplied?.strategy ?? "");
  const [minConfidence, setMinConfidence] = useState(
    initial.filtersApplied?.minConfidence != null ? String(initial.filtersApplied.minConfidence) : "",
  );
  const [maxRisk, setMaxRisk] = useState(
    initial.filtersApplied?.maxRiskPct != null ? String(initial.filtersApplied.maxRiskPct) : "",
  );
  const [horizon, setHorizon] = useState(initial.filtersApplied?.timeHorizon ?? "");

  const rows = useMemo(() => {
    if (view === "top") return initial.topOpportunities;
    if (view === "rejected") return initial.rejectedOpportunities;
    return initial.alphaRanking;
  }, [view, initial]);

  const selected = useMemo(
    () => initial.alphaRanking.find((o) => o.id === selectedId) ?? rows[0] ?? null,
    [initial.alphaRanking, rows, selectedId],
  );

  function applyFilters() {
    const q = new URLSearchParams();
    if (market && market !== "all") q.set("market", market);
    if (asset.trim()) q.set("asset", asset.trim());
    if (strategy.trim()) q.set("strategy", strategy.trim());
    if (minConfidence.trim()) q.set("minConfidence", minConfidence.trim());
    if (maxRisk.trim()) q.set("maxRiskPct", maxRisk.trim());
    if (horizon.trim()) q.set("horizon", horizon.trim());
    const qs = q.toString();
    router.push(qs ? `/investment/alpha?${qs}` : "/investment/alpha");
  }

  return (
    <div className={styles.alphaRoot}>
      <div className={styles.alphaToolbar}>
        <p className={styles.alphaNote}>{initial.note}</p>
        <div className={styles.alphaMeta}>
          <span>GO_LIVE {initial.goLive}</span>
          <span>ORDERS {initial.ordersSubmitted}</span>
          <span>LIVE {String(initial.liveTradingEnabled)}</span>
          <span>Memory {initial.memoryRecordId ?? "deferred"}</span>
        </div>
      </div>

      <div className={styles.alphaFilters}>
        <label>
          Market
          <select value={market} onChange={(e) => setMarket(e.target.value)}>
            <option value="all">all</option>
            <option value="stocks">stocks</option>
            <option value="etf">etf</option>
            <option value="forex">forex</option>
            <option value="indices">indices</option>
            <option value="futures">futures</option>
            <option value="options">options</option>
            <option value="bonds">bonds</option>
            <option value="commodities">commodities</option>
            <option value="crypto">crypto</option>
          </select>
        </label>
        <label>
          Asset
          <input value={asset} onChange={(e) => setAsset(e.target.value)} placeholder="AAPL" />
        </label>
        <label>
          Strategy
          <input value={strategy} onChange={(e) => setStrategy(e.target.value)} placeholder="momentum" />
        </label>
        <label>
          Min conf
          <input value={minConfidence} onChange={(e) => setMinConfidence(e.target.value)} placeholder="0.5" />
        </label>
        <label>
          Max risk %
          <input value={maxRisk} onChange={(e) => setMaxRisk(e.target.value)} placeholder="5" />
        </label>
        <label>
          Horizon
          <input value={horizon} onChange={(e) => setHorizon(e.target.value)} placeholder="swing" />
        </label>
        <button type="button" className={styles.alphaApply} onClick={applyFilters}>
          Apply filters
        </button>
      </div>

      <div className={styles.alphaViewNav} role="tablist">
        {(
          [
            ["top", `Top Opportunities (${initial.topOpportunities.length})`],
            ["rejected", `Rejected (${initial.rejectedOpportunities.length})`],
            ["ranking", `Alpha Ranking (${initial.alphaRanking.length})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            className={view === id ? styles.alphaViewActive : styles.alphaViewBtn}
            onClick={() => setView(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={styles.alphaLayout}>
        <div className={styles.alphaTableWrap}>
          <table className={styles.alphaTable}>
            <thead>
              <tr>
                <th>#</th>
                <th>Grade</th>
                <th>Score</th>
                <th>Asset</th>
                <th>Dir</th>
                <th>Entry</th>
                <th>Stop</th>
                <th>Target</th>
                <th>Risk%</th>
                <th>Conf</th>
                <th>Consensus</th>
                <th>Data</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o, i) => (
                <tr
                  key={o.id}
                  data-active={selected?.id === o.id ? "true" : "false"}
                  onClick={() => setSelectedId(o.id)}
                >
                  <td>{i + 1}</td>
                  <td data-grade={o.grade}>{o.grade}</td>
                  <td>{fmt(o.score, 1)}</td>
                  <td>{o.asset}</td>
                  <td>{o.direction}</td>
                  <td>{fmt(o.entryEstimated)}</td>
                  <td>{fmt(o.stop)}</td>
                  <td>{fmt(o.target)}</td>
                  <td>{fmt(o.expectedRiskPct)}</td>
                  <td>{fmt(o.confidence, 2)}</td>
                  <td>
                    {o.strategiesAgreeing.length}S/{o.agentsAgreeing.length}A
                  </td>
                  <td>{o.dataQuality}</td>
                  <td>{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <p className={styles.alphaEmpty}>No opportunities in this view.</p> : null}
        </div>

        {selected ? (
          <aside className={styles.alphaDetail} aria-label="Opportunity detail">
            <h2>
              {selected.asset} · {selected.grade} · {fmt(selected.score, 1)}
            </h2>
            <p className={styles.alphaReason}>{selected.acceptOrRejectReason}</p>
            <h3>Why detected</h3>
            <p>{selected.whyDetected}</p>
            <h3>Strategies agreeing</h3>
            <p>{selected.strategiesAgreeing.join(", ") || "none"}</p>
            <h3>Agents agreeing</h3>
            <p>{selected.agentsAgreeing.join(", ") || "none"}</p>
            <h3>Risks</h3>
            <ul>
              {selected.risks.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <h3>Thesis invalidation</h3>
            <ul>
              {selected.thesisInvalidation.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <h3>Evidence</h3>
            <ul>
              {selected.evidence.slice(0, 6).map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
            <h3>Escalation</h3>
            <p>
              Committee: {selected.escalateToCommittee ? "YES (analysis)" : "NO"} · Risk:{" "}
              {selected.escalateToRisk ? "YES (analysis)" : "NO"}
            </p>
            <p>Sources: {selected.sources.join(", ")}</p>
            <p>Portfolio: {selected.portfolioImpact}</p>
            <p className={styles.alphaLocked}>orderExecution=disabled · ordersSubmitted=0</p>
          </aside>
        ) : null}
      </div>

      <div className={styles.alphaEscalations}>
        <article>
          <h3>Committee queue ({initial.committeeEscalations.length})</h3>
          {initial.committeeEscalations.map((c) => (
            <p key={c.opportunityId}>
              {c.asset} {c.grade} — {c.note}
            </p>
          ))}
          {initial.committeeEscalations.length === 0 ? <p>None this cycle</p> : null}
        </article>
        <article>
          <h3>Risk queue ({initial.riskEscalations.length})</h3>
          {initial.riskEscalations.map((c) => (
            <p key={c.opportunityId}>
              {c.asset} — {c.note}
            </p>
          ))}
          {initial.riskEscalations.length === 0 ? <p>None this cycle</p> : null}
        </article>
      </div>
    </div>
  );
}
