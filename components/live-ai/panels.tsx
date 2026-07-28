"use client";

import { Badge } from "@/components/ui/fhis/Badge";
import { Status } from "@/components/ui/fhis/Status";
import { cn } from "@/lib/design-system/cn";
import type { LiveAiRuntimeSnapshot } from "@/lib/live-ai";
import type { LiveAiPanelId, PanelState } from "@/lib/live-ai";
import { PANEL_LABELS } from "@/lib/live-ai";

interface PanelShellProps {
  panelId: LiveAiPanelId;
  state: PanelState;
  children: React.ReactNode;
  className?: string;
}

function PanelShell({ panelId, state, children, className }: PanelShellProps) {
  const statusMap = {
    idle: "pending" as const,
    active: "active" as const,
    done: "success" as const,
    error: "warning" as const,
  };

  return (
    <div
      className={cn(
        "fhis-live-panel",
        state.highlight && "fhis-live-panel--active",
        state.status === "done" && "fhis-live-panel--done",
        className,
      )}
    >
      <div className="fhis-live-panel-header">
        <strong>{PANEL_LABELS[panelId]}</strong>
        <Status status={statusMap[state.status]} label={state.status} />
      </div>
      <div className="fhis-live-panel-body">{children}</div>
      {state.messages.length > 0 && (
        <div className="fhis-live-panel-messages">
          {state.messages.slice(-2).map((m) => (
            <div key={m.id} className={cn("fhis-live-msg", `fhis-live-msg--${m.kind}`)}>
              {m.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface PanelsProps {
  panels: Record<LiveAiPanelId, PanelState>;
  runtime: LiveAiRuntimeSnapshot;
  ventureName: string | null;
}

export function LiveAiPanels({ panels, runtime, ventureName }: PanelsProps) {
  const boardDepts = runtime.departments.filter((d) => d.boardSeat).slice(0, 6);
  const activeDepts = runtime.departments.slice(0, 8);

  return (
    <div className="fhis-live-ops-grid">
      <PanelShell panelId="ceo" state={panels.ceo} className="fhis-live-panel--ceo">
        <p className="fhis-live-ceo-brief">
          {ventureName ? (
            <>Objetivo: <em>{ventureName}</em></>
          ) : (
            "Esperando comando del fundador…"
          )}
        </p>
        <Badge variant="default">Modo simulación</Badge>
      </PanelShell>

      <PanelShell panelId="mesh" state={panels.mesh}>
        <div className="fhis-live-mesh-grid">
          {boardDepts.map((d) => (
            <span key={d.id} className="fhis-live-mesh-node">
              {d.label}
            </span>
          ))}
        </div>
      </PanelShell>

      <PanelShell panelId="departments" state={panels.departments}>
        <div className="fhis-live-dept-list">
          {activeDepts.map((d) => (
            <div key={d.id} className="fhis-live-dept-item">
              <span>{d.label}</span>
              <span className="fhis-live-dept-role">{d.role}</span>
            </div>
          ))}
        </div>
      </PanelShell>

      <PanelShell panelId="research" state={panels.research}>
        <ul className="fhis-live-list">
          <li>TAM mercado: €2.1B</li>
          <li>Competidores: 3 identificados</li>
          <li>Segmento: pymes logística</li>
        </ul>
      </PanelShell>

      <PanelShell panelId="build" state={panels.build}>
        <ul className="fhis-live-list">
          <li>Scaffold Next.js</li>
          <li>API routes</li>
          <li>Schema Postgres</li>
          <li>Preview URL (simulado)</li>
        </ul>
      </PanelShell>

      <PanelShell panelId="capabilities" state={panels.capabilities}>
        <div className="fhis-live-cap-list">
          {runtime.capabilities.slice(0, 5).map((c) => (
            <div key={c.id} className="fhis-live-cap-item">
              <strong>{c.name}</strong>
              <Badge variant="default">{c.category}</Badge>
            </div>
          ))}
        </div>
      </PanelShell>

      <PanelShell panelId="skills" state={panels.skills}>
        <div className="fhis-live-skill-tags">
          {["github", "vercel", "stripe", "openai", "postgres"].map((s) => (
            <Badge key={s} variant="accent">{s}</Badge>
          ))}
        </div>
      </PanelShell>

      <PanelShell panelId="runtime" state={panels.runtime}>
        <div className="fhis-live-runtime-stats">
          <span>Fuente: {runtime.source}</span>
          {runtime.observability && (
            <span>Health: {runtime.observability.overallHealth}</span>
          )}
          <span>Componentes: 9</span>
        </div>
      </PanelShell>

      <PanelShell panelId="taskQueue" state={panels.taskQueue}>
        {runtime.queue ? (
          <div className="fhis-live-queue">
            <div className="fhis-live-queue-metrics">
              <span>Ready: {runtime.queue.metrics.ready}</span>
              <span>Running: {runtime.queue.metrics.running}</span>
              <span>Done: {runtime.queue.metrics.completed}</span>
            </div>
            {runtime.queue.tasks.slice(0, 4).map((t) => (
              <div key={t.id} className="fhis-live-queue-task">
                <Badge variant="default">{t.status}</Badge>
                {t.label}
              </div>
            ))}
          </div>
        ) : (
          <span>Sin datos de cola</span>
        )}
      </PanelShell>

      <PanelShell panelId="workers" state={panels.workers}>
        {runtime.workers.length > 0 ? (
          runtime.workers.slice(0, 4).map((w) => (
            <div key={w.id} className="fhis-live-worker">
              <strong>{w.name}</strong>
              <Badge variant="default">{w.status}</Badge>
            </div>
          ))
        ) : (
          <span>Workers no disponibles — mock</span>
        )}
      </PanelShell>

      <PanelShell panelId="memory" state={panels.memory}>
        {runtime.memoryRecords.map((m) => (
          <div key={m.id} className="fhis-live-memory-item">
            <Badge variant="default">{m.type}</Badge>
            {m.summary}
          </div>
        ))}
      </PanelShell>

      <PanelShell panelId="decisionGraph" state={panels.decisionGraph}>
        <div className="fhis-live-dg-flow">
          {runtime.decisionNodes.map((n, i) => (
            <div key={n.id} className="fhis-live-dg-node">
              {i > 0 && <span className="fhis-live-dg-arrow">↓</span>}
              <span>{n.title}</span>
              <span className="fhis-live-dg-conf">{(n.confidence * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </PanelShell>

      <PanelShell panelId="timeline" state={panels.timeline}>
        <p className="fhis-live-timeline-hint">
          Ver pipeline animado en panel inferior
        </p>
      </PanelShell>
    </div>
  );
}
