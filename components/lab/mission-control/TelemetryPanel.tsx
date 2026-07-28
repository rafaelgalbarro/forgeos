"use client";

import { Badge } from "@/components/ui/fhis/Badge";
import { Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import type { ExecutiveRuntimeLabResult } from "@/lib/lab/executive-runtime-lab";
import { MetricRow, SectionTitle, formatCost, formatMs } from "./shared";

interface Props {
  result: ExecutiveRuntimeLabResult | null;
}

export function TelemetryPanel({ result }: Props) {
  const runtime = result?.runtime;
  const obs = result?.observations ?? [];
  const totalTokens = obs.reduce((s, o) => s + o.estimatedTokens, 0);
  const totalCost = obs.reduce((s, o) => s + o.costEstimate, 0);
  const retries = result?.warnings.filter((w) => w.toLowerCase().includes("retry")).length ?? 0;
  const latestObs = obs[0];

  return (
    <Panel>
      <SectionTitle>Telemetry</SectionTitle>
      <Stack gap="md">
        <Grid cols={4} gap="sm">
          <KpiBlock label="Provider" value={result?.provider ?? runtime?.provider ?? "—"} />
          <KpiBlock label="Model" value={runtime?.model ?? latestObs?.model ?? "—"} />
          <KpiBlock label="Latency" value={formatMs(result?.latencyMs ?? 0)} />
          <KpiBlock label="Tokens" value={totalTokens.toLocaleString()} />
        </Grid>

        <Stack gap="sm">
          <MetricRow label="Prompt tokens (est.)" value={Math.round(totalTokens * 0.6).toLocaleString()} />
          <MetricRow label="Completion tokens (est.)" value={Math.round(totalTokens * 0.4).toLocaleString()} />
          <MetricRow label="Estimated Cost" value={formatCost(totalCost)} />
          <MetricRow label="Retries" value={retries} />
          <MetricRow
            label="Fallback"
            value={
              <Badge variant={result?.fallbackUsed ? "amber" : "accent"}>
                {result?.fallbackUsed ? "Sí" : "No"}
              </Badge>
            }
          />
          <MetricRow label="Execution Time" value={formatMs(result?.latencyMs ?? 0)} />
        </Stack>

        {(result?.warnings.length ?? 0) > 0 && (
          <div>
            <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>Warnings</span>
            <ul style={{ margin: "4px 0 0", paddingLeft: "1.25rem", fontSize: "0.8125rem" }}>
              {result!.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        <MetricRow
          label="Response Validator"
          value={
            <Badge variant={result?.error ? "default" : "accent"}>
              {result?.error ? "Falló parcialmente" : "OK"}
            </Badge>
          }
        />
      </Stack>
    </Panel>
  );
}
