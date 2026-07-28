"use client";

import { Panel } from "@/components/ui/fhis/Layout";
import { Badge } from "@/components/ui/fhis/Badge";
import type {
  TechnicalPlan,
  RiskAssessment,
  ProposedBranch,
  ProposedPullRequest,
} from "@/lib/self-evolution";

interface Props {
  plan: TechnicalPlan | undefined;
  risk: RiskAssessment | undefined;
  branch: ProposedBranch | undefined;
  pr: ProposedPullRequest | undefined;
}

export function ExecutionPlanView({ plan, risk, branch, pr }: Props) {
  if (!plan) return null;

  return (
    <Panel className="fhis-sevo-panel fhis-sevo-execution">
      <div className="fhis-sevo-panel-header">
        <h3 className="fhis-sevo-panel-title">Plan técnico & ejecución</h3>
        <Badge variant="amber">Solo con aprobación</Badge>
      </div>

      <section className="fhis-sevo-exec-section">
        <h4>Resumen</h4>
        <p>{plan.summary}</p>
      </section>

      {risk && (
        <section className="fhis-sevo-exec-section">
          <h4>Evaluación de riesgo</h4>
          <p>
            Riesgo global: <strong>{risk.overallRisk}</strong>
          </p>
          <ul className="fhis-sevo-checklist">
            {risk.factors.map((f) => (
              <li key={f.label}>
                {f.label} ({f.level}) — {f.mitigation}
              </li>
            ))}
          </ul>
          <p className="fhis-sevo-rollback">{risk.rollbackPlan}</p>
        </section>
      )}

      <section className="fhis-sevo-exec-section">
        <h4>Módulos afectados</h4>
        <ul className="fhis-sevo-tags">
          {plan.affectedModules.map((m) => (
            <li key={m}>
              <Badge variant="default">{m}</Badge>
            </li>
          ))}
        </ul>
      </section>

      {plan.affectedFiles.length > 0 && (
        <section className="fhis-sevo-exec-section">
          <h4>Archivos</h4>
          <ul className="fhis-sevo-file-list">
            {plan.affectedFiles.map((f) => (
              <li key={f}>
                <code>{f}</code>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="fhis-sevo-exec-section">
        <h4>Checklist de tests</h4>
        <ul className="fhis-sevo-checklist">
          {plan.testChecklist.map((t) => (
            <li key={t}>☐ {t}</li>
          ))}
        </ul>
      </section>

      <section className="fhis-sevo-exec-section">
        <h4>Checklist de ejecución</h4>
        <ul className="fhis-sevo-checklist">
          {plan.executionChecklist.map((t) => (
            <li key={t}>☐ {t}</li>
          ))}
        </ul>
      </section>

      {branch && (
        <section className="fhis-sevo-exec-section fhis-sevo-git-dry">
          <h4>Branch propuesto (dry-run)</h4>
          <code>{branch.branchName}</code>
          <p>{branch.description}</p>
        </section>
      )}

      {pr && (
        <section className="fhis-sevo-exec-section fhis-sevo-git-dry">
          <h4>PR propuesto (dry-run)</h4>
          <strong>{pr.title}</strong>
          <p className="fhis-sevo-pr-meta">
            {pr.branchName} → {pr.targetBranch}
          </p>
          <pre className="fhis-sevo-pr-body">{pr.body.slice(0, 400)}…</pre>
        </section>
      )}
    </Panel>
  );
}
