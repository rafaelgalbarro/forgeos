"use client";

import Link from "next/link";
import type { MultiOutputPlan, PlannedOutput, MultiOutputKind } from "@/lib/multi-output/types";
import { getDependenciesFor } from "@/lib/multi-output/output-dependency-graph";
import { Badge } from "@/components/ui/fhis/Badge";

interface Props {
  plan: MultiOutputPlan;
  onSelectKind?: (kind: MultiOutputKind) => void;
  selectedKind?: MultiOutputKind;
}

function statusVariant(status: PlannedOutput["status"]): "accent" | "default" | "amber" {
  if (status === "aprobado" || status === "preview" || status === "desplegado") return "accent";
  if (status === "generando" || status === "bloqueado" || status === "fallido") return "amber";
  return "default";
}

function TreeNode({
  output,
  allOutputs,
  depth,
  onSelect,
  selectedKind,
}: {
  output: PlannedOutput;
  allOutputs: PlannedOutput[];
  depth: number;
  onSelect?: (kind: MultiOutputKind) => void;
  selectedKind?: MultiOutputKind;
}) {
  if (output.requirement === "excluded") return null;

  const deps = getDependenciesFor(output.kind).filter((d) =>
    allOutputs.some((o) => o.kind === d && o.requirement !== "excluded")
  );

  const isSelected = selectedKind === output.kind;

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <button
        type="button"
        onClick={() => onSelect?.(output.kind)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          marginBottom: 4,
          borderRadius: 6,
          border: `1px solid ${isSelected ? "var(--fhis-color-accent, #2563eb)" : "var(--fhis-color-border, #eee)"}`,
          background: isSelected ? "var(--fhis-color-accent-subtle, #eff6ff)" : "#fff",
          cursor: onSelect ? "pointer" : "default",
          width: "100%",
          textAlign: "left",
        }}
      >
        <span>{output.icon}</span>
        <span style={{ fontWeight: 600, fontSize: "0.85rem", flex: 1 }}>{output.label}</span>
        <Badge variant={statusVariant(output.status)}>{output.status}</Badge>
        <span style={{ fontSize: "0.65rem", color: "var(--fhis-color-text-muted)" }}>v{output.version}</span>
        {output.health === "error" && <span title="Error">🔴</span>}
        {output.health === "warning" && <span title="Warning">🟡</span>}
        {output.warnings.length > 0 && (
          <span title={output.warnings.join("; ")} style={{ fontSize: "0.65rem" }}>⚠️{output.warnings.length}</span>
        )}
      </button>
      {output.blockedReason && (
        <div style={{ fontSize: "0.7rem", color: "#dc2626", marginLeft: 24, marginBottom: 4 }}>
          Bloqueado: {output.blockedReason}
        </div>
      )}
      {deps.length > 0 && depth < 3 && (
        <div style={{ borderLeft: "2px solid var(--fhis-color-border, #eee)", marginLeft: 8 }}>
          {deps.map((depKind) => {
            const depOutput = allOutputs.find((o) => o.kind === depKind);
            if (!depOutput) return null;
            return (
              <TreeNode
                key={depKind}
                output={depOutput}
                allOutputs={allOutputs}
                depth={depth + 1}
                onSelect={onSelect}
                selectedKind={selectedKind}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function MultiOutputTreeMap({ plan, onSelectKind, selectedKind }: Props) {
  const venture = plan.outputs.find((o) => o.kind === "VENTURE");
  const active = plan.outputs.filter((o) => o.requirement !== "excluded");
  const excluded = plan.outputs.filter((o) => o.requirement === "excluded");

  return (
    <div style={{ padding: 16, borderRadius: 8, border: "1px solid var(--fhis-color-border)", background: "#fafafa" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: "0.95rem" }}>Árbol de entregables</h3>
        <span style={{ fontSize: "0.7rem", color: "var(--fhis-color-text-muted)" }}>
          {active.length} activos · {excluded.length} excluidos · ~{plan.estimatedMinutes}min
        </span>
      </div>

      {venture && venture.requirement !== "excluded" && (
        <TreeNode
          output={venture}
          allOutputs={plan.outputs}
          depth={0}
          onSelect={onSelectKind}
          selectedKind={selectedKind}
        />
      )}

      {active
        .filter((o) => o.kind !== "VENTURE")
        .map((o) => (
          <TreeNode
            key={o.kind}
            output={o}
            allOutputs={plan.outputs}
            depth={0}
            onSelect={onSelectKind}
            selectedKind={selectedKind}
          />
        ))}

      {excluded.length > 0 && (
        <details style={{ marginTop: 12, fontSize: "0.75rem" }}>
          <summary style={{ cursor: "pointer", color: "var(--fhis-color-text-muted)" }}>
            {excluded.length} excluidos
          </summary>
          <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
            {excluded.map((o) => (
              <li key={o.kind}>
                {o.icon} {o.label} — {plan.excludedReasons[o.kind] ?? "No requerido"}
              </li>
            ))}
          </ul>
        </details>
      )}

      {plan.monorepoRecommended && plan.monorepoStructure && (
        <details style={{ marginTop: 8, fontSize: "0.75rem" }}>
          <summary style={{ cursor: "pointer" }}>Monorepo sugerido</summary>
          <ul style={{ margin: "4px 0 0", paddingLeft: 20, fontFamily: "monospace" }}>
            {plan.monorepoStructure.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </details>
      )}

      <div style={{ marginTop: 8 }}>
        <Link href={`/mission-control/${plan.missionId}`} style={{ fontSize: "0.7rem" }}>
          ← Mission Control
        </Link>
      </div>
    </div>
  );
}
