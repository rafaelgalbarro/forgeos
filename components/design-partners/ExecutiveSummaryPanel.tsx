"use client";

import { useEffect, useState } from "react";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { Button } from "@/components/ui/fhis/Button";
import { Badge } from "@/components/ui/fhis/Badge";
import {
  getLatestExecutiveReport,
  generateExecutiveReport,
  listExecutiveReports,
} from "@/lib/design-partners";
import type { ExecutiveReport } from "@/lib/design-partners";

export function ExecutiveSummaryPanel() {
  const [report, setReport] = useState<ExecutiveReport | null>(null);
  const [history, setHistory] = useState<ExecutiveReport[]>([]);

  const refresh = () => {
    setReport(getLatestExecutiveReport());
    setHistory(listExecutiveReports().slice(0, 5));
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleGenerate = () => {
    generateExecutiveReport();
    refresh();
  };

  return (
    <Stack gap="md">
      <div className="fhis-beta-invite-actions">
        <Button size="sm" onClick={handleGenerate}>
          Generar informe ejecutivo
        </Button>
      </div>

      {report ? (
        <Panel>
          <div className="fhis-beta-dashboard-header">
            <h3 className="fhis-beta-panel-title">{report.title}</h3>
            <Badge variant="accent">{report.period}</Badge>
          </div>
          <p>{report.summary}</p>
          <ul className="fhis-beta-perks">
            {report.highlights.map((h) => (
              <li key={h}>✓ {h}</li>
            ))}
          </ul>
          <div className="fhis-beta-kpi-grid">
            <span>NPS: {report.metrics.nps}</span>
            <span>Retención: {report.metrics.retentionRate}%</span>
            <span>Activación: {report.metrics.activationRate}%</span>
            <span>Partners activos: {report.metrics.activePartners}</span>
            <span>Feedbacks: {report.metrics.feedbackCount}</span>
            <span>Issues: {report.metrics.issueCount}</span>
            <span>AI requests: {report.metrics.aiRequests}</span>
            <span>AI coste: ${report.metrics.aiCostUsd.toFixed(2)}</span>
          </div>
          <time className="fhis-beta-analytics-time">
            Generado: {new Date(report.generatedAt).toLocaleString("es-ES")}
          </time>
        </Panel>
      ) : (
        <Panel>
          <p className="fhis-beta-empty">
            Sin informes ejecutivos. Genera el primero para validar hipótesis con design partners.
          </p>
        </Panel>
      )}

      {history.length > 1 && (
        <Panel>
          <h3 className="fhis-beta-panel-title">Historial</h3>
          {history.slice(1).map((r) => (
            <div key={r.id} className="fhis-beta-analytics-row">
              <span>{r.title}</span>
              <time>{new Date(r.generatedAt).toLocaleDateString("es-ES")}</time>
            </div>
          ))}
        </Panel>
      )}
    </Stack>
  );
}
