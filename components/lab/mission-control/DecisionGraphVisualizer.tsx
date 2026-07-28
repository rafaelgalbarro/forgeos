"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/fhis/Badge";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { Status } from "@/components/ui/fhis/Status";
import { cn } from "@/lib/design-system/cn";
import type { ExecutiveGraphNode } from "@/lib/ai-orchestration/types";
import { DECISION_GRAPH_FLOW } from "./types";
import {
  MetricRow,
  SectionTitle,
  TechnicalToggle,
  confidenceColor,
  formatPct,
} from "./shared";

interface Props {
  nodes: ExecutiveGraphNode[];
}

function nodeForFlowStep(step: string, nodes: ExecutiveGraphNode[]): ExecutiveGraphNode | undefined {
  const lower = step.toLowerCase();
  return nodes.find(
    (n) =>
      n.nodeType.toLowerCase().includes(lower) ||
      n.title.toLowerCase().includes(lower) ||
      (lower === "decision" && n.nodeType === "Decision") ||
      (lower === "consensus" && n.title.toLowerCase().includes("consensus"))
  );
}

export function DecisionGraphVisualizer({ nodes }: Props) {
  const [selected, setSelected] = useState<ExecutiveGraphNode | null>(null);

  return (
    <Panel>
      <SectionTitle>Decision Graph</SectionTitle>
      <Stack gap="md">
        <div className="fhis-mc-graph-flow" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
          {DECISION_GRAPH_FLOW.map((step, i) => {
            const linked = nodeForFlowStep(step, nodes);
            const isFuture = step === "Build";
            const isClickable = !!linked;

            return (
              <div key={step} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => linked && setSelected(linked)}
                  className={cn("fhis-mc-graph-node")}
                  style={{
                    width: "100%",
                    maxWidth: 280,
                    padding: "var(--fhis-space-2) var(--fhis-space-3)",
                    border: "1px solid var(--fhis-color-border, #333)",
                    borderRadius: "var(--fhis-radius-sm, 4px)",
                    background: isFuture
                      ? "transparent"
                      : linked
                        ? "var(--fhis-color-surface-2, #1a1a1a)"
                        : "var(--fhis-color-surface-1, #0d0d0d)",
                    opacity: isFuture ? 0.4 : 1,
                    cursor: isClickable ? "pointer" : "default",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{step}</div>
                  {linked && (
                    <div style={{ fontSize: "0.7rem", opacity: 0.7, marginTop: 2 }}>
                      {linked.nodeType} · {formatPct(linked.confidence)}
                    </div>
                  )}
                  {isFuture && (
                    <Badge variant="default" className="fhis-mt-1">
                      Epic 3.3
                    </Badge>
                  )}
                </button>
                {i < DECISION_GRAPH_FLOW.length - 1 && (
                  <div style={{ width: 2, height: 16, background: "var(--fhis-color-border, #333)" }} />
                )}
              </div>
            );
          })}
        </div>

        {selected && (
          <div
            style={{
              padding: "var(--fhis-space-3)",
              border: "1px solid var(--fhis-color-border, #333)",
              borderRadius: "var(--fhis-radius-sm, 4px)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--fhis-space-2)" }}>
              <strong>{selected.title}</strong>
              <Status status="success" label={selected.nodeType} />
            </div>
            <Stack gap="sm">
              <MetricRow label="Confianza" value={<span style={{ color: confidenceColor(selected.confidence) }}>{formatPct(selected.confidence)}</span>} />
              <MetricRow label="Impacto" value={selected.impact} />
              <MetricRow label="Reversible" value={selected.reversible ? "Sí" : "No"} />
              <MetricRow label="Dependencias" value={selected.dependencies.length > 0 ? selected.dependencies.join(", ") : "—"} />
              <MetricRow label="Creado" value={new Date(selected.createdAt).toLocaleString()} />
              <p style={{ margin: 0, fontSize: "0.8125rem" }}>{selected.rationale}</p>
            </Stack>
            <TechnicalToggle label="Ver nodo técnico" data={selected} />
          </div>
        )}

        {nodes.length > 0 && (
          <TechnicalToggle label="Ver todos los nodos (JSON)" data={nodes} />
        )}

        {nodes.length === 0 && (
          <p style={{ opacity: 0.7, margin: 0, fontSize: "0.875rem" }}>Sin nodos en grafo — ejecuta el runtime.</p>
        )}
      </Stack>
    </Panel>
  );
}
