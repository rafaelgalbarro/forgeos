"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/ui/fhis/Layout";
import { Button } from "@/components/ui/fhis/Button";
import {
  getIdeasPortalSummary,
  listFeatureRequests,
  submitFeatureRequest,
  upvoteFeatureRequest,
} from "@/lib/customer-success";
import { readSession } from "@/lib/auth/session-store";

export function IdeasPortalPanel() {
  const [summary, setSummary] = useState(getIdeasPortalSummary());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const refresh = () => {
    setSummary(getIdeasPortalSummary());
  };

  useEffect(() => {
    refresh();
  }, []);

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

  return (
    <Panel>
      <h3 className="fhis-beta-panel-title">
        Portal de ideas ({summary.totalIdeas})
      </h3>
      <div className="fhis-beta-kpi-grid">
        <span>Enviadas: {summary.submitted}</span>
        <span>Planificadas: {summary.planned}</span>
        <span>Enviadas a prod: {summary.shipped}</span>
      </div>

      <form onSubmit={handleSubmit} className="fhis-beta-signup-form">
        <input
          className="fhis-input"
          placeholder="Título de la idea"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="fhis-input"
          placeholder="Descripción"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Button type="submit" size="sm">
          Enviar idea
        </Button>
      </form>

      {listFeatureRequests().map((idea) => (
        <div key={idea.id} className="fhis-beta-analytics-row">
          <span>
            {idea.title} <small>({idea.status})</small>
          </span>
          <span>
            {idea.votes} votos{" "}
            <Button size="sm" variant="ghost" onClick={() => { upvoteFeatureRequest(idea.id); refresh(); }}>
              +1
            </Button>
          </span>
        </div>
      ))}
    </Panel>
  );
}
