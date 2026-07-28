"use client";

import type { BuildEngineOutput } from "@/lib/build-engine/types";
import type { BuildQueueItem } from "@/lib/build-engine/types";
import { assessDeploymentReadiness } from "@/lib/build-engine/deployment";
import { runQaAssessment } from "@/lib/build-engine/qa";

interface BuildQueuePanelProps {
  build: BuildEngineOutput;
}

function BuildQueueOps({ item }: { item: BuildQueueItem }) {
  const qa = runQaAssessment(item);
  const deploy = assessDeploymentReadiness(item);
  const pending = item.artifacts.filter((a) => a.status === "draft").length;

  return (
    <div className="build-queue-ops">
      <span className={`build-qa build-qa-${qa.status}`}>
        QA: {qa.status} ({qa.passed} ok · {qa.pending} pendiente)
      </span>
      <span className={deploy.ready ? "build-deploy-ready" : "build-deploy-blocked"}>
        Deploy: {deploy.ready ? "listo" : deploy.blockers[0] ?? "pendiente"}
      </span>
      {pending > 0 && <span className="build-pending-tasks">{pending} tareas pendientes</span>}
    </div>
  );
}

const STATE_COLORS: Record<string, string> = {
  Pending: "build-state-pending",
  Planning: "build-state-planning",
  Building: "build-state-building",
  Testing: "build-state-testing",
  Deploying: "build-state-deploying",
  Live: "build-state-live",
};

export function BuildQueuePanel({ build }: BuildQueuePanelProps) {
  const { queue, timeline, connectors } = build;

  return (
    <section className="build-queue-panel glass">
      <div className="ceo-section-head">
        <h2>Build Queue</h2>
        <span>{queue.length} en cola</span>
      </div>

      {queue.length === 0 ? (
        <p className="build-queue-empty">
          No hay ventures en cola de Build. Completa PRD y acepta inteligencia para encolar.
        </p>
      ) : (
        <div className="build-queue-list">
          {queue.map((item) => (
            <div key={item.id} className="build-queue-item">
              <div className="build-queue-header">
                <strong>{item.ventureName}</strong>
                <span className={`build-state-chip ${STATE_COLORS[item.state] ?? ""}`}>
                  {item.state}
                </span>
              </div>
              <div className="build-queue-progress">
                <div className="build-progress-bar" style={{ width: `${item.progress}%` }} />
              </div>
              <p className="build-queue-phase">{item.currentPhase}</p>
              <BuildQueueOps item={item} />
              <div className="build-artifacts">
                {item.artifacts.slice(0, 5).map((a) => (
                  <span key={a.id} className={`build-artifact build-artifact-${a.status}`}>
                    {a.type}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {timeline.length > 0 && (
        <div className="build-timeline">
          <h3>Build Timeline</h3>
          <ul>
            {timeline.slice(0, 6).map((e) => (
              <li key={e.id}>
                <span className="build-tl-time">
                  {new Date(e.timestamp).toLocaleDateString("es-ES")}
                </span>
                {e.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="build-connectors">
        <h3>Connectors (stubs)</h3>
        <div className="build-connector-row">
          {connectors.map((c) => (
            <span key={c.id} className="build-connector-chip" title={c.description}>
              {c.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
