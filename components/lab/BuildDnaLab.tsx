"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { Card } from "@/components/ui/fhis/Card";
import { Container, Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { Status } from "@/components/ui/fhis/Status";
import type { FhisStatus } from "@/lib/design-system/types";
import {
  TECHNOLOGY_STACK_KEYS,
  TECHNOLOGY_STACK_LABELS,
  type BuildDnaValidationIssue,
} from "@/lib/build-platform/build-dna/types";
import {
  createBuildDnaLab,
  type BuildDnaLabSession,
} from "@/lib/lab/build-dna-lab";
import { LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";

function PanelTitle({ children }: { children: ReactNode }) {
  return <p style={{ margin: "0 0 var(--fhis-space-2)", fontWeight: 600 }}>{children}</p>;
}

function severityToFhis(severity: BuildDnaValidationIssue["severity"]): FhisStatus {
  switch (severity) {
    case "error":
      return "error";
    case "warning":
      return "warning";
    default:
      return "idle";
  }
}

function SimpleTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | ReactNode)[][];
}) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
      <thead>
        <tr style={{ borderBottom: "1px solid var(--fhis-border-subtle)" }}>
          {headers.map((h) => (
            <th key={h} style={{ textAlign: "left", padding: "var(--fhis-space-2)" }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: "1px solid var(--fhis-border-subtle)" }}>
            {row.map((cell, j) => (
              <td key={j} style={{ padding: "var(--fhis-space-2)", verticalAlign: "top" }}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function BuildDnaLab() {
  const [session] = useState<BuildDnaLabSession>(() => createBuildDnaLab(LAB_MOCK_VENTURE_ID));
  const [profileId, setProfileId] = useState("fleetpulse");
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  const dna = useMemo(() => {
    void tick;
    return session.getDna();
  }, [session, tick]);

  const validation = useMemo(() => {
    void tick;
    return session.getValidation();
  }, [session, tick]);

  const profile = useMemo(() => {
    void tick;
    return session.getActiveProfile();
  }, [session, tick]);

  const handleProfileChange = useCallback(
    (id: string) => {
      session.switchProfile(id);
      setProfileId(id);
      refresh();
    },
    [session, refresh],
  );

  const readyStatus: FhisStatus = validation.valid ? "success" : validation.completenessScore >= 60 ? "warning" : "error";

  const stackRows = TECHNOLOGY_STACK_KEYS.map((key) => [
    TECHNOLOGY_STACK_LABELS[key],
    dna.stack[key] || <Status status="error" label="Missing" />,
  ]);

  const serviceRows = [
    ["Auth", dna.stack.auth],
    ["Payments", dna.stack.payments],
    ["Email", dna.stack.email],
    ["Analytics", dna.stack.analytics],
    ["Monitoring", dna.stack.monitoring],
  ];

  const frameworkRows = [
    ["Framework", dna.stack.framework],
    ["Backend", dna.stack.backend],
    ["Frontend", dna.stack.frontend],
    ["Database", dna.stack.database],
    ["Testing", dna.stack.testing],
    ["CI/CD", dna.stack.cicd],
  ];

  const archRows = [
    ["Pattern", dna.architecture.architecture],
    ["DDD", dna.architecture.ddd ? "Enabled" : "Disabled"],
    ["Clean Architecture", dna.architecture.cleanArchitecture ? "Enabled" : "Disabled"],
    ["Hexagonal", dna.architecture.hexagonal ? "Enabled" : "Disabled"],
    ["Feature Flags", dna.architecture.featureFlags.enabled ? dna.architecture.featureFlags.provider : "Disabled"],
    ["Max Bundle", `${dna.architecture.performanceBudget.maxBundleKb} KB`],
    ["Max LCP", `${dna.architecture.performanceBudget.maxLcpMs} ms`],
    ["Max API Latency", `${dna.architecture.performanceBudget.maxApiLatencyMs} ms`],
  ];

  const deployRows = [
    ["Target", dna.stack.deployment],
    ["Environments", dna.deployment.environments.join(", ")],
    ["Rollback", dna.deployment.rollbackStrategy],
    ["CI/CD", dna.stack.cicd],
  ];

  const validationRows = validation.issues.map((issue) => [
    issue.code,
    issue.field ?? "—",
    <Status key={issue.code} status={severityToFhis(issue.severity)} label={issue.severity} />,
    issue.message,
  ]);

  return (
    <Container style={{ paddingBlock: "var(--fhis-space-6)" }}>
      <Stack gap="lg">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-2)", marginBottom: "var(--fhis-space-2)" }}>
            <Badge variant="accent">Epic 6.1</Badge>
            <Badge variant="default">Build DNA</Badge>
          </div>
          <h1 style={{ margin: "0 0 var(--fhis-space-2)" }}>Build DNA Lab</h1>
          <p style={{ opacity: 0.7, marginBottom: "var(--fhis-space-2)" }}>
            Official technical DNA per venture — stack, architecture, services, deployment, and validation.
          </p>
          <p style={{ opacity: 0.8 }}>
            Venture: <strong>{dna.meta.ventureName}</strong> ({dna.meta.ventureId})
          </p>
        </div>

        <Panel>
          <PanelTitle>Profile &amp; Status</PanelTitle>
          <div style={{ display: "flex", gap: "var(--fhis-space-2)", flexWrap: "wrap", alignItems: "center", marginBottom: "var(--fhis-space-3)" }}>
            {session.getProfiles().map((p) => (
              <Button
                key={p.id}
                variant={profileId === p.id ? "primary" : "secondary"}
                onClick={() => handleProfileChange(p.id)}
              >
                {p.name}
              </Button>
            ))}
          </div>
          <p style={{ opacity: 0.7, marginBottom: "var(--fhis-space-3)" }}>{profile.description}</p>
          <Grid cols={3}>
            <Card>
              <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.7 }}>Completeness</p>
              <p style={{ margin: "var(--fhis-space-1) 0 0", fontSize: "1.5rem", fontWeight: 600 }}>
                {validation.completenessScore}%
              </p>
            </Card>
            <Card>
              <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.7 }}>Ready for Generation</p>
              <div style={{ marginTop: "var(--fhis-space-2)" }}>
                <Status status={readyStatus} label={dna.meta.readyForGeneration ? "Yes" : "No"} />
              </div>
            </Card>
            <Card>
              <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.7 }}>Validation Issues</p>
              <p style={{ margin: "var(--fhis-space-1) 0 0", fontSize: "1.5rem", fontWeight: 600 }}>
                {validation.issues.length}
              </p>
            </Card>
          </Grid>
        </Panel>

        <Grid cols={2}>
          <Panel>
            <PanelTitle>Stack</PanelTitle>
            <SimpleTable headers={["Component", "Value"]} rows={stackRows} />
          </Panel>

          <Panel>
            <PanelTitle>Frameworks</PanelTitle>
            <SimpleTable headers={["Layer", "Technology"]} rows={frameworkRows} />
          </Panel>

          <Panel>
            <PanelTitle>Architecture</PanelTitle>
            <SimpleTable headers={["Rule", "Value"]} rows={archRows} />
            <div style={{ marginTop: "var(--fhis-space-3)" }}>
              <PanelTitle>Coding Standards</PanelTitle>
              <p style={{ margin: "0 0 var(--fhis-space-1)", fontSize: "0.875rem" }}>
                <strong>Style:</strong> {dna.codingStandards.codingStyle}
              </p>
              <p style={{ margin: 0, fontSize: "0.875rem" }}>
                <strong>Naming:</strong> {dna.codingStandards.namingConvention}
              </p>
            </div>
          </Panel>

          <Panel>
            <PanelTitle>Services</PanelTitle>
            <SimpleTable headers={["Service", "Provider"]} rows={serviceRows} />
            <div style={{ marginTop: "var(--fhis-space-3)" }}>
              <PanelTitle>Security Rules</PanelTitle>
              <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.875rem" }}>
                {dna.security.rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
          </Panel>

          <Panel>
            <PanelTitle>Deployment</PanelTitle>
            <SimpleTable headers={["Setting", "Value"]} rows={deployRows} />
            <div style={{ marginTop: "var(--fhis-space-3)" }}>
              <PanelTitle>Deploy Rules</PanelTitle>
              <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.875rem" }}>
                {dna.deployment.rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
          </Panel>

          <Panel>
            <PanelTitle>Validations</PanelTitle>
            {validationRows.length === 0 ? (
              <Status status="success" label="All checks passed" />
            ) : (
              <SimpleTable headers={["Code", "Field", "Severity", "Message"]} rows={validationRows} />
            )}
          </Panel>
        </Grid>

        <Panel>
          <PanelTitle>Branding</PanelTitle>
          <div style={{ display: "flex", gap: "var(--fhis-space-4)", alignItems: "center", flexWrap: "wrap" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 8,
                background: dna.branding.primaryColor,
                border: "1px solid var(--fhis-border-subtle)",
              }}
            />
            <div>
              <p style={{ margin: 0, fontSize: "0.875rem" }}>
                <strong>Primary:</strong> {dna.branding.primaryColor}
              </p>
              <p style={{ margin: "var(--fhis-space-1) 0 0", fontSize: "0.875rem" }}>
                <strong>Font:</strong> {dna.branding.fontFamily}
              </p>
            </div>
          </div>
        </Panel>
      </Stack>
    </Container>
  );
}
