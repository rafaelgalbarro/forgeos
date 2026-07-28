"use client";

import { useEffect, useState } from "react";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import {
  listDesignPartnerEvents,
  listAnalyticsEvents,
  getAiUsageSummary,
  getAiUsageByTask,
} from "@/lib/design-partners";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";

const EVENT_LABELS: Record<string, string> = {
  dp_page_view: "Vista DP",
  dp_journey_stage: "Journey",
  dp_feedback_view: "Feedback",
  dp_roadmap_vote: "Voto roadmap",
  dp_feature_request: "Feature request",
  dp_issue_report: "Issue",
  dp_nps_submit: "NPS",
  dp_dashboard_view: "Dashboard",
  dp_executive_report_view: "Informe ejecutivo",
  page_view: "Vista de página",
};

export function UsageAnalyticsPanel() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dpEvents = mounted ? listDesignPartnerEvents().slice(-15).reverse() : [];
  const betaEvents = mounted ? listAnalyticsEvents().slice(-10).reverse() : [];
  const ai = mounted ? getAiUsageSummary() : null;
  const byTask = mounted ? getAiUsageByTask().slice(0, 5) : [];

  return (
    <Stack gap="md">
      {ai && (
        <Panel className="fhis-beta-kpi-grid">
          <KpiBlock label="Eventos DP" value={dpEvents.length} />
          <KpiBlock label="Eventos Beta" value={betaEvents.length} />
          <KpiBlock label="Solicitudes AI" value={ai.requestCount} />
          <KpiBlock label="Coste AI (USD)" value={ai.totalCostUsd.toFixed(2)} />
        </Panel>
      )}

      <Panel>
        <h3 className="fhis-beta-panel-title">Eventos Design Partners</h3>
        <div className="fhis-beta-analytics-list">
          {dpEvents.length === 0 ? (
            <p className="fhis-beta-empty">Sin eventos DP — navega por las rutas del programa.</p>
          ) : (
            dpEvents.map((ev) => (
              <div key={ev.id} className="fhis-beta-analytics-row">
                <Badge variant="default">{EVENT_LABELS[ev.event] ?? ev.event}</Badge>
                <span className="fhis-beta-analytics-path">{ev.path ?? ev.label ?? ev.stage ?? "—"}</span>
                <time className="fhis-beta-analytics-time">
                  {new Date(ev.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </time>
              </div>
            ))
          )}
        </div>
      </Panel>

      {byTask.length > 0 && (
        <Panel>
          <h3 className="fhis-beta-panel-title">Uso AI por tarea</h3>
          {byTask.map((t) => (
            <div key={t.task} className="fhis-beta-analytics-row">
              <span>{t.task}</span>
              <span>{t.count} req · {t.tokens} tokens · ${t.cost.toFixed(3)}</span>
            </div>
          ))}
        </Panel>
      )}

      <p className="fhis-beta-signup-hint">
        Analytics almacenados en localStorage — sin SDK externo requerido.
      </p>
    </Stack>
  );
}
