"use client";

import { useEffect, useState, useCallback } from "react";
import { Panel, Grid } from "@/components/ui/fhis/Layout";
import { Button } from "@/components/ui/fhis/Button";
import {
  getNpsScore,
  getNpsBreakdown,
  listNpsResponses,
  submitNpsResponse,
  trackDesignPartnerPageView,
} from "@/lib/customer-success";
import { readSession } from "@/lib/auth/session-store";
import { CustomerSuccessShell } from "./CustomerSuccessShell";
import { NpsPanel } from "@/components/design-partners/NpsPanel";

export function NpsDashboard() {
  const [nps, setNps] = useState(getNpsScore());
  const [responses, setResponses] = useState(listNpsResponses());
  const [score, setScore] = useState(8);
  const [comment, setComment] = useState("");

  const refresh = useCallback(() => {
    setNps(getNpsScore());
    setResponses(listNpsResponses());
  }, []);

  useEffect(() => {
    const session = readSession();
    trackDesignPartnerPageView("/nps", session?.userId, session?.activeWorkspaceId);
    refresh();
  }, [refresh]);

  const breakdown = getNpsBreakdown(responses);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const session = readSession();
    submitNpsResponse({
      score,
      comment,
      userId: session?.userId,
      workspaceId: session?.activeWorkspaceId,
    });
    setComment("");
    refresh();
  };

  return (
    <CustomerSuccessShell
      title="Net Promoter Score"
      description="Encuestas NPS, promotores, pasivos y detractores"
    >
      <Grid cols={3} gap="md" className="fhis-beta-kpi-grid">
        <NpsPanel data={nps} />
        <Panel className="fhis-beta-kpi">
          <h3 className="fhis-beta-panel-title">Desglose</h3>
          <p>Promotores (9-10): {breakdown.promoters}</p>
          <p>Pasivos (7-8): {breakdown.passives}</p>
          <p>Detractores (0-6): {breakdown.detractors}</p>
        </Panel>
        <Panel className="fhis-beta-kpi">
          <h3 className="fhis-beta-panel-title">Nueva respuesta</h3>
          <form onSubmit={handleSubmit} className="fhis-beta-signup-form">
            <label className="fhis-beta-signup-hint">
              Puntuación (0-10)
              <input
                type="range"
                min={0}
                max={10}
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
              />
              <strong>{score}</strong>
            </label>
            <textarea
              className="fhis-input"
              placeholder="¿Qué podemos mejorar?"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <Button type="submit">Enviar encuesta</Button>
          </form>
        </Panel>
      </Grid>

      <Panel>
        <h3 className="fhis-beta-panel-title">Historial de respuestas</h3>
        {responses.length === 0 ? (
          <p className="fhis-beta-empty">Aún no hay respuestas NPS. Sé el primero en opinar.</p>
        ) : (
          responses
            .slice()
            .reverse()
            .map((r) => (
              <div key={r.id} className="fhis-beta-analytics-row">
                <span>
                  <strong>{r.score}/10</strong> — {r.comment ?? "Sin comentario"}
                </span>
                <time className="fhis-beta-analytics-time">
                  {new Date(r.createdAt).toLocaleString("es-ES")}
                </time>
              </div>
            ))
        )}
      </Panel>
    </CustomerSuccessShell>
  );
}
