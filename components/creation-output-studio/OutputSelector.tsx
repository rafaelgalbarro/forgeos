"use client";

import Link from "next/link";
import type { CreationOutput, CreationOutputType } from "@/lib/creation-output/types";
import { OUTPUT_TYPE_ICONS, OUTPUT_TYPE_LABELS } from "@/lib/creation-output/types";
import { Badge } from "@/components/ui/fhis/Badge";

interface Props {
  outputs: CreationOutput[];
  selectedId?: string;
  onSelect: (output: CreationOutput) => void;
}

function statusVariant(status: CreationOutput["status"]): "accent" | "default" | "amber" {
  if (status === "APPROVED" || status === "EXPORT_READY" || status === "DEPLOYMENT_READY" || status === "PREVIEW_READY")
    return "accent";
  if (status === "GENERATING" || status === "VALIDATING" || status === "CHANGES_REQUESTED") return "amber";
  return "default";
}

export function OutputSelector({ outputs, selectedId, onSelect }: Props) {
  const latestByType = new Map<CreationOutputType, CreationOutput>();
  for (const o of outputs) {
    if (!latestByType.has(o.type)) latestByType.set(o.type, o);
  }

  const cards = Array.from(latestByType.values());

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {cards.map((output) => (
        <button
          key={output.outputId}
          type="button"
          onClick={() => onSelect(output)}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: `2px solid ${selectedId === output.outputId ? "var(--fhis-color-accent, #2563eb)" : "var(--fhis-color-border, #eee)"}`,
            background: selectedId === output.outputId ? "var(--fhis-color-accent-subtle, #eff6ff)" : "#fff",
            cursor: "pointer",
            textAlign: "left",
            minWidth: 140,
          }}
        >
          <div style={{ fontSize: "1.1rem" }}>{OUTPUT_TYPE_ICONS[output.type]}</div>
          <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{OUTPUT_TYPE_LABELS[output.type]}</div>
          <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
            <Badge variant={statusVariant(output.status)}>{output.status}</Badge>
            <span style={{ fontSize: "0.7rem", color: "var(--fhis-color-text-muted)" }}>v{output.version}</span>
          </div>
        </button>
      ))}
      {cards.length === 0 && (
        <p style={{ fontSize: "0.875rem", color: "var(--fhis-color-text-muted)" }}>
          Sin outputs. <Link href="/mission-control">Volver a Mission Control</Link>
        </p>
      )}
    </div>
  );
}
