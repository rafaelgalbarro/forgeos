"use client";

import { useCallback, useEffect, useState } from "react";
import { Panel, Stack, SectionHeader, Badge, Button } from "@/components/ui/fhis";
import { listAlerts, acknowledgeAlert, seedDemoAlerts, pushAlert } from "@/lib/production-readiness";
import type { ProductionAlert } from "@/lib/production-readiness";

export function AlertCenterPanel() {
  const [alerts, setAlerts] = useState<ProductionAlert[]>([]);

  const refresh = useCallback(() => {
    seedDemoAlerts();
    setAlerts(listAlerts());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <Stack gap="lg" className="fhis-prod-alerts">
      <div className="fhis-prod-actions">
        <Button
          size="sm"
          onClick={() => {
            pushAlert({
              title: "Alerta de prueba",
              message: "Generada desde el panel de alertas",
              severity: "info",
              source: "alert-center-panel",
            });
            refresh();
          }}
        >
          Crear alerta de prueba
        </Button>
      </div>

      <Panel>
        <SectionHeader title="Registro de alertas" subtitle={`${alerts.filter((a) => !a.acknowledged).length} activas`} />
        {alerts.length === 0 ? (
          <p className="fhis-prod-text">Sin alertas.</p>
        ) : (
          <ul className="fhis-prod-list">
            {alerts.map((a) => (
              <li key={a.id} className={`fhis-prod-alert-card ${a.acknowledged ? "fhis-prod-muted" : ""}`}>
                <div className="fhis-prod-alert-head">
                  <Badge variant={a.severity === "critical" ? "red" : a.severity === "warning" ? "amber" : "default"}>
                    {a.severity}
                  </Badge>
                  <strong>{a.title}</strong>
                  <span className="fhis-prod-muted">{a.source}</span>
                </div>
                <p className="fhis-prod-text">{a.message}</p>
                <span className="fhis-prod-muted">{new Date(a.createdAt).toLocaleString("es")}</span>
                {!a.acknowledged && (
                  <Button size="sm" variant="ghost" onClick={() => { acknowledgeAlert(a.id); refresh(); }}>
                    Reconocer
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
