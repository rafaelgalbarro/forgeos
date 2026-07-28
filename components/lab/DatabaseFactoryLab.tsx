"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { Card } from "@/components/ui/fhis/Card";
import { Container, Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { Status } from "@/components/ui/fhis/Status";
import { generateDatabaseFactoryLabBlueprint } from "@/lib/lab/database-factory-lab";
import type { DatabaseBlueprint } from "@/lib/build-platform/database-factory";

export function DatabaseFactoryLab() {
  const [blueprint, setBlueprint] = useState<DatabaseBlueprint | null>(null);

  const issues = useMemo(() => blueprint?.validation.issues ?? [], [blueprint]);

  return (
    <Container style={{ paddingBlock: "var(--fhis-space-6)" }}>
      <Stack gap="lg">
        <header>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-2)", marginBottom: "var(--fhis-space-2)" }}>
            <Badge variant="accent">Epic 6.5</Badge>
            <Badge variant="default">Database Factory</Badge>
          </div>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Database Factory Lab</h1>
          <p style={{ opacity: 0.8 }}>
            Genera blueprint de base de datos (entities, relations, indexes, policies, migrations, seeds, constraints, optimization).
          </p>
        </header>

        <Panel>
          <Stack gap="sm">
            <div style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-2)", flexWrap: "wrap" }}>
              <Button onClick={() => setBlueprint(generateDatabaseFactoryLabBlueprint())}>
                Generar Database Blueprint
              </Button>
              <Status
                status={blueprint?.validation.valid ? "success" : blueprint ? "warning" : "pending"}
                label={blueprint ? (blueprint.validation.valid ? "Blueprint Ready" : "Blueprint Draft") : "Waiting"}
              />
            </div>
            {blueprint ? (
              <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                Venture <code>{blueprint.meta.ventureName}</code> · Engine <code>{blueprint.meta.databaseEngine}</code> · Generated at{" "}
                {new Date(blueprint.meta.generatedAt).toLocaleTimeString()}
              </div>
            ) : null}
          </Stack>
        </Panel>

        {blueprint ? (
          <>
            <Grid cols={4} gap="md">
              <Card><Metric label="Entities" value={String(blueprint.entities.length)} /></Card>
              <Card><Metric label="Relations" value={String(blueprint.relations.length)} /></Card>
              <Card><Metric label="Indexes" value={String(blueprint.indexes.length)} /></Card>
              <Card><Metric label="Policies" value={String(blueprint.policies.length)} /></Card>
            </Grid>

            <Grid cols={4} gap="md">
              <Card><Metric label="Migrations" value={String(blueprint.migrations.length)} /></Card>
              <Card><Metric label="Seeds" value={String(blueprint.seeds.length)} /></Card>
              <Card><Metric label="Constraints" value={String(blueprint.constraints.length)} /></Card>
              <Card><Metric label="Optimizations" value={String(blueprint.optimization.length)} /></Card>
            </Grid>

            <Grid cols={2} gap="md">
              <Panel>
                <ListPanel
                  title="Entities"
                  items={blueprint.entities.map((item) => `${item.tableName} (${item.columns.length} cols, RLS: ${item.rlsEnabled ? "on" : "off"})`)}
                />
              </Panel>
              <Panel>
                <ListPanel
                  title="Relations"
                  items={blueprint.relations.map((item) => `${item.name} · ${item.kind} · ON DELETE ${item.onDelete}`)}
                />
              </Panel>
            </Grid>

            <Grid cols={2} gap="md">
              <Panel>
                <ListPanel
                  title="Indexes"
                  items={blueprint.indexes.map((item) => `${item.name} (${item.method}) · ${item.columns.join(", ")}`)}
                />
              </Panel>
              <Panel>
                <ListPanel
                  title="Policies"
                  items={blueprint.policies.map((item) => `${item.name} · ${item.action} · ${item.role}`)}
                />
              </Panel>
            </Grid>

            <Grid cols={2} gap="md">
              <Panel>
                <ListPanel
                  title="Migrations"
                  items={blueprint.migrations.map((item) => `v${item.version} ${item.name} (${item.direction}, ${item.steps.length} steps)`)}
                />
              </Panel>
              <Panel>
                <ListPanel
                  title="Seeds"
                  items={blueprint.seeds.map((item) => `${item.name} · ${item.environment} · ${item.records.length} tables`)}
                />
              </Panel>
            </Grid>

            <Grid cols={2} gap="md">
              <Panel>
                <ListPanel
                  title="Constraints"
                  items={blueprint.constraints.map((item) => `${item.name} · ${item.kind} · ${item.columns.join(", ")}`)}
                />
              </Panel>
              <Panel>
                <ListPanel
                  title="Optimization"
                  items={blueprint.optimization.map((item) => `[P${item.priority}] ${item.title} · ${item.impact} impact`)}
                />
              </Panel>
            </Grid>

            <Panel>
              <ListPanel
                title="Validation"
                items={issues.length ? issues.map((item) => `${item.severity.toUpperCase()}: ${item.message}`) : ["No issues"]}
              />
            </Panel>
          </>
        ) : null}
      </Stack>
    </Container>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap="sm">
      <span style={{ opacity: 0.75, fontSize: "0.8rem" }}>{label}</span>
      <strong style={{ fontSize: "1.2rem" }}>{value}</strong>
    </Stack>
  );
}

function ListPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <Stack gap="sm">
      <p style={{ margin: 0, fontWeight: 600 }}>{title}</p>
      <div style={{ display: "grid", gap: "var(--fhis-space-1)", fontSize: "0.85rem" }}>
        {items.map((item) => (
          <div key={`${title}-${item}`}>{item}</div>
        ))}
      </div>
    </Stack>
  );
}
