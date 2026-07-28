"use client";

import { Panel, Stack, SectionHeader, Badge } from "@/components/ui/fhis";
import { listReleases, evaluateDeploymentGates } from "@/lib/production-readiness";

export function ReleaseManagerPanel() {
  const releases = listReleases();
  const gates = evaluateDeploymentGates();

  return (
    <Stack gap="lg" className="fhis-prod-releases">
      <Panel>
        <SectionHeader title="Releases" subtitle="Historial de despliegues" />
        <ul className="fhis-prod-list">
          {releases.map((r) => (
            <li key={r.id} className="fhis-prod-release-card">
              <div className="fhis-prod-release-head">
                <strong>{r.version}</strong>
                <Badge variant={r.status === "deployed" ? "accent" : r.status === "failed" ? "red" : "default"}>
                  {r.status}
                </Badge>
                <Badge variant="default">{r.environment}</Badge>
              </div>
              {r.notes && <p className="fhis-prod-text">{r.notes}</p>}
              <span className="fhis-prod-muted">{new Date(r.deployedAt).toLocaleString("es")}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <SectionHeader title="Gates pre-deploy" />
        <ul className="fhis-prod-list">
          {gates.map((g) => (
            <li key={g.id} className="fhis-prod-gate-row">
              <Badge variant={g.status === "pass" ? "accent" : g.status === "fail" ? "red" : "amber"}>
                {g.status}
              </Badge>
              <span>{g.label}</span>
              {g.blocking && <Badge variant="red">blocking</Badge>}
            </li>
          ))}
        </ul>
      </Panel>
    </Stack>
  );
}
