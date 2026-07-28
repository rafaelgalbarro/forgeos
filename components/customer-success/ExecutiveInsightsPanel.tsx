"use client";

import { useEffect, useState } from "react";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { Button } from "@/components/ui/fhis/Button";
import { Badge } from "@/components/ui/fhis/Badge";
import {
  generateExecutiveInsights,
  generateExecutiveReport,
  getLatestExecutiveReport,
  listExecutiveReports,
  trackDesignPartnerPageView,
} from "@/lib/customer-success";
import type { ExecutiveInsight, ExecutiveReport } from "@/lib/customer-success";
import { readSession } from "@/lib/auth/session-store";
import { CustomerSuccessShell } from "./CustomerSuccessShell";

const PRIORITY_LABELS: Record<ExecutiveInsight["priority"], string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

const CATEGORY_LABELS: Record<ExecutiveInsight["category"], string> = {
  growth: "Crecimiento",
  retention: "Retención",
  product: "Producto",
  ai: "IA",
  support: "Soporte",
};

export function ExecutiveInsightsPanel() {
  const [insights, setInsights] = useState<ExecutiveInsight[]>([]);
  const [report, setReport] = useState<ExecutiveReport | null>(null);
  const [history, setHistory] = useState<ExecutiveReport[]>([]);

  const refresh = () => {
    setInsights(generateExecutiveInsights());
    setReport(getLatestExecutiveReport());
    setHistory(listExecutiveReports().slice(0, 5));
  };

  useEffect(() => {
    const session = readSession();
    trackDesignPartnerPageView("/executive-insights", session?.userId, session?.activeWorkspaceId);
    refresh();
  }, []);

  const handleGenerate = () => {
    generateExecutiveReport();
    refresh();
  };

  return (
    <CustomerSuccessShell
      title="Insights ejecutivos"
      description="Vista CEO: NPS, retención, activación, IA y soporte — derivado de design partners"
    >
      <div className="fhis-beta-invite-actions">
        <Button size="sm" onClick={handleGenerate}>
          Generar informe ejecutivo
        </Button>
      </div>

      <Stack gap="md">
        {insights.map((insight) => (
          <Panel key={insight.id}>
            <div className="fhis-beta-dashboard-header">
              <h3 className="fhis-beta-panel-title">{insight.title}</h3>
              <div>
                <Badge variant="accent">{CATEGORY_LABELS[insight.category]}</Badge>{" "}
                <Badge>{PRIORITY_LABELS[insight.priority]}</Badge>
              </div>
            </div>
            <p>{insight.summary}</p>
            {insight.metric && <p><strong>Métrica:</strong> {insight.metric}</p>}
            <p className="fhis-beta-signup-hint">→ {insight.recommendation}</p>
          </Panel>
        ))}
      </Stack>

      {report && (
        <Panel>
          <h3 className="fhis-beta-panel-title">Último informe: {report.title}</h3>
          <p>{report.summary}</p>
          <ul className="fhis-beta-perks">
            {report.highlights.map((h) => (
              <li key={h}>✓ {h}</li>
            ))}
          </ul>
        </Panel>
      )}

      {history.length > 1 && (
        <Panel>
          <h3 className="fhis-beta-panel-title">Historial de informes</h3>
          {history.slice(1).map((r) => (
            <div key={r.id} className="fhis-beta-analytics-row">
              <span>{r.title}</span>
              <time>{new Date(r.generatedAt).toLocaleDateString("es-ES")}</time>
            </div>
          ))}
        </Panel>
      )}
    </CustomerSuccessShell>
  );
}
