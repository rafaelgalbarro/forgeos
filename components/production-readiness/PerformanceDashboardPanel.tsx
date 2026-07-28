"use client";

import { Panel, Stack, SectionHeader, Grid, KpiBlock } from "@/components/ui/fhis";
import { collectPerformanceMetrics, collectMetrics, listErrorLogs } from "@/lib/production-readiness";

export function PerformanceDashboardPanel() {
  const perf = collectPerformanceMetrics();
  const metrics = collectMetrics();
  const errors = listErrorLogs();

  return (
    <Stack gap="lg" className="fhis-prod-performance">
      {perf.stub && (
        <p className="fhis-prod-muted">Métricas en modo stub — activar ENABLE_PRODUCTION_METRICS=true</p>
      )}

      <Grid cols={4} gap="md">
        <KpiBlock label="Req/min" value={perf.requestsPerMinute} />
        <KpiBlock label="Latencia avg" value={`${perf.avgLatencyMs}ms`} />
        <KpiBlock label="P95" value={`${perf.p95LatencyMs}ms`} />
        <KpiBlock label="Error rate" value={`${(perf.errorRate * 100).toFixed(1)}%`} />
      </Grid>

      <Panel>
        <SectionHeader title="Contadores" />
        <ul className="fhis-prod-list">
          {metrics.map((m) => (
            <li key={m.name} className="fhis-prod-check-row">
              <span>{m.name}</span>
              <strong>{m.value} {m.unit}</strong>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <SectionHeader title="Errores recientes" subtitle={`${errors.length} entradas`} />
        {errors.length === 0 ? (
          <p className="fhis-prod-text">Sin errores registrados.</p>
        ) : (
          <ul className="fhis-prod-list">
            {errors.slice(0, 10).map((e) => (
              <li key={e.id} className="fhis-prod-error-row">
                <span className="fhis-prod-muted">{e.source}</span>
                <span>{e.message}</span>
                <span className="fhis-prod-muted">×{e.count}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </Stack>
  );
}
