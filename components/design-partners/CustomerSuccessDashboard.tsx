"use client";

import { useEffect, useState, useCallback } from "react";
import { Grid, Panel } from "@/components/ui/fhis/Layout";
import { Button } from "@/components/ui/fhis/Button";
import {
  getSuccessDashboardData,
  computeCustomerHealth,
  submitNpsResponse,
  trackDesignPartnerPageView,
} from "@/lib/design-partners";
import type { SuccessDashboardData, CustomerHealthScore } from "@/lib/design-partners";
import { readSession } from "@/lib/auth/session-store";
import { DesignPartnerShell } from "./DesignPartnerShell";
import { NpsPanel } from "./NpsPanel";
import { RetentionPanel } from "./RetentionPanel";
import { ActivationPanel } from "./ActivationPanel";
import { ExecutiveSummaryPanel } from "./ExecutiveSummaryPanel";

export function CustomerSuccessDashboard() {
  const [success, setSuccess] = useState<SuccessDashboardData | null>(null);
  const [health, setHealth] = useState<CustomerHealthScore | null>(null);
  const [npsScore, setNpsScore] = useState(8);
  const [npsComment, setNpsComment] = useState("");

  const refresh = useCallback(() => {
    setSuccess(getSuccessDashboardData());
    setHealth(computeCustomerHealth());
  }, []);

  useEffect(() => {
    const session = readSession();
    trackDesignPartnerPageView("/customer-success", session?.userId, session?.activeWorkspaceId);
    refresh();
  }, [refresh]);

  const handleNpsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const session = readSession();
    submitNpsResponse({
      score: npsScore,
      comment: npsComment,
      userId: session?.userId,
      workspaceId: session?.activeWorkspaceId,
    });
    setNpsComment("");
    refresh();
  };

  return (
    <DesignPartnerShell
      title="Customer Success"
      description="NPS, retención, activación y salud de design partners"
    >
      {success && (
        <>
          <Grid cols={3} gap="md" className="fhis-beta-kpi-grid">
            <NpsPanel data={success.nps} />
            <RetentionPanel data={success.retention} />
            <ActivationPanel data={success.activation} />
          </Grid>

          {health && (
            <Panel className="fhis-beta-access-banner">
              <p>
                Puntuación de salud: <strong>{health.score}/100</strong> — tier{" "}
                <strong>{health.tier}</strong>
              </p>
              <div className="fhis-beta-kpi-grid">
                <span>Activación: {health.factors.activation}</span>
                <span>Retención: {health.factors.retention}</span>
                <span>Engagement: {health.factors.engagement}</span>
                <span>Feedback: {health.factors.feedback}</span>
              </div>
            </Panel>
          )}

          <Panel>
            <h3 className="fhis-beta-panel-title">Encuesta NPS rápida</h3>
            <form onSubmit={handleNpsSubmit} className="fhis-beta-signup-form">
              <label className="fhis-beta-signup-hint">
                ¿Recomendarías ForgeOS? (0-10)
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={npsScore}
                  onChange={(e) => setNpsScore(Number(e.target.value))}
                />
                <strong>{npsScore}</strong>
              </label>
              <textarea
                className="fhis-input"
                placeholder="Comentario opcional"
                rows={2}
                value={npsComment}
                onChange={(e) => setNpsComment(e.target.value)}
              />
              <Button type="submit">Enviar NPS</Button>
            </form>
          </Panel>

          <Panel>
            <h3 className="fhis-beta-panel-title">Embudo de journey</h3>
            {success.journeyFunnel.map((step) => (
              <div key={step.stage} className="fhis-beta-analytics-row">
                <span>{step.label}</span>
                <span>{step.count} usuarios</span>
              </div>
            ))}
          </Panel>

          <ExecutiveSummaryPanel />
        </>
      )}
    </DesignPartnerShell>
  );
}
