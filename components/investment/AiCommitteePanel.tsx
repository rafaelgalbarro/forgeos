import styles from "@/styles/investment/workspace.module.css";
import type {
  CommitteeAgentCard,
  CommitteeAggregatePanel,
  CommitteePanelSnapshot,
} from "@/lib/investment/committee-panel-snapshot";
import type { CommitteeReplayEntry } from "@/lib/investment/committee-replay";

function fmtScore(value: number | null): string {
  return value == null ? "NO_DATA" : value.toFixed(3);
}

function fmtConf(value: number | null): string {
  return value == null ? "NO_DATA" : `${(value * 100).toFixed(1)}%`;
}

function fmtTime(value: string | null): string {
  if (!value) return "NO_DATA";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

function AgentCard({ agent }: { agent: CommitteeAgentCard }) {
  return (
    <article className={styles.committeeAgentCard} data-state={agent.state}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>{agent.label}</h3>
        <span className={agent.state === "READY" ? styles.monitorOk : styles.monitorWarn}>
          {agent.state}
        </span>
      </div>
      <ul className={styles.panelList}>
        <li>
          <span className={styles.committeeFieldLabel}>Score</span>
          {fmtScore(agent.score)}
        </li>
        <li>
          <span className={styles.committeeFieldLabel}>Confianza</span>
          {fmtConf(agent.confidence)}
        </li>
        <li>
          <span className={styles.committeeFieldLabel}>Recomendación</span>
          {agent.recommendation ?? "NO_DATA"}
        </li>
        <li>
          <span className={styles.committeeFieldLabel}>Explicación</span>
          {agent.explanation ?? "NO_DATA"}
        </li>
        <li>
          <span className={styles.committeeFieldLabel}>Fuentes</span>
          {agent.sources.length ? agent.sources.slice(0, 4).join(" · ") : "NO_DATA"}
        </li>
        <li>
          <span className={styles.committeeFieldLabel}>Última actualización</span>
          {fmtTime(agent.updatedAt)}
        </li>
        {agent.mappedFrom ? (
          <li className={styles.committeeMapNote}>Mapped from: {agent.mappedFrom}</li>
        ) : null}
      </ul>
    </article>
  );
}

function AggregateCard({ panel }: { panel: CommitteeAggregatePanel }) {
  return (
    <article className={styles.committeeAggregateCard} data-state={panel.state}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>{panel.title}</h2>
        <span className={panel.state === "READY" ? styles.monitorOk : styles.monitorWarn}>
          {panel.state}
        </span>
      </div>
      <ul className={styles.panelList}>
        <li>
          <span className={styles.committeeFieldLabel}>Resumen</span>
          {panel.summary ?? "NO_DATA"}
        </li>
        {panel.confidence != null ? (
          <li>
            <span className={styles.committeeFieldLabel}>Confianza</span>
            {fmtConf(panel.confidence)}
          </li>
        ) : null}
        {panel.dissent != null ? (
          <li>
            <span className={styles.committeeFieldLabel}>Dissent</span>
            {panel.dissent.toFixed(3)}
          </li>
        ) : null}
        {panel.buyScore != null || panel.sellScore != null || panel.holdScore != null ? (
          <li>
            <span className={styles.committeeFieldLabel}>Scores B/S/H</span>
            {fmtScore(panel.buyScore)} / {fmtScore(panel.sellScore)} / {fmtScore(panel.holdScore)}
          </li>
        ) : null}
        {panel.lines.length === 0 ? (
          <li>NO_DATA</li>
        ) : (
          panel.lines.slice(0, 8).map((line) => <li key={line}>{line}</li>)
        )}
      </ul>
    </article>
  );
}

function ReplayEntryCard({ entry }: { entry: CommitteeReplayEntry }) {
  return (
    <article className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>
          {entry.recommendation ?? entry.consensus ?? "Decision"}
        </h2>
        <span className={styles.monitorMetaText}>{entry.source}</span>
      </div>
      <ul className={styles.panelList}>
        <li>
          {new Date(entry.occurredAt).toLocaleString()} · {entry.symbol}
        </li>
        <li>
          Confidence: {entry.confidence == null ? "NO_DATA" : entry.confidence.toFixed(3)}
        </li>
        <li>
          Scores buy/sell/hold:{" "}
          {entry.buyScore == null && entry.sellScore == null && entry.holdScore == null
            ? "NO_DATA"
            : `${entry.buyScore ?? "NO_DATA"} / ${entry.sellScore ?? "NO_DATA"} / ${entry.holdScore ?? "NO_DATA"}`}
        </li>
        <li>
          Approved: {entry.approved == null ? "NO_DATA" : String(entry.approved)} · Dissent:{" "}
          {entry.dissent == null ? "NO_DATA" : entry.dissent}
        </li>
        {entry.reasoning.slice(0, 4).map((line) => (
          <li key={line}>{line}</li>
        ))}
        {entry.brainRecommendation ? <li>Brain: {entry.brainRecommendation}</li> : null}
        {entry.researchThesis ? <li>Research: {entry.researchThesis}</li> : null}
        <li>
          Risk: {entry.riskLevel ?? "NO_DATA"}
          {entry.riskWarnings.length ? ` — ${entry.riskWarnings.slice(0, 2).join("; ")}` : ""}
        </li>
        {entry.allocationSummary ? <li>Allocation: {entry.allocationSummary}</li> : null}
        {entry.portfolioAnalyticsSummary ? (
          <li>Portfolio analytics: {entry.portfolioAnalyticsSummary}</li>
        ) : null}
        {entry.minorityReport.slice(0, 3).map((m) => (
          <li key={`${m.agent}-${m.stance}`}>
            Minority {m.agent}: {m.stance} — {m.reasoning}
          </li>
        ))}
        <li>{entry.note}</li>
      </ul>
    </article>
  );
}

/**
 * Professional AI Investment Committee panel — ANALYSIS_ONLY.
 * No controls to manually create or force decisions.
 */
export function AiCommitteePanel({ panel }: { panel: CommitteePanelSnapshot }) {
  return (
    <div className={styles.committeeRoot} aria-label="AI Investment Committee">
      <p className={styles.hubNote}>{panel.note}</p>

      <section className={styles.committeeSection} aria-label="Committee agents">
        <h2 className={styles.committeeSectionTitle}>Agents</h2>
        <div className={styles.committeeAgentGrid}>
          {panel.agents.map((agent) => (
            <AgentCard key={agent.seatId} agent={agent} />
          ))}
        </div>
      </section>

      <section className={styles.committeeSection} aria-label="Committee aggregates">
        <h2 className={styles.committeeSectionTitle}>Aggregate</h2>
        <div className={styles.committeeAggregateGrid}>
          <AggregateCard panel={panel.consenso} />
          <AggregateCard panel={panel.disenso} />
          <AggregateCard panel={panel.minorityReport} />
        </div>
      </section>

      <section className={styles.committeeSection} aria-label="Decision history replay">
        <h2 className={styles.committeeSectionTitle}>History · decision replay</h2>
        <div className={styles.grid}>
          {panel.replay.entries.length === 0 ? (
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>Decision replay</h3>
                <span className={styles.monitorWarn}>NO_DATA</span>
              </div>
              <p className={styles.hubNote}>{panel.replay.note}</p>
            </article>
          ) : (
            panel.replay.entries.map((entry) => <ReplayEntryCard key={entry.id} entry={entry} />)
          )}
        </div>
      </section>
    </div>
  );
}
