"use client";

import { Badge } from "@/components/ui/fhis/Badge";
import { Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { Status } from "@/components/ui/fhis/Status";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import type { ExecutiveRuntimeLabResult } from "@/lib/lab/executive-runtime-lab";
import {
  MetricRow,
  SectionTitle,
  confidenceColor,
  formatCost,
  formatMs,
  formatPct,
  sourceBadge,
} from "./shared";

interface Props {
  result: ExecutiveRuntimeLabResult | null;
  loading: boolean;
  error: string | null;
}

function runtimeStatus(loading: boolean, result: ExecutiveRuntimeLabResult | null, error: string | null) {
  if (loading) return { status: "active" as const, label: "Ejecutando" };
  if (error && !result?.runtime) return { status: "error" as const, label: "Error" };
  if (result?.runtime) return { status: "success" as const, label: "Completado" };
  if (result) return { status: "warning" as const, label: "Parcial" };
  return { status: "idle" as const, label: "Inactivo" };
}

export function ExecutiveRuntimeStatus({ result, loading, error }: Props) {
  const runtime = result?.runtime;
  const estado = runtimeStatus(loading, result, error);
  const confidence = result?.consensus?.confidence ?? result?.ceoBrief?.confidence;

  return (
    <Panel>
      <SectionTitle>Executive Runtime Status</SectionTitle>
      <Stack gap="md">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-2)", flexWrap: "wrap" }}>
          <Status status={estado.status} label={estado.label} />
          {runtime && sourceBadge(runtime.source)}
          {result?.fallbackUsed && <Badge variant="amber">Fallback</Badge>}
        </div>

        <Grid cols={4} gap="sm">
          <KpiBlock label="Provider" value={result?.provider ?? runtime?.provider ?? "—"} />
          <KpiBlock label="Modelo" value={runtime?.model ?? "—"} />
          <KpiBlock label="Latencia" value={formatMs(result?.latencyMs ?? 0)} />
          <KpiBlock
            label="Coste est."
            value={formatCost(result?.observations.reduce((s, o) => s + o.costEstimate, 0) ?? 0)}
          />
        </Grid>

        <Stack gap="sm">
          <MetricRow
            label="Confianza"
            value={
              confidence != null ? (
                <span style={{ color: confidenceColor(confidence) }}>{formatPct(confidence)}</span>
              ) : (
                "—"
              )
            }
          />
          <MetricRow label="Tiempo ejecución" value={formatMs(result?.latencyMs ?? 0)} />
          <MetricRow label="Session ID" value={<code style={{ fontSize: "0.7rem" }}>{runtime?.boardSessionId ?? "—"}</code>} />
          <MetricRow label="Decision ID" value={<code style={{ fontSize: "0.7rem" }}>{runtime?.decisionId ?? "—"}</code>} />
          <MetricRow label="Board Session" value={result?.boardSession?.sessionId ?? "—"} />
          <MetricRow label="Venture" value={result?.ventureId ?? "—"} />
        </Stack>
      </Stack>
    </Panel>
  );
}
