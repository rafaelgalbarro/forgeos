"use client";

import Link from "next/link";
import { ProvenanceBadge } from "./ProvenanceBadge";
import { RouteStatePanel } from "./RouteStatePanel";
import { mcStatusClass } from "./mc-status";
import type { MissionControlVM } from "@/src/presentation/view-models/types";

export function MissionControlV2View({
  vm,
  conversation,
}: {
  vm: MissionControlVM;
  /** Workspace conversation slot (embedded shell) — single composition, no stacked MC page. */
  conversation?: React.ReactNode;
}) {
  if (vm.availability === "empty") {
    return (
      <div className="mc-root" data-testid="mc-v2-empty">
        <header className="mc-header">
          <div>
            <p className="mc-header-kicker">Mission Control</p>
            <h1 className="mc-header-title">Mission Control</h1>
            <p className="mc-header-lede">{vm.ceoOpening}</p>
            <div className="mc-header-actions">
              <Link href={vm.primaryCta.href} className="fhis-btn fhis-btn-primary">
                {vm.primaryCta.label}
              </Link>
              <Link href="/activity" className="fhis-btn fhis-btn-secondary">
                Ver Activity
              </Link>
            </div>
          </div>
          <ProvenanceBadge badge={vm.provenance} />
        </header>
        <RouteStatePanel
          state={{
            kind: "empty",
            title: "Sin misión activa",
            description: vm.message ?? "Describe un objetivo para crear y operar tu compañía.",
            retryHref: "/os/creator",
          }}
        />
      </div>
    );
  }

  if (vm.availability === "error" || vm.availability === "unavailable" || vm.availability === "permission_denied") {
    return (
      <div className="mc-root" data-testid="mc-v2-error">
        <RouteStatePanel
          state={{
            kind: vm.availability === "error" ? "error" : vm.availability,
            title: "Mission Control no disponible",
            description: vm.message ?? vm.degradedReason ?? "No se pudo cargar el overview.",
            retryHref: "/mission-control",
          }}
        />
      </div>
    );
  }

  return (
    <div className="mc-root mission-control-v2" data-testid="mc-v2-ready">
      <header className="mc-header">
        <div style={{ minWidth: 0, flex: 1 }}>
          <p className="mc-header-kicker">Mission Control</p>
          <h1 className="mc-header-title">ForgeOS</h1>
          <p className="mc-header-lede">{vm.ceoOpening}</p>
          <div className="mc-header-actions">
            <Link href={vm.primaryCta.href} className="fhis-btn fhis-btn-primary">
              {vm.primaryCta.label}
            </Link>
            {vm.missionId ? (
              <Link href={`/studio/${vm.missionId}`} className="fhis-btn fhis-btn-secondary">
                Open Studio
              </Link>
            ) : null}
          </div>
        </div>
        <div className="mc-header-meta">
          <span className={mcStatusClass(vm.stage)} title={`Stage: ${vm.stage}`}>
            <span className="mc-status-dot" aria-hidden />
            {vm.stage}
          </span>
          <span
            className={mcStatusClass(vm.provenance.tone === "live" ? "active" : "idle")}
            title="Live status"
          >
            <span className="mc-status-dot" aria-hidden />
            {vm.provenance.label}
          </span>
          <ProvenanceBadge badge={vm.provenance} />
          {vm.availability === "degraded" || vm.availability === "partial" ? (
            <span className="mc-degraded" role="status">
              {vm.degradedReason ?? "Datos parciales"}
            </span>
          ) : null}
        </div>
      </header>

      <div className="mc-info-grid" aria-label="Mission identity">
        <div className="mc-card mc-card-elevated">
          <div className="mc-info-label">Objective</div>
          <div className="mc-info-value">{vm.objective}</div>
        </div>
        <div className="mc-card mc-card-elevated">
          <div className="mc-info-label">Stage</div>
          <div className="mc-info-value">
            <span className={mcStatusClass(vm.stage)}>
              <span className="mc-status-dot" aria-hidden />
              {vm.stage}
            </span>
          </div>
        </div>
        <div className="mc-card mc-card-elevated">
          <div className="mc-info-label">Next decision</div>
          <div className="mc-info-value">{vm.nextDecision ?? "Ninguna pendiente"}</div>
        </div>
        <div className="mc-card mc-card-elevated">
          <div className="mc-info-label">Next action</div>
          <div className="mc-info-value">{vm.nextAction}</div>
        </div>
      </div>

      <div className="mc-workspace">
        <div className="mc-workspace-main">
          {conversation ? (
            <section className="mc-card" aria-label="Conversation and controls">
              <h2 className="mc-card-title">Conversation</h2>
              <div className="mc-conversation">{conversation}</div>
            </section>
          ) : (
            <section className="mc-card" aria-label="Mission summary">
              <h2 className="mc-card-title">Overview</h2>
              <p className="mc-card-body">{vm.ceoOpening}</p>
              <p className="mc-card-empty" style={{ marginTop: 12 }}>
                Abre Mission Control para conversación y controles operativos.
              </p>
              {vm.missionId ? (
                <Link
                  href={`/mission-control/${vm.missionId}`}
                  className="mc-link"
                  style={{ display: "inline-block", marginTop: 10 }}
                >
                  Ir a Mission Control →
                </Link>
              ) : null}
            </section>
          )}
        </div>

        <aside className="mc-workspace-side" aria-label="Mission workspace">
          <Panel title="Workflow">
            {vm.planStages.length === 0 ? (
              <p className="mc-card-empty">Sin plan aún.</p>
            ) : (
              <div>
                {vm.planStages.map((step) => (
                  <div key={step.id} className="mc-plan-step">
                    <span className={mcStatusClass(step.status)}>
                      <span className="mc-status-dot" aria-hidden />
                      {step.status}
                    </span>
                    <span className="mc-plan-step-label">{step.label}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Outputs">
            {vm.outputs.length === 0 ? (
              <p className="mc-card-empty">Sin outputs.</p>
            ) : (
              <ul className="mc-list">
                {vm.outputs.map((o) => (
                  <li key={o.id}>
                    {o.label}{" "}
                    <span className={mcStatusClass(o.status)} style={{ marginLeft: 6 }}>
                      <span className="mc-status-dot" aria-hidden />
                      {o.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {vm.missionId ? (
              <Link href={`/studio/${vm.missionId}`} className="mc-link" style={{ display: "inline-block", marginTop: 10 }}>
                Open Studio →
              </Link>
            ) : null}
          </Panel>

          <Panel title="Live activity">
            {vm.activity.length === 0 ? (
              <p className="mc-card-empty">Sin eventos.</p>
            ) : (
              <ul className="mc-list-plain">
                {vm.activity.map((a) => (
                  <li key={a.id}>
                    <span className="mc-timeline-meta">
                      {a.kind}
                      {a.at ? ` · ${a.at}` : ""}
                    </span>
                    {a.label}
                  </li>
                ))}
              </ul>
            )}
            <Link href="/activity" className="mc-link" style={{ display: "inline-block", marginTop: 10 }}>
              Activity hub →
            </Link>
          </Panel>

          <Panel title="Decisions / Approvals">
            {vm.approvals.length === 0 && !vm.nextDecision ? (
              <p className="mc-card-empty">Sin aprobaciones.</p>
            ) : (
              <ul className="mc-list">
                {vm.nextDecision ? <li>Next: {vm.nextDecision}</li> : null}
                {vm.approvals.map((a) => (
                  <li key={a.id}>
                    {a.label}{" "}
                    <span className={mcStatusClass(a.status)} style={{ marginLeft: 6 }}>
                      <span className="mc-status-dot" aria-hidden />
                      {a.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Risks">
            {vm.risks.length === 0 ? (
              <p className="mc-card-empty">Sin riesgos registrados.</p>
            ) : (
              <ul className="mc-list">
                {vm.risks.map((r) => (
                  <li key={r.id}>
                    [{r.severity}] {r.label}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mc-card">
      <h2 className="mc-card-title">{title}</h2>
      <div className="mc-card-body">{children}</div>
    </section>
  );
}
