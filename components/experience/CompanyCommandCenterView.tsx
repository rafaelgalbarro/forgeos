"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CompanyDashboardReadModel } from "@/src/core/application/company-dashboard/read-model";

type Mode = "quick" | "detailed";
type FilterDomain = "all" | "business" | "product" | "design" | "technical" | "validation" | "release";
type StatusFilter = "all" | "ready" | "in_progress" | "blocked" | "failed" | "not_started";

export function CompanyCommandCenterView({ model }: { model: CompanyDashboardReadModel }) {
  const [mode, setMode] = useState<Mode>("quick");
  const [domainFilter, setDomainFilter] = useState<FilterDomain>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [previewTarget, setPreviewTarget] = useState<{ title: string; href: string } | null>(null);

  const sections = useMemo(() => {
    let list = model.sections;
    if (domainFilter === "product") list = list.filter((s) => ["products", "map", "visual"].includes(s.id));
    else if (domainFilter === "business") list = list.filter((s) => ["header", "summary", "business", "activity"].includes(s.id));
    else if (domainFilter === "design") list = list.filter((s) => ["visual"].includes(s.id));
    else if (domainFilter === "technical") list = list.filter((s) => ["technical", "map"].includes(s.id));
    else if (domainFilter === "validation") list = list.filter((s) => ["qa"].includes(s.id));
    else if (domainFilter === "release") list = list.filter((s) => ["release"].includes(s.id));

    if (statusFilter === "ready") list = list.filter((s) => s.readiness === "READY");
    if (statusFilter === "in_progress") list = list.filter((s) => s.readiness === "IN_PROGRESS" || s.readiness === "PARTIAL");
    if (statusFilter === "blocked") list = list.filter((s) => s.readiness === "BLOCKED" || s.reality === "BLOCKED");
    if (statusFilter === "failed") list = list.filter((s) => s.readiness === "FAILED" || s.reality === "FAILED");
    if (statusFilter === "not_started") list = list.filter((s) => s.readiness === "NOT_STARTED" || s.reality === "NOT_CREATED");
    return list;
  }, [domainFilter, statusFilter, model.sections]);

  const primaryMissionId = model.products[0]?.missionId;
  const showDetailed = mode === "detailed";

  return (
    <div className="ccc-root" data-testid="company-command-center">
      <header className="ccc-header" id="company-header">
        <div>
          <p className="ccc-kicker">PROGRAM 6090 · Company Creation Command Center</p>
          <h1>{model.header.ventureName}</h1>
          <p className="ccc-tagline">{model.header.tagline}</p>
          <p className="ccc-meta">
            <span>Sector: {model.header.sector}</span>
            <span>Lifecycle: {model.header.lifecycle}</span>
            <span>Mission: {model.header.missionStatus}</span>
            <span>Version: {model.header.version}</span>
          </p>
          <div className="ccc-actions">
            {model.nextActions.map((action) => (
              <Link key={action.id} href={action.href} className={action.priority === "high" ? "fhis-btn fhis-btn-primary" : "fhis-btn"}>
                {action.label}
              </Link>
            ))}
            {primaryMissionId ? (
              <Link href={`/mission-control/${primaryMissionId}`} className="fhis-btn">
                Mission Control
              </Link>
            ) : (
              <Link href="/mission-control" className="fhis-btn">
                Mission Control
              </Link>
            )}
            {primaryMissionId ? (
              <Link href={`/studio/${primaryMissionId}`} className="fhis-btn">
                Open Studio
              </Link>
            ) : null}
            {primaryMissionId ? (
              <Link href={`/missions/${primaryMissionId}?section=decisions`} className="fhis-btn">
                Request Change
              </Link>
            ) : null}
          </div>
        </div>
        <span
          className={`mc-status ${
            model.freshness === "LIVE" ? "mc-status--ready" : model.freshness === "PARTIAL" ? "mc-status--partial" : "mc-status--pending"
          }`}
          role="status"
          aria-label={`Freshness ${model.freshness}`}
        >
          <span className="mc-status-dot" aria-hidden />
          {model.freshness}
        </span>
      </header>

      {model.errors.length > 0 ? (
        <section className="mc-card" role="status" aria-live="polite">
          <h2 className="mc-card-title">Partial data</h2>
          <p className="mc-card-body">Some sources failed; page remains available.</p>
          <ul className="mc-list">
            {model.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="ccc-toolbar" aria-label="View and filters">
        <div role="tablist" aria-label="View mode">
          <button type="button" onClick={() => setMode("quick")} aria-pressed={mode === "quick"} className="fhis-btn">
            Quick View
          </button>
          <button type="button" onClick={() => setMode("detailed")} aria-pressed={mode === "detailed"} className="fhis-btn">
            Detailed View
          </button>
        </div>
        <div className="ccc-actions">
          <label htmlFor="ccc-filter" className="ccc-label">
            Domain
          </label>
          <select
            id="ccc-filter"
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value as FilterDomain)}
            className="ccc-select"
          >
            <option value="all">All</option>
            <option value="business">Business</option>
            <option value="product">Product</option>
            <option value="design">Design</option>
            <option value="technical">Technical</option>
            <option value="validation">Validation</option>
            <option value="release">Release</option>
          </select>
          <label htmlFor="ccc-status-filter" className="ccc-label">
            Status
          </label>
          <select
            id="ccc-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="ccc-select"
          >
            <option value="all">All</option>
            <option value="ready">Ready</option>
            <option value="in_progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="failed">Failed</option>
            <option value="not_started">Not Started</option>
          </select>
        </div>
      </section>

      <nav className="ccc-anchors" aria-label="Section anchors">
        <a href="#creation-health">Health</a>
        <a href="#creation-map">Map</a>
        <a href="#visual-outputs">Visual</a>
        <a href="#activity">Actions</a>
        {showDetailed ? (
          <>
            <a href="#technical-foundation">Technical</a>
            <a href="#qa">QA</a>
            <a href="#release-deployment">Release</a>
          </>
        ) : null}
      </nav>

      <section className="ccc-grid ccc-health" id="creation-health" aria-label="Creation health">
        {model.health.map((h) => (
          <article key={h.id} className="mc-card">
            <h2 className="mc-card-title">{h.label}</h2>
            <p className="ccc-score">{h.score}</p>
            <span className={`mc-status mc-status--${h.status.toLowerCase()}`}>
              <span className="mc-status-dot" aria-hidden />
              {h.status}
            </span>
          </article>
        ))}
      </section>

      <section className="mc-card" id="executive-summary">
        <h2 className="mc-card-title">Executive Summary</h2>
        <p className="mc-card-body">{model.executiveSummary || "No persisted executive summary yet."}</p>
      </section>

      <section className="ccc-grid" id="products" aria-label="Products">
        {model.products.length === 0 ? (
          <article className="mc-card">
            <h3 className="mc-card-title">Products</h3>
            <p className="mc-card-empty">No products yet for this company.</p>
          </article>
        ) : (
          model.products.map((product) => (
            <article key={product.id} className="mc-card">
              <h3 className="mc-card-title">{product.name}</h3>
              <p className="mc-card-body">
                {product.type} · {product.status} · v{product.version}
              </p>
              <p className="mc-card-body">Outputs: {product.outputCount}</p>
              <p className="mc-card-body">Readiness: {product.readiness}</p>
              <p className="mc-card-body">Reality: {product.reality}</p>
              {product.blockers.length > 0 ? <p className="mc-card-body">Blockers: {product.blockers.join("; ")}</p> : null}
              <div className="ccc-actions">
                {product.previewUrl ? (
                  <button type="button" className="fhis-btn" onClick={() => setPreviewTarget({ title: product.name, href: product.previewUrl! })}>
                    Open Preview
                  </button>
                ) : (
                  <span className="mc-card-empty">No preview</span>
                )}
                <Link href={`/studio/${product.missionId}`} className="fhis-btn">
                  Open Studio
                </Link>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="mc-card" id="creation-map">
        <h2 className="mc-card-title">Creation Map</h2>
        <div className="ccc-map">
          {model.mapNodes.map((node) => (
            <div key={node.id} className="ccc-map-node">
              <strong>{node.label}</strong>
              <span>{node.status}</span>
              <span>{node.reality}</span>
              {node.version ? <span>v{node.version}</span> : null}
              {node.blocker ? <span>{node.blocker}</span> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="ccc-grid" id="visual-outputs" aria-label="Visual outputs">
        {model.visualOutputs.length === 0 ? (
          <article className="mc-card">
            <h3 className="mc-card-title">Visual Outputs</h3>
            <p className="mc-card-empty">No Brand/Website/WebApp/Mobile outputs yet.</p>
          </article>
        ) : (
          model.visualOutputs.map((visual) => (
            <article key={visual.id} className="mc-card">
              <h3 className="mc-card-title">{visual.title}</h3>
              <p className="mc-card-body">
                {visual.kind} · {visual.status} · {visual.reality}
              </p>
              <div className="ccc-actions">
                {visual.previewUrl ? (
                  <button type="button" className="fhis-btn" onClick={() => setPreviewTarget({ title: visual.title, href: visual.previewUrl! })}>
                    Fullscreen Preview
                  </button>
                ) : (
                  <span className="mc-card-empty">No preview available</span>
                )}
                <Link href={`/studio/${visual.missionId}/preview`} className="fhis-btn">
                  Studio Preview
                </Link>
                <Link href={`/studio/${visual.missionId}`} className="fhis-btn">
                  Compare in Studio
                </Link>
              </div>
            </article>
          ))
        )}
      </section>

      {showDetailed ? (
        <>
          <section className="ccc-grid">
            <article className="mc-card" id="technical-foundation">
              <h2 className="mc-card-title">Technical Foundation</h2>
              {model.technicalFoundation.length === 0 ? (
                <p className="mc-card-empty">Technical foundation not created yet.</p>
              ) : (
                <ul className="mc-list">
                  {model.technicalFoundation.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </article>
            <article className="mc-card" id="business-assets">
              <h2 className="mc-card-title">Business Assets</h2>
              {model.businessAssets.length === 0 ? (
                <p className="mc-card-empty">Business assets not created yet.</p>
              ) : (
                <ul className="mc-list">
                  {model.businessAssets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </article>
          </section>
          <section className="ccc-grid">
            <article className="mc-card" id="qa">
              <h2 className="mc-card-title">QA / Validation</h2>
              <ul className="mc-list">
                {model.qa.map((q) => (
                  <li key={q.id}>
                    {q.label}: {q.status}
                    {q.detail ? ` (${q.detail})` : ""}
                  </li>
                ))}
              </ul>
            </article>
            <article className="mc-card" id="release-deployment">
              <h2 className="mc-card-title">Release + Deployment</h2>
              <p className="mc-card-body">
                Release: {model.release.version || "N/A"} · {model.release.status} · {model.release.reality}
              </p>
              <p className="mc-card-body">
                Deployment: {model.deployment.status} ({model.deployment.reality})
                {model.deployment.environment ? ` · ${model.deployment.environment}` : ""}
              </p>
              {model.deployment.status === "NOT_CREATED" ? <p className="mc-card-empty">Deployment plan not configured.</p> : null}
              {model.release.status === "NOT_CREATED" ? <p className="mc-card-empty">Release unavailable.</p> : null}
            </article>
          </section>
        </>
      ) : null}

      <section className="ccc-grid" id="activity">
        <article className="mc-card">
          <h2 className="mc-card-title">Timeline</h2>
          {model.timeline.length === 0 ? (
            <p className="mc-card-empty">No activity events yet.</p>
          ) : (
            <ul className="mc-list">
              {model.timeline.slice(0, 10).map((t) => (
                <li key={t.id}>
                  {t.label} · {t.kind}
                  {t.at ? ` · ${t.at}` : ""}
                </li>
              ))}
            </ul>
          )}
        </article>
        <article className="mc-card">
          <h2 className="mc-card-title">Blockers / Approvals / Next Actions</h2>
          {model.blockers.length === 0 && model.approvals.length === 0 ? (
            <p className="mc-card-empty">No blockers or approvals.</p>
          ) : (
            <ul className="mc-list">
              {model.blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
              {model.approvals.map((a) => (
                <li key={a.id}>
                  Approval: {a.label} · {a.status}
                </li>
              ))}
            </ul>
          )}
          <div className="ccc-actions">
            {model.nextActions.map((action) => (
              <Link key={`footer-${action.id}`} href={action.href} className="fhis-btn">
                {action.label}
              </Link>
            ))}
            {primaryMissionId ? (
              <Link href={`/missions/${primaryMissionId}?section=decisions`} className="fhis-btn fhis-btn-primary">
                Request Change
              </Link>
            ) : null}
          </div>
        </article>
      </section>

      <section className="mc-card" id="section-statuses">
        <h2 className="mc-card-title">Section Classifications</h2>
        {sections.length === 0 ? (
          <p className="mc-card-empty">No sections match current filters.</p>
        ) : (
          <ul className="mc-list">
            {sections.map((section) => (
              <li key={section.id}>
                {section.label}: {section.reality} · {section.readiness}
              </li>
            ))}
          </ul>
        )}
      </section>

      {previewTarget ? (
        <div className="ccc-modal" role="dialog" aria-modal="true" aria-label={`Preview ${previewTarget.title}`}>
          <div className="ccc-modal-panel">
            <div className="ccc-modal-header">
              <h2 className="mc-card-title">{previewTarget.title}</h2>
              <button type="button" className="fhis-btn" onClick={() => setPreviewTarget(null)}>
                Close
              </button>
            </div>
            <iframe title={previewTarget.title} src={previewTarget.href} className="ccc-modal-frame" />
            <p className="mc-card-body">
              <a href={previewTarget.href} target="_blank" rel="noreferrer" className="mc-link">
                Open in new tab
              </a>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
