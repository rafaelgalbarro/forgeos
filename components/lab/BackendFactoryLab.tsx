"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { Card } from "@/components/ui/fhis/Card";
import { Container, Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Status } from "@/components/ui/fhis/Status";
import type { BackendBlueprint } from "@/lib/build-platform/backend-factory";
import { generateBackendFactoryLabBlueprint } from "@/lib/lab/backend-factory-lab";

export function BackendFactoryLab() {
  const [blueprint, setBlueprint] = useState<BackendBlueprint | null>(null);

  const issues = useMemo(() => blueprint?.validation.issues ?? [], [blueprint]);

  return (
    <Container style={{ paddingBlock: "var(--fhis-space-6)" }}>
      <Stack gap="lg">
        <header>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-2)", marginBottom: "var(--fhis-space-2)" }}>
            <Badge variant="accent">Epic 6.4</Badge>
            <Badge variant="default">Backend Factory</Badge>
          </div>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Backend Factory Lab</h1>
          <p style={{ opacity: 0.8 }}>
            Genera blueprint de backend (API, services, repositories, events, workers, security, permissions, jobs).
          </p>
        </header>

        <Panel>
          <Stack gap="sm">
            <div style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-2)", flexWrap: "wrap" }}>
              <Button onClick={() => setBlueprint(generateBackendFactoryLabBlueprint())}>
                Generar Backend Blueprint
              </Button>
              <Status
                status={blueprint?.validation.valid ? "success" : blueprint ? "warning" : "pending"}
                label={blueprint ? (blueprint.validation.valid ? "Blueprint Ready" : "Blueprint Draft") : "Waiting"}
              />
            </div>
            {blueprint ? (
              <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                Venture <code>{blueprint.meta.ventureName}</code> · Stack{" "}
                <code>{blueprint.meta.stackBackend}</code> / <code>{blueprint.meta.stackDatabase}</code> · Generated at{" "}
                {new Date(blueprint.meta.generatedAt).toLocaleTimeString()}
              </div>
            ) : null}
          </Stack>
        </Panel>

        {blueprint ? (
          <>
            <Grid cols={4} gap="md">
              <Card>
                <KpiBlock label="API Endpoints" value={String(blueprint.api.endpoints.length)} />
              </Card>
              <Card>
                <KpiBlock label="Services" value={String(blueprint.services.length)} />
              </Card>
              <Card>
                <KpiBlock label="Repositories" value={String(blueprint.repositories.length)} />
              </Card>
              <Card>
                <KpiBlock label="Events" value={String(blueprint.events.length)} />
              </Card>
            </Grid>

            <Grid cols={4} gap="md">
              <Card>
                <KpiBlock label="Workers" value={String(blueprint.workers.length)} />
              </Card>
              <Card>
                <KpiBlock label="Security Rules" value={String(blueprint.security.rules.length)} />
              </Card>
              <Card>
                <KpiBlock label="Permissions" value={String(blueprint.permissions.length)} />
              </Card>
              <Card>
                <KpiBlock label="Background Jobs" value={String(blueprint.jobs.length)} />
              </Card>
            </Grid>

            <Panel>
              <SectionTitle title="API" subtitle={`${blueprint.api.style.toUpperCase()} · ${blueprint.api.generatorId ?? "manual"}`} />
              <SpecTable
                headers={["Method", "Path", "Auth", "Service"]}
                rows={blueprint.api.endpoints.map((item) => [
                  item.method,
                  item.path,
                  item.auth,
                  item.serviceId,
                ])}
              />
            </Panel>

            <Grid cols={2} gap="md">
              <Panel>
                <SectionTitle title="Services" />
                <SpecTable
                  headers={["Name", "Domain", "Methods"]}
                  rows={blueprint.services.map((item) => [
                    item.name,
                    item.domain,
                    String(item.methods.length),
                  ])}
                />
              </Panel>
              <Panel>
                <SectionTitle title="Repositories" />
                <SpecTable
                  headers={["Name", "Entity", "Operations"]}
                  rows={blueprint.repositories.map((item) => [
                    item.name,
                    item.entity,
                    String(item.operations.length),
                  ])}
                />
              </Panel>
            </Grid>

            <Grid cols={2} gap="md">
              <Panel>
                <SectionTitle title="Events" />
                <SpecTable
                  headers={["Name", "Topic", "Consumers"]}
                  rows={blueprint.events.map((item) => [
                    item.name,
                    item.topic,
                    String(item.consumers.length),
                  ])}
                />
              </Panel>
              <Panel>
                <SectionTitle title="Workers" />
                <SpecTable
                  headers={["Name", "Status", "Triggers"]}
                  rows={blueprint.workers.map((item) => [
                    item.name,
                    item.status,
                    String(item.triggers.length),
                  ])}
                />
              </Panel>
            </Grid>

            <Grid cols={2} gap="md">
              <Panel>
                <SectionTitle
                  title="Security"
                  subtitle={`OAuth: ${blueprint.security.oauthRequired ? "yes" : "no"} · Middleware: ${blueprint.security.middleware.length}`}
                />
                <SpecTable
                  headers={["Rule", "Source", "Enforcement"]}
                  rows={blueprint.security.rules.map((item) => [
                    item.rule,
                    item.source,
                    item.enforcement,
                  ])}
                />
              </Panel>
              <Panel>
                <SectionTitle title="Permissions" />
                <SpecTable
                  headers={["Role", "Resource", "Actions", "Scope"]}
                  rows={blueprint.permissions.map((item) => [
                    item.role,
                    item.resource,
                    item.actions.join(", "),
                    item.scope,
                  ])}
                />
              </Panel>
            </Grid>

            <Panel>
              <SectionTitle title="Background Jobs" />
              <SpecTable
                headers={["Name", "Queue", "Trigger", "Schedule", "Handler"]}
                rows={blueprint.jobs.map((item) => [
                  item.name,
                  item.queue,
                  item.trigger,
                  item.schedule ?? "—",
                  item.handler,
                ])}
              />
            </Panel>

            <Panel>
              <SectionTitle title="Validation" />
              <SpecTable
                headers={["Severity", "Code", "Message"]}
                rows={
                  issues.length
                    ? issues.map((item) => [item.severity.toUpperCase(), item.code, item.message])
                    : [["—", "OK", "No issues"]]
                }
              />
            </Panel>
          </>
        ) : null}
      </Stack>
    </Container>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: "var(--fhis-space-3)" }}>
      <p style={{ margin: 0, fontWeight: 600 }}>{title}</p>
      {subtitle ? <p style={{ margin: "var(--fhis-space-1) 0 0", fontSize: "0.8rem", opacity: 0.75 }}>{subtitle}</p> : null}
    </div>
  );
}

function SpecTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                style={{
                  textAlign: "left",
                  padding: "var(--fhis-space-2)",
                  borderBottom: "1px solid var(--fhis-color-border, #e5e7eb)",
                  fontWeight: 600,
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td
                  key={`cell-${rowIndex}-${cellIndex}`}
                  style={{
                    padding: "var(--fhis-space-2)",
                    borderBottom: "1px solid var(--fhis-color-border-subtle, #f3f4f6)",
                    verticalAlign: "top",
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
