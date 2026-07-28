"use client";

import { useEffect, useState, useCallback } from "react";
import { Grid, Panel } from "@/components/ui/fhis/Layout";
import { Button } from "@/components/ui/fhis/Button";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import {
  getCustomerSuccessSnapshot,
  submitNpsResponse,
  trackDesignPartnerPageView,
  trackSessionPageView,
  getHealthTierLabel,
} from "@/lib/customer-success";
import type { CustomerSuccessSnapshot } from "@/lib/customer-success";
import { readSession } from "@/lib/auth/session-store";
import { CustomerSuccessShell } from "./CustomerSuccessShell";
import { NpsPanel } from "@/components/design-partners/NpsPanel";
import { RetentionPanel } from "@/components/design-partners/RetentionPanel";
import { ActivationPanel } from "@/components/design-partners/ActivationPanel";
import { FunnelsPanel } from "./FunnelsPanel";
import { FeatureAdoptionPanel } from "./FeatureAdoptionPanel";
import { RetentionActivationPanel } from "./RetentionActivationPanel";
import Link from "next/link";

export function CustomerSuccessCenter() {
  const [snapshot, setSnapshot] = useState<CustomerSuccessSnapshot | null>(null);
  const [npsScore, setNpsScore] = useState(8);
  const [npsComment, setNpsComment] = useState("");

  const refresh = useCallback(() => {
    setSnapshot(getCustomerSuccessSnapshot());
  }, []);

  useEffect(() => {
    const session = readSession();
    trackDesignPartnerPageView("/customer-success", session?.userId, session?.activeWorkspaceId);
    trackSessionPageView("/customer-success");
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
    <CustomerSuccessShell
      title="Centro de Customer Success"
      description="Salud, NPS, retención, activación y métricas de producto — guiado por design partners"
    >
      {snapshot && (
        <>
          <Grid cols={4} gap="md" className="fhis-beta-kpi-grid">
            <Panel className="fhis-beta-kpi">
              <KpiBlock label="Éxito compuesto" value={snapshot.successScore} />
            </Panel>
            <NpsPanel data={snapshot.nps} />
            <RetentionPanel data={snapshot.retention} />
            <ActivationPanel data={snapshot.activation} />
          </Grid>

          {snapshot.health && (
            <Panel className="fhis-beta-access-banner">
              <p>
                Salud del cliente: <strong>{snapshot.health.score}/100</strong> —{" "}
                <strong>{getHealthTierLabel(snapshot.health.tier)}</strong>
              </p>
              <div className="fhis-beta-kpi-grid">
                <span>Activación: {snapshot.health.factors.activation}</span>
                <span>Retención: {snapshot.health.factors.retention}</span>
                <span>Engagement: {snapshot.health.factors.engagement}</span>
                <span>Feedback: {snapshot.health.factors.feedback}</span>
              </div>
            </Panel>
          )}

          <Grid cols={3} gap="md">
            <Panel>
              <h3 className="fhis-beta-panel-title">Resumen rápido</h3>
              <div className="fhis-beta-analytics-row">
                <span>Feedback inbox</span>
                <span>{snapshot.feedbackCount}</span>
              </div>
              <div className="fhis-beta-analytics-row">
                <span>Ideas / features</span>
                <span>{snapshot.featureRequestCount}</span>
              </div>
              <div className="fhis-beta-analytics-row">
                <span>Issues</span>
                <span>{snapshot.issueCount}</span>
              </div>
              <div className="fhis-beta-analytics-row">
                <span>Expansión</span>
                <span>{snapshot.expansion.rate}%</span>
              </div>
              <div className="fhis-beta-analytics-row">
                <span>AI requests</span>
                <span>{snapshot.aiUsage.requestCount}</span>
              </div>
            </Panel>

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
              <h3 className="fhis-beta-panel-title">Accesos rápidos</h3>
              <div className="fhis-beta-invite-actions">
                <Link href="/product-analytics" className="fhis-btn fhis-btn-sm fhis-btn-ghost">
                  Analytics de producto
                </Link>
                <Link href="/executive-insights" className="fhis-btn fhis-btn-sm fhis-btn-ghost">
                  Insights ejecutivos
                </Link>
                <Link href="/feedback-center" className="fhis-btn fhis-btn-sm fhis-btn-ghost">
                  Centro de feedback
                </Link>
              </div>
            </Panel>
          </Grid>

          <FunnelsPanel />
          <FeatureAdoptionPanel />
          <RetentionActivationPanel />
        </>
      )}
    </CustomerSuccessShell>
  );
}
