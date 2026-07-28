"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { Card } from "@/components/ui/fhis/Card";
import { Container, Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { Status } from "@/components/ui/fhis/Status";
import type { QaBlueprint } from "@/lib/build-platform/qa-factory";
import { generateQaFactoryLabBlueprint } from "@/lib/lab/qa-factory-lab";

export function QaFactoryLab() {
  const [blueprint, setBlueprint] = useState<QaBlueprint | null>(null);

  const issues = useMemo(() => blueprint?.validation.issues ?? [], [blueprint]);

  return (
    <Container style={{ paddingBlock: "var(--fhis-space-6)" }}>
      <Stack gap="lg">
        <header>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-2)", marginBottom: "var(--fhis-space-2)" }}>
            <Badge variant="accent">Epic 6.6</Badge>
            <Badge variant="default">QA Factory</Badge>
          </div>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>QA Factory Lab</h1>
          <p style={{ opacity: 0.8 }}>
            Genera blueprint de QA (test plan, Playwright, unit, integration, accessibility, performance, security, regression).
          </p>
        </header>

        <Panel>
          <Stack gap="sm">
            <div style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-2)", flexWrap: "wrap" }}>
              <Button onClick={() => setBlueprint(generateQaFactoryLabBlueprint())}>
                Generar QA Blueprint
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
              <Card><Metric label="Test Suites" value={String(blueprint.testPlan.suites.length)} /></Card>
              <Card><Metric label="Playwright Scenarios" value={String(blueprint.playwright.scenarios.length)} /></Card>
              <Card><Metric label="Unit Tests" value={String(blueprint.unitTests.testCases.length)} /></Card>
              <Card><Metric label="Integration Tests" value={String(blueprint.integrationTests.testCases.length)} /></Card>
            </Grid>

            <Grid cols={2} gap="md">
              <Panel>
                <ListPanel
                  title="Test Plan"
                  items={[
                    blueprint.testPlan.title,
                    ...blueprint.testPlan.objectives.map((item) => `Objective: ${item}`),
                    `Coverage — unit: ${blueprint.testPlan.coverageTargets.unit}%, integration: ${blueprint.testPlan.coverageTargets.integration}%, e2e: ${blueprint.testPlan.coverageTargets.e2e}%`,
                    ...blueprint.testPlan.suites.map((item) => `${item.name} (${item.type}, ${item.priority})`),
                  ]}
                />
              </Panel>
              <Panel>
                <ListPanel
                  title="CI Gates"
                  items={blueprint.testPlan.ciGates}
                />
              </Panel>
            </Grid>

            <Grid cols={2} gap="md">
              <Panel>
                <ListPanel
                  title="Playwright"
                  items={[
                    `Framework: ${blueprint.playwright.framework} · ${blueprint.playwright.configPath}`,
                    `Browsers: ${blueprint.playwright.browsers.join(", ")}`,
                    ...blueprint.playwright.scenarios.map((item) => `${item.name} @ ${item.route}`),
                  ]}
                />
              </Panel>
              <Panel>
                <ListPanel
                  title="Unit Tests"
                  items={[
                    `Framework: ${blueprint.unitTests.framework}`,
                    ...blueprint.unitTests.testCases.map((item) => `${item.module}: ${item.description} [${item.testType}]`),
                    ...blueprint.unitTests.mockStrategy.map((item) => `Mock: ${item}`),
                  ]}
                />
              </Panel>
            </Grid>

            <Grid cols={2} gap="md">
              <Panel>
                <ListPanel
                  title="Integration Tests"
                  items={[
                    `Framework: ${blueprint.integrationTests.framework}`,
                    ...blueprint.integrationTests.testCases.map((item) => `${item.method} ${item.endpoint}: ${item.description}`),
                    ...blueprint.integrationTests.fixtures.map((item) => `Fixture: ${item}`),
                  ]}
                />
              </Panel>
              <Panel>
                <ListPanel
                  title="Accessibility"
                  items={[
                    `Standard: ${blueprint.accessibility.standard}`,
                    `Scan routes: ${blueprint.accessibility.scanRoutes.join(", ")}`,
                    ...blueprint.accessibility.checkpoints.map((item) => `${item.wcagCriterion} — ${item.target} (${item.tool})`),
                  ]}
                />
              </Panel>
            </Grid>

            <Grid cols={2} gap="md">
              <Panel>
                <ListPanel
                  title="Performance"
                  items={[
                    `Tool: ${blueprint.performance.tool}`,
                    ...blueprint.performance.scenarios.map((item) =>
                      `${item.name}: ${item.budgets.map((b) => `${b.metric} ${b.threshold}`).join(", ")}`
                    ),
                  ]}
                />
              </Panel>
              <Panel>
                <ListPanel
                  title="Security"
                  items={[
                    `Tools: ${blueprint.security.scanTools.join(", ")}`,
                    ...blueprint.security.testCases.map((item) => `[${item.severity}] ${item.category}: ${item.description}`),
                    ...blueprint.security.complianceChecks.map((item) => `Compliance: ${item}`),
                  ]}
                />
              </Panel>
            </Grid>

            <Panel>
              <ListPanel
                title="Regression"
                items={[
                  `Baseline: ${blueprint.regression.baselineStrategy}`,
                  ...blueprint.regression.suites.map((item) => `${item.name} (${item.trigger}): ${item.testIds.join(", ")}`),
                ]}
              />
            </Panel>

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
