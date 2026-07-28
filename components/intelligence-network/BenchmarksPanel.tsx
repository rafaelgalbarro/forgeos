"use client";

import { Badge } from "@/components/ui/fhis/Badge";
import { Card } from "@/components/ui/fhis/Card";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import type { BenchmarkResult } from "@/lib/network/types";
import { formatBenchmarkDeltaEs } from "@/lib/intelligence-network";

interface Props {
  benchmarks: BenchmarkResult;
}

function deltaVariant(delta: "above" | "below" | "inline"): "accent" | "amber" | "default" {
  if (delta === "above") return "accent";
  if (delta === "below") return "amber";
  return "default";
}

export function BenchmarksPanel({ benchmarks }: Props) {
  return (
    <Card className="fhis-network-benchmarks">
      <div className="fhis-network-panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3>Benchmarks agregados</h3>
        <Badge variant="default">{benchmarks.sampleSize} ventures anon.</Badge>
      </div>
      <p className="fhis-network-panel-desc" style={{ margin: "0.5rem 0 1rem" }}>
        Sector: <strong>{benchmarks.sector}</strong> · Crecimiento red:{" "}
        <strong>{benchmarks.growthRatePct}%</strong>
      </p>
      <div className="fhis-network-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem" }}>
        {benchmarks.metrics.map((m) => (
          <KpiBlock
            key={m.label}
            label={m.label}
            value={`${m.ventureValue} ${m.unit}`}
          />
        ))}
      </div>
      <ul className="fhis-network-metric-list" style={{ listStyle: "none", padding: 0, marginTop: "1rem" }}>
        {benchmarks.metrics.map((m) => (
          <li key={`delta-${m.label}`} style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0" }}>
            <span>{m.label}</span>
            <Badge variant={deltaVariant(m.delta)}>{formatBenchmarkDeltaEs(m.delta)}</Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}
