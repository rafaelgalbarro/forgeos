import styles from "@/styles/investment/risk-center.module.css";
import type { RiskCenterSnapshot, RiskTrafficLight } from "@/lib/investment/risk-center.types";
import { MaxDrawdownRealtime } from "./MaxDrawdownRealtime";

function lightClass(light: RiskTrafficLight): string {
  switch (light) {
    case "GREEN":
      return styles.lightGreen;
    case "AMBER":
      return styles.lightAmber;
    case "RED":
      return styles.lightRed;
    default:
      return styles.lightNoData;
  }
}

function TrafficLight({ light }: { readonly light: RiskTrafficLight }) {
  return (
    <span className={`${styles.light} ${lightClass(light)}`}>
      <span className={styles.lightDot} aria-hidden />
      {light}
    </span>
  );
}

interface Props {
  readonly snapshot: RiskCenterSnapshot;
}

function riskLevelLabel(light: RiskTrafficLight): string {
  if (light === "GREEN") return "VERDE";
  if (light === "AMBER") return "AMARILLO";
  if (light === "RED") return "ROJO";
  return "NO_DATA";
}

function minutesAgoLabel(iso: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return "—";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "hace menos de 1 min";
  if (mins === 1) return "hace 1 min";
  return `hace ${mins} min`;
}

/**
 * Professional Risk Center UI — ANALYSIS_ONLY.
 * Semaphores, alerts, stress scenarios, advisory recommendations. Zero order path.
 */
export function RiskCenterDashboard({ snapshot }: Props) {
  const riskLevel = riskLevelLabel(snapshot.overallLight);
  const lastEvaluation = minutesAgoLabel(snapshot.analyticsAsOf ?? snapshot.generatedAt);
  const drawdownMetric = snapshot.metrics.find((m) => m.key === "drawdown") ?? null;

  return (
    <section className={styles.riskRoot} aria-label="Risk Center">
      <MaxDrawdownRealtime initial={drawdownMetric} />

      <div className={styles.kpiBar}>
        <div className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Nivel de riesgo global</p>
          <p className={styles.kpiValue}>
            {riskLevel} <TrafficLight light={snapshot.overallLight} />
          </p>
        </div>
        <div className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Alertas activas</p>
          <p className={styles.kpiValue}>{snapshot.alerts.length}</p>
        </div>
        <div className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Última evaluación</p>
          <p className={styles.kpiValue}>{lastEvaluation}</p>
        </div>
      </div>
      <p className={styles.bannerNote}>{snapshot.note}</p>

      <div className={styles.metricsGrid}>
        {snapshot.metrics.map((m) => (
          <article key={m.key} className={styles.metricCard}>
            <div className={styles.metricTop}>
              <p className={styles.metricLabel}>{m.label}</p>
              <TrafficLight light={m.light} />
            </div>
            <p className={styles.metricValue}>{m.display}</p>
            <p className={styles.metricMeta}>
              {m.status} · {m.source}
              {m.note ? ` — ${m.note}` : ""}
            </p>
          </article>
        ))}
      </div>

      <div className={styles.sectionGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Alertas</h2>
            <span className={styles.simTag}>
              {snapshot.alerts.length ? "DRY_RUN" : "NO_DATA"}
            </span>
          </div>
          <ul className={styles.panelList}>
            {snapshot.alerts.length === 0 ? (
              <li>NO_DATA — no dry-run monitor / audit breach alerts</li>
            ) : (
              snapshot.alerts.slice(0, 40).map((a) => (
                <li key={a.id} data-severity={a.severity}>
                  [{a.source}] {a.severity} · {a.code} · {a.title}
                  {" — "}
                  value={a.value == null ? "NO_DATA" : String(a.value)}
                  {" / thr="}
                  {a.threshold == null ? "NO_DATA" : String(a.threshold)}
                  {a.symbols.length ? ` · ${a.symbols.join(",")}` : ""}
                </li>
              ))
            )}
          </ul>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Recomendaciones</h2>
            <span className={styles.simTag}>ADVISORY_ONLY</span>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {snapshot.recommendations.map((r) => (
              <div key={r.id} className={styles.advisoryBox} data-priority={r.priority}>
                <p className={styles.advisoryTitle}>
                  [{r.priority}] {r.title}
                </p>
                <p className={styles.advisoryText}>
                  {r.action} — {r.rationale} (autoExecute={String(r.autoExecute)})
                </p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Stress Test · Escenarios</h2>
          <span className={styles.simTag}>{snapshot.stressTest.label}</span>
        </div>
        <p className={styles.metricMeta}>{snapshot.stressTest.note}</p>
        <div className={styles.sectionGrid}>
          {snapshot.stressTest.scenarios.map((s) => (
            <div key={s.id} className={styles.scenarioCard}>
              <div className={styles.panelHeader}>
                <h3 className={styles.scenarioTitle}>{s.title}</h3>
                <TrafficLight light={s.severity} />
              </div>
              <span className={styles.simTag}>
                {s.label} · {s.mode} · orders {s.orderExecution}
              </span>
              <p className={styles.scenarioDesc}>{s.description}</p>
              <ul className={styles.panelList}>
                {s.shocks.map((sh) => (
                  <li key={`${s.id}-${sh.metric}`}>
                    {sh.metric}: {sh.display}
                  </li>
                ))}
              </ul>
              <ul className={styles.panelList}>
                {s.advisory.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <p className={styles.metricMeta}>{s.note}</p>
            </div>
          ))}
        </div>
      </article>

      <article className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Posture</h2>
          <span className={styles.simTag}>LOCKED</span>
        </div>
        <ul className={styles.panelList}>
          <li>analysisOnly={String(snapshot.posture.analysisOnly)}</li>
          <li>
            autoExecuteRecommendations=
            {String(snapshot.posture.autoExecuteRecommendations)}
          </li>
          <li>
            scenariosMutatePortfolio={String(snapshot.posture.scenariosMutatePortfolio)}
          </li>
          <li>{snapshot.posture.note}</li>
          <li>
            Monitor: running={String(snapshot.monitorRunning)} · evals=
            {snapshot.evaluationCount} · asOf=
            {snapshot.analyticsAsOf ?? "NO_DATA"}
          </li>
          <li>{snapshot.monitorNote}</li>
        </ul>
      </article>
    </section>
  );
}
