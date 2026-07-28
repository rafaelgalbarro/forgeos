"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { Card } from "@/components/ui/fhis/Card";
import { Container, Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { Status } from "@/components/ui/fhis/Status";
import type { InfraBlueprint } from "@/lib/build-platform/infrastructure-factory";
import { generateInfrastructureFactoryLabBlueprint } from "@/lib/lab/infrastructure-factory-lab";

export function InfrastructureFactoryLab() {
  const [blueprint, setBlueprint] = useState<InfraBlueprint | null>(null);
  const issues = useMemo(() => blueprint?.validation.issues ?? [], [blueprint]);

  return (
    <Container style={{ paddingBlock: "var(--fhis-space-6)" }}>
      <Stack gap="lg">
        <header>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-2)", marginBottom: "var(--fhis-space-2)" }}>
            <Badge variant="accent">Epic 6.7</Badge>
            <Badge variant="default">Infrastructure Factory</Badge>
          </div>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Infrastructure Factory Lab</h1>
          <p style={{ opacity: 0.8 }}>
            Genera blueprint de infraestructura (Docker, CI/CD, Vercel, Cloudflare, Supabase, Railway, AWS, Azure, GCP).
          </p>
        </header>

        <Panel>
          <Stack gap="sm">
            <div style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-2)", flexWrap: "wrap" }}>
              <Button onClick={() => setBlueprint(generateInfrastructureFactoryLabBlueprint())}>
                Generar Infrastructure Blueprint
              </Button>
              <Status
                status={blueprint?.validation.valid ? "success" : blueprint ? "warning" : "pending"}
                label={blueprint ? (blueprint.validation.valid ? "Blueprint Ready" : "Blueprint Draft") : "Waiting"}
              />
            </div>
            {blueprint ? (
              <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                Venture <code>{blueprint.meta.ventureName}</code> · Generated at{" "}
                {new Date(blueprint.meta.generatedAt).toLocaleTimeString()}
              </div>
            ) : null}
          </Stack>
        </Panel>

        {blueprint ? (
          <>
            <Grid cols={4} gap="md">
              <Card><Metric label="Docker Services" value={String(blueprint.docker.services.length)} /></Card>
              <Card><Metric label="CI/CD Jobs" value={String(blueprint.cicd.jobs.length)} /></Card>
              <Card><Metric label="Supabase Tables" value={String(blueprint.supabase.tables.length)} /></Card>
              <Card><Metric label="AWS Resources" value={String(blueprint.aws.resources.length)} /></Card>
            </Grid>

            <Grid cols={2} gap="md">
              <Panel><ListPanel title="Docker" items={[blueprint.docker.baseImage, ...blueprint.docker.services.map((s) => s.name)]} /></Panel>
              <Panel><ListPanel title="CI/CD" items={blueprint.cicd.jobs.map((j) => `${j.name} (${j.trigger})`)} /></Panel>
            </Grid>

            <Grid cols={2} gap="md">
              <Panel><ListPanel title="Vercel" items={[blueprint.vercel.projectName, ...blueprint.vercel.domains]} /></Panel>
              <Panel><ListPanel title="Cloudflare" items={[blueprint.cloudflare.pagesProject, ...blueprint.cloudflare.workers.map((w) => w.pattern)]} /></Panel>
            </Grid>

            <Grid cols={2} gap="md">
              <Panel><ListPanel title="Supabase" items={[blueprint.supabase.projectRef, ...blueprint.supabase.tables.map((t) => t.name)]} /></Panel>
              <Panel><ListPanel title="Railway" items={blueprint.railway.services.map((s) => s.name)} /></Panel>
            </Grid>

            <Grid cols={3} gap="md">
              <Panel><ListPanel title="AWS" items={blueprint.aws.resources.map((r) => `${r.service}: ${r.name}`)} /></Panel>
              <Panel><ListPanel title="Azure" items={blueprint.azure.resources.map((r) => `${r.service}: ${r.name}`)} /></Panel>
              <Panel><ListPanel title="GCP" items={blueprint.gcp.resources.map((r) => `${r.service}: ${r.name}`)} /></Panel>
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
