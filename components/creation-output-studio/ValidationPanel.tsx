"use client";

import type { CreationOutput, VersionComparison } from "@/lib/creation-output/types";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";

interface Props {
  output: CreationOutput;
}

export function ValidationPanel({ output }: Props) {
  const v = output.validation;
  if (!v) {
    return (
      <Panel>
        <SectionHeader title="Validación" subtitle="Pendiente" />
        <p style={{ fontSize: "0.85rem", color: "var(--fhis-color-text-muted)" }}>Sin validación ejecutada.</p>
      </Panel>
    );
  }

  return (
    <Panel>
      <SectionHeader title="Validación" subtitle={`Score: ${v.score}% — ${v.passed ? "PASS" : "FAIL"}`} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {v.checks.map((c) => (
          <div key={c.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
            <span>{c.label}</span>
            <Badge variant={c.status === "pass" ? "accent" : c.status === "warn" ? "amber" : "default"}>
              {c.status}
            </Badge>
          </div>
        ))}
      </div>
    </Panel>
  );
}

interface CompareProps {
  comparison: VersionComparison | null;
}

export function VersionComparePanel({ comparison }: CompareProps) {
  if (!comparison) return null;

  return (
    <Panel>
      <SectionHeader
        title="Comparación de versiones"
        subtitle={`v${comparison.versionALabel} vs v${comparison.versionBLabel}`}
      />
      <div style={{ fontSize: "0.8rem" }}>
        <p>Score: {comparison.scoreBefore}% → {comparison.scoreAfter}%</p>
        {comparison.visualChanges.length > 0 && (
          <>
            <strong>Cambios visuales:</strong>
            <ul>{comparison.visualChanges.map((c, i) => <li key={i}>{c}</li>)}</ul>
          </>
        )}
        {comparison.functionalChanges.length > 0 && (
          <>
            <strong>Cambios funcionales:</strong>
            <ul>{comparison.functionalChanges.map((c, i) => <li key={i}>{c}</li>)}</ul>
          </>
        )}
        {comparison.risks.length > 0 && (
          <>
            <strong>Riesgos:</strong>
            <ul>{comparison.risks.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </>
        )}
      </div>
    </Panel>
  );
}
