"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { Card } from "@/components/ui/fhis/Card";
import { Container, Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { Status } from "@/components/ui/fhis/Status";
import { generateFrontendFactoryLabBlueprint } from "@/lib/lab/frontend-factory-lab";
import type { FrontendBlueprint } from "@/lib/build-platform/frontend-factory";

export function FrontendFactoryLab() {
  const [blueprint, setBlueprint] = useState<FrontendBlueprint | null>(null);

  const issues = useMemo(() => blueprint?.validation.issues ?? [], [blueprint]);

  return (
    <Container style={{ paddingBlock: "var(--fhis-space-6)" }}>
      <Stack gap="lg">
        <header>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-2)", marginBottom: "var(--fhis-space-2)" }}>
            <Badge variant="accent">Epic 6.3</Badge>
            <Badge variant="default">Frontend Factory</Badge>
          </div>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Frontend Factory Lab</h1>
          <p style={{ opacity: 0.8 }}>
            Genera blueprint de frontend (estructura, rutas, layouts, FHIS components, pages, nav, forms, dashboards, widgets).
          </p>
        </header>

        <Panel>
          <Stack gap="sm">
            <div style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-2)", flexWrap: "wrap" }}>
              <Button onClick={() => setBlueprint(generateFrontendFactoryLabBlueprint())}>
                Generar Frontend Blueprint
              </Button>
              <Status status={blueprint?.validation.valid ? "success" : blueprint ? "warning" : "pending"} label={blueprint ? (blueprint.validation.valid ? "Blueprint Ready" : "Blueprint Draft") : "Waiting"} />
            </div>
            {blueprint ? (
              <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                Venture <code>{blueprint.meta.ventureName}</code> · Generated at {new Date(blueprint.meta.generatedAt).toLocaleTimeString()}
              </div>
            ) : null}
          </Stack>
        </Panel>

        {blueprint ? (
          <>
            <Grid cols={4} gap="md">
              <Card><Metric label="Structure Nodes" value={String(countNodes(blueprint))} /></Card>
              <Card><Metric label="Routes" value={String(blueprint.routes.length)} /></Card>
              <Card><Metric label="Pages" value={String(blueprint.pages.length)} /></Card>
              <Card><Metric label="Widgets" value={String(blueprint.widgets.length)} /></Card>
            </Grid>

            <Grid cols={2} gap="md">
              <Panel><ListPanel title="Routes" items={blueprint.routes.map((item) => `${item.path} (${item.auth})`)} /></Panel>
              <Panel><ListPanel title="Layouts" items={blueprint.layouts.map((item) => `${item.name}: ${item.regions.join(", ")}`)} /></Panel>
            </Grid>

            <Grid cols={2} gap="md">
              <Panel><ListPanel title="Pages" items={blueprint.pages.map((item) => `${item.title} -> ${item.routePath}`)} /></Panel>
              <Panel><ListPanel title="Navigation" items={blueprint.navigation.map((item) => `${item.label} -> ${item.routePath}`)} /></Panel>
            </Grid>

            <Grid cols={2} gap="md">
              <Panel><ListPanel title="Forms" items={blueprint.forms.map((item) => `${item.title} (${item.fields.length} fields)`)} /></Panel>
              <Panel><ListPanel title="Dashboards" items={blueprint.dashboards.map((item) => `${item.title} (${item.widgets.length} widgets)`)} /></Panel>
            </Grid>

            <Grid cols={2} gap="md">
              <Panel><ListPanel title="Widgets" items={blueprint.widgets.map((item) => `${item.title} · ${item.fhisComponent}`)} /></Panel>
              <Panel><ListPanel title="FHIS Components" items={blueprint.components.map((item) => `${item.name} -> ${item.fhisComponent}`)} /></Panel>
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

function countNodes(blueprint: FrontendBlueprint): number {
  const walk = (nodes: FrontendBlueprint["appStructure"]): number =>
    nodes.reduce((acc, node) => acc + 1 + (node.children ? walk(node.children) : 0), 0);

  return walk(blueprint.appStructure);
}
