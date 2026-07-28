"use client";

import { useEffect, useState, useCallback } from "react";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import {
  listFeatureRequests,
  submitFeatureRequest,
  upvoteFeatureRequest,
} from "@/lib/design-partners";
import type { FeatureRequest } from "@/lib/design-partners";
import { readSession } from "@/lib/auth/session-store";

const STATUS_LABELS: Record<string, string> = {
  submitted: "Enviado",
  reviewing: "En revisión",
  planned: "Planificado",
  shipped: "Entregado",
  declined: "Rechazado",
};

export function FeatureRequestsPanel() {
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const refresh = useCallback(() => {
    setRequests(listFeatureRequests());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const session = readSession();
    submitFeatureRequest({
      title,
      description,
      userId: session?.userId,
      workspaceId: session?.activeWorkspaceId,
      email: session?.email,
    });
    setTitle("");
    setDescription("");
    refresh();
  };

  const handleUpvote = (id: string) => {
    upvoteFeatureRequest(id);
    refresh();
  };

  return (
    <Stack gap="md">
      <Panel>
        <h3 className="fhis-beta-panel-title">Nueva solicitud de feature</h3>
        <form onSubmit={handleSubmit} className="fhis-beta-signup-form">
          <input
            className="fhis-input"
            placeholder="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="fhis-input"
            placeholder="Describe la feature que necesitas"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button type="submit" className="fhis-beta-signup-cta">
            Enviar solicitud
          </Button>
        </form>
      </Panel>
      <div className="fhis-beta-analytics-list">
        {requests.length === 0 ? (
          <p className="fhis-beta-empty">Sin solicitudes de features aún.</p>
        ) : (
          requests.map((req) => (
            <Panel key={req.id} className="fhis-beta-analytics-row">
              <div className="fhis-beta-dashboard-header">
                <strong>{req.title}</strong>
                <Badge variant="default">{STATUS_LABELS[req.status] ?? req.status}</Badge>
              </div>
              <p className="fhis-beta-signup-hint">{req.description}</p>
              <div className="fhis-beta-invite-actions">
                <Button size="sm" variant="ghost" onClick={() => handleUpvote(req.id)}>
                  ▲ {req.votes} votos
                </Button>
              </div>
            </Panel>
          ))
        )}
      </div>
    </Stack>
  );
}
