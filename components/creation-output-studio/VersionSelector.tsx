"use client";

import type { CreationOutput } from "@/lib/creation-output/types";
import { Badge } from "@/components/ui/fhis/Badge";

interface Props {
  versions: CreationOutput[];
  selectedVersion?: string;
  onSelect: (output: CreationOutput) => void;
  onCompare?: (a: CreationOutput, b: CreationOutput) => void;
}

export function VersionSelector({ versions, selectedVersion, onSelect, onCompare }: Props) {
  if (versions.length <= 1) {
    return (
      <div style={{ fontSize: "0.8rem", color: "var(--fhis-color-text-muted)" }}>
        Versión única: v{versions[0]?.version ?? "1.0.0"}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontSize: "0.8rem", fontWeight: 500 }}>Versiones:</span>
      {versions.map((v) => (
        <button
          key={v.outputId}
          type="button"
          onClick={() => onSelect(v)}
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            border: `1px solid ${selectedVersion === v.version ? "var(--fhis-color-accent)" : "var(--fhis-color-border)"}`,
            background: selectedVersion === v.version ? "var(--fhis-color-accent-subtle)" : "transparent",
            cursor: "pointer",
            fontSize: "0.8rem",
          }}
        >
          v{v.version}
          {v.status === "APPROVED" && (
            <Badge variant="accent" className="ml-1">
              ✓
            </Badge>
          )}
        </button>
      ))}
      {versions.length >= 2 && onCompare && (
        <button
          type="button"
          className="fhis-btn fhis-btn-ghost fhis-btn-sm"
          onClick={() => onCompare(versions[1], versions[0])}
        >
          Comparar A vs B
        </button>
      )}
    </div>
  );
}
