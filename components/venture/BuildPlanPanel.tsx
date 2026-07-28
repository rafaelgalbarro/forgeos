"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import type { VentureProject } from "@/lib/domain/venture";
import { generateBuildPlan } from "@/lib/build-plan";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Grid } from "@/components/ui/fhis/Layout";

interface BuildPlanPanelProps {
  venture: VentureProject;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
      {copied ? "Copiado ✓" : label}
    </Button>
  );
}

export function BuildPlanPanel({ venture }: BuildPlanPanelProps) {
  const plan = useMemo(() => generateBuildPlan(venture), [venture]);

  return (
    <div className="build-plan-panel">
      <SectionHeader
        title="Build Plan"
        description="Paquete técnico listo para Cursor o Claude — handoff de implementación MVP."
      />

      <Panel>
        <SectionHeader title="Resumen técnico" />
        <p>{plan.technicalSummary}</p>
      </Panel>

      <Panel>
        <SectionHeader title="Stack recomendado" />
        <ul className="build-plan-stack-list">
          {plan.recommendedStack.map((item) => (
            <li key={item.layer}>
              <strong>{item.layer}</strong> — {item.technology}
              <span>{item.rationale}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Grid cols={2} gap="md">
        <Panel>
          <SectionHeader title="Módulos" />
          <ul className="build-plan-tags">
            {plan.technicalModules.map((m) => (
              <li key={m}><Badge variant="default">{m}</Badge></li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <SectionHeader title="Entidades" />
          <ul className="build-plan-tags">
            {plan.mainEntities.map((e) => (
              <li key={e}><Badge variant="blue">{e}</Badge></li>
            ))}
          </ul>
        </Panel>
      </Grid>

      <Panel>
        <SectionHeader title="APIs" />
        <table className="build-plan-table">
          <thead>
            <tr>
              <th>Método</th>
              <th>Ruta</th>
              <th>Descripción</th>
            </tr>
          </thead>
          <tbody>
            {plan.apis.map((api) => (
              <tr key={`${api.method}-${api.path}`}>
                <td><code>{api.method}</code></td>
                <td><code>{api.path}</code></td>
                <td>{api.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Grid cols={2} gap="md">
        <Panel>
          <SectionHeader title="Pantallas" />
          <ul className="build-plan-list">
            {plan.screens.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <SectionHeader title="Componentes frontend" />
          <ul className="build-plan-list">
            {plan.frontendComponents.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </Panel>
      </Grid>

      <Panel>
        <SectionHeader title="Orden de implementación" />
        <ol className="build-plan-ordered">
          {plan.implementationOrder.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </Panel>

      <Panel>
        <SectionHeader title="Checklist MVP" />
        <ul className="build-plan-checklist">
          {plan.mvpChecklist.map((item) => (
            <li key={item.id} className={clsx(`check-priority-${item.priority}`)}>
              <Badge variant={item.priority === "alta" ? "red" : item.priority === "media" ? "amber" : "default"}>
                {item.priority}
              </Badge>
              <span>{item.task}</span>
              <em>{item.phase}</em>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <SectionHeader title="Riesgos técnicos" />
        <ul className="build-plan-list">
          {plan.technicalRisks.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </Panel>

      <Panel className="build-plan-prompt">
        <div className="build-plan-prompt-header">
          <SectionHeader title="Prompt Cursor" />
          <CopyButton text={plan.cursorPrompt} label="Copiar prompt Cursor" />
        </div>
        <pre className="build-plan-prompt-body">{plan.cursorPrompt}</pre>
      </Panel>

      <Panel className="build-plan-prompt">
        <div className="build-plan-prompt-header">
          <SectionHeader title="Prompt Claude" />
          <CopyButton text={plan.claudePrompt} label="Copiar prompt Claude" />
        </div>
        <pre className="build-plan-prompt-body">{plan.claudePrompt}</pre>
      </Panel>
    </div>
  );
}
