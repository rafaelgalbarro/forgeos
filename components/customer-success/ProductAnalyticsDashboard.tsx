"use client";

import { useEffect, useState } from "react";
import { Panel, Grid } from "@/components/ui/fhis/Layout";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import {
  getProductMetrics,
  getSessionSummary,
  getAiUsageAnalytics,
  trackDesignPartnerPageView,
  trackSessionPageView,
} from "@/lib/customer-success";
import { readSession } from "@/lib/auth/session-store";
import { CustomerSuccessShell } from "./CustomerSuccessShell";
import { getDemoHeatmapStructure } from "@/lib/customer-success/heatmaps";

export function ProductAnalyticsDashboard() {
  const [metrics, setMetrics] = useState<ReturnType<typeof getProductMetrics> | null>(null);
  const [sessions, setSessions] = useState<ReturnType<typeof getSessionSummary> | null>(null);
  const [ai, setAi] = useState<ReturnType<typeof getAiUsageAnalytics> | null>(null);

  useEffect(() => {
    const session = readSession();
    trackDesignPartnerPageView("/product-analytics", session?.userId, session?.activeWorkspaceId);
    trackSessionPageView("/product-analytics");
    setMetrics(getProductMetrics());
    setSessions(getSessionSummary());
    setAi(getAiUsageAnalytics());
  }, []);

  return (
    <CustomerSuccessShell
      title="Analytics de producto"
      description="Eventos, sesiones, uso de IA y rutas más visitadas — localStorage"
    >
      {metrics && sessions && ai && (
        <>
          <Grid cols={4} gap="md" className="fhis-beta-kpi-grid">
            <Panel className="fhis-beta-kpi">
              <KpiBlock label="Eventos totales" value={metrics.totalEvents} />
            </Panel>
            <Panel className="fhis-beta-kpi">
              <KpiBlock label="Eventos DP" value={metrics.dpEventCount} />
            </Panel>
            <Panel className="fhis-beta-kpi">
              <KpiBlock label="Sesiones" value={sessions.sessionCount} />
            </Panel>
            <Panel className="fhis-beta-kpi">
              <KpiBlock label="Páginas/sesión" value={sessions.pagesPerSession} />
            </Panel>
          </Grid>

          <Grid cols={2} gap="md">
            <Panel>
              <h3 className="fhis-beta-panel-title">Rutas más visitadas</h3>
              {metrics.topPaths.length === 0 ? (
                <p className="fhis-beta-empty">Sin datos de rutas aún.</p>
              ) : (
                metrics.topPaths.map((p) => (
                  <div key={p.path} className="fhis-beta-analytics-row">
                    <span>{p.path}</span>
                    <span>{p.count}</span>
                  </div>
                ))
              )}
            </Panel>

            <Panel>
              <h3 className="fhis-beta-panel-title">Eventos principales</h3>
              {metrics.topEvents.map((e) => (
                <div key={e.event} className="fhis-beta-analytics-row">
                  <span>{e.event}</span>
                  <span>{e.count}</span>
                </div>
              ))}
            </Panel>
          </Grid>

          <Panel>
            <h3 className="fhis-beta-panel-title">Uso de IA (telemetría)</h3>
            <div className="fhis-beta-kpi-grid">
              <span>Solicitudes: {ai.summary.requestCount}</span>
              <span>Tokens: {ai.summary.totalTokens}</span>
              <span>Coste: ${ai.summary.totalCostUsd.toFixed(2)}</span>
              <span>Latencia media: {ai.summary.avgLatencyMs}ms</span>
            </div>
            {ai.byTask.slice(0, 5).map((t) => (
              <div key={t.task} className="fhis-beta-analytics-row">
                <span>{t.task}</span>
                <span>{t.count} req · ${t.cost.toFixed(2)}</span>
              </div>
            ))}
          </Panel>

          <Panel>
            <h3 className="fhis-beta-panel-title">Heatmap (estructura stub)</h3>
            {getDemoHeatmapStructure().map((z) => (
              <div key={z.id} className="fhis-beta-analytics-row">
                <span>
                  {z.page} · {z.zone}
                </span>
                <span>
                  {z.clicks} clics · intensidad {z.intensity}%
                </span>
              </div>
            ))}
          </Panel>
        </>
      )}
    </CustomerSuccessShell>
  );
}
