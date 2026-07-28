"use client";

import { useEffect, useState } from "react";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { listRoadmapWithVotes, voteForRoadmapItem } from "@/lib/design-partners";
import type { RoadmapItemWithVotes } from "@/lib/design-partners";

const STATUS_LABELS: Record<string, string> = {
  shipped: "Entregado",
  "in-progress": "En progreso",
  planned: "Planificado",
};

export function RoadmapVotingPanel() {
  const [items, setItems] = useState<RoadmapItemWithVotes[]>([]);
  const [message, setMessage] = useState("");

  const refresh = () => setItems(listRoadmapWithVotes());

  useEffect(() => {
    refresh();
  }, []);

  const handleVote = (itemId: string) => {
    const result = voteForRoadmapItem(itemId);
    setMessage(result.error ?? "¡Voto registrado!");
    refresh();
  };

  return (
    <Stack gap="md">
      {message && <p className="fhis-beta-signup-hint">{message}</p>}
      {items.map((item) => (
        <Panel key={item.id} className="fhis-beta-analytics-row">
          <div className="fhis-beta-dashboard-header">
            <strong>{item.title}</strong>
            <Badge variant={item.status === "shipped" ? "accent" : "default"}>
              {STATUS_LABELS[item.status] ?? item.status}
            </Badge>
          </div>
          <p className="fhis-beta-signup-hint">{item.description}</p>
          <div className="fhis-beta-invite-actions">
            <span>{item.quarter} · {item.voteCount} votos</span>
            <Button
              size="sm"
              variant={item.userVoted ? "ghost" : "primary"}
              disabled={item.userVoted || item.status === "shipped"}
              onClick={() => handleVote(item.id)}
            >
              {item.userVoted ? "Votado ✓" : "Votar"}
            </Button>
          </div>
        </Panel>
      ))}
    </Stack>
  );
}
