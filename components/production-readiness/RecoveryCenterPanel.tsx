"use client";

import { Panel, Stack, SectionHeader, Badge, Button } from "@/components/ui/fhis";
import {
  listRecoveryProcedures,
  runRecoveryProcedure,
  getBackupStatus,
  listDisasterRecoveryPlans,
  runDrTestStub,
} from "@/lib/production-readiness";
import { useState } from "react";

export function RecoveryCenterPanel() {
  const procedures = listRecoveryProcedures();
  const backups = getBackupStatus();
  const drPlans = listDisasterRecoveryPlans();
  const [lastRun, setLastRun] = useState<string | null>(null);

  return (
    <Stack gap="lg" className="fhis-prod-recovery">
      <Panel>
        <SectionHeader title="Procedimientos de recuperación" subtitle="Stub — dry-run por defecto" />
        <ul className="fhis-prod-list">
          {procedures.map((p) => (
            <li key={p.id} className="fhis-prod-recovery-card">
              <div className="fhis-prod-recovery-head">
                <strong>{p.title}</strong>
                <Badge variant={p.automated ? "accent" : "default"}>
                  {p.automated ? "Automático" : "Manual"}
                </Badge>
              </div>
              <p className="fhis-prod-text">{p.description}</p>
              <ol className="fhis-prod-steps">
                {p.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
              <Button
                size="sm"
                onClick={async () => {
                  const result = await runRecoveryProcedure(p.id);
                  setLastRun(`${result.title} — ${result.lastRunAt}`);
                }}
              >
                Ejecutar (dry-run)
              </Button>
            </li>
          ))}
        </ul>
        {lastRun && <p className="fhis-prod-muted">Última ejecución: {lastRun}</p>}
      </Panel>

      <Panel>
        <SectionHeader title="Backups" />
        <ul className="fhis-prod-list">
          {backups.map((b) => (
            <li key={b.id} className="fhis-prod-check-row">
              <Badge variant={b.status === "healthy" ? "accent" : "default"}>{b.status}</Badge>
              <span>{b.label}</span>
              {b.lastBackupAt && (
                <span className="fhis-prod-muted">{new Date(b.lastBackupAt).toLocaleString("es")}</span>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <SectionHeader title="Disaster Recovery" />
        {drPlans.map((dr) => (
          <div key={dr.id} className="fhis-prod-dr-card">
            <strong>{dr.name}</strong>
            <p className="fhis-prod-text">RTO: {dr.rtoMinutes}min — RPO: {dr.rpoMinutes}min — Estado: {dr.status}</p>
            <Button size="sm" variant="ghost" onClick={() => runDrTestStub()}>
              Test DR (stub)
            </Button>
          </div>
        ))}
      </Panel>
    </Stack>
  );
}
