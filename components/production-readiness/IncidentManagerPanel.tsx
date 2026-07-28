"use client";

import { useCallback, useEffect, useState } from "react";
import { Panel, Stack, SectionHeader, Badge, Button } from "@/components/ui/fhis";
import {
  listIncidents,
  seedDemoIncidents,
  createIncident,
  updateIncidentStatus,
} from "@/lib/production-readiness";
import type { ProductionIncident, IncidentStatus } from "@/lib/production-readiness";

const STATUS_FLOW: IncidentStatus[] = ["open", "investigating", "mitigated", "resolved", "closed"];

function nextStatus(current: IncidentStatus): IncidentStatus {
  const idx = STATUS_FLOW.indexOf(current);
  return STATUS_FLOW[Math.min(idx + 1, STATUS_FLOW.length - 1)] ?? current;
}

export function IncidentManagerPanel() {
  const [incidents, setIncidents] = useState<ProductionIncident[]>([]);

  const refresh = useCallback(() => {
    seedDemoIncidents();
    setIncidents(listIncidents());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <Stack gap="lg" className="fhis-prod-incidents">
      <Button
        size="sm"
        onClick={() => {
          createIncident({
            title: "Incidente manual",
            description: "Creado desde el panel de incidentes (stub).",
            severity: "warning",
            tags: ["manual"],
          });
          refresh();
        }}
      >
        Nuevo incidente
      </Button>

      <Panel>
        <SectionHeader title="Incidentes" subtitle={`${incidents.filter((i) => i.status !== "closed").length} abiertos`} />
        {incidents.length === 0 ? (
          <p className="fhis-prod-text">Sin incidentes registrados.</p>
        ) : (
          <ul className="fhis-prod-list">
            {incidents.map((inc) => (
              <li key={inc.id} className="fhis-prod-incident-card">
                <div className="fhis-prod-incident-head">
                  <Badge variant={inc.severity === "critical" ? "red" : "amber"}>{inc.severity}</Badge>
                  <Badge variant="default">{inc.status}</Badge>
                  <strong>{inc.title}</strong>
                </div>
                <p className="fhis-prod-text">{inc.description}</p>
                <div className="fhis-prod-tags">
                  {inc.tags.map((t) => (
                    <span key={t} className="fhis-prod-tag">{t}</span>
                  ))}
                </div>
                {inc.status !== "closed" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      updateIncidentStatus(inc.id, nextStatus(inc.status));
                      refresh();
                    }}
                  >
                    Avanzar estado →
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </Stack>
  );
}
