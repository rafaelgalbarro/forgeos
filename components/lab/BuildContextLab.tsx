"use client";

import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { Card } from "@/components/ui/fhis/Card";
import { Container, Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Status } from "@/components/ui/fhis/Status";
import { Timeline } from "@/components/ui/fhis/Timeline";
import type { FhisStatus } from "@/lib/design-system/types";
import {
  BUILD_CONTEXT_SECTION_LABELS,
  BUILD_CONTEXT_SECTION_ORDER,
  type BuildContextSectionStatus,
} from "@/lib/build-platform/build-context";
import {
  createBuildContextLab,
  refreshBuildContextLab,
  simulateStaleSection,
  type BuildContextLabSession,
} from "@/lib/lab/build-context-lab";
import { LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";

function statusToFhis(status: BuildContextSectionStatus): FhisStatus {
  switch (status) {
    case "complete":
      return "success";
    case "partial":
      return "active";
    case "stale":
      return "warning";
    default:
      return "idle";
  }
}

function statusVariant(status: BuildContextSectionStatus): "accent" | "amber" | "blue" | "default" {
  switch (status) {
    case "complete":
      return "accent";
    case "partial":
      return "blue";
    case "stale":
      return "amber";
    default:
      return "default";
  }
}

export function BuildContextLab() {
  const [session, setSession] = useState<BuildContextLabSession>(() => createBuildContextLab());
  const [selected, setSelected] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setSession((s) => refreshBuildContextLab(s));
  }, []);

  const staleFirst = useCallback(() => {
    setSession((s) => simulateStaleSection(s, "discovery"));
  }, []);

  const ctx = session.context;
  const selectedSection = selected ? ctx.sections[selected as keyof typeof ctx.sections] : null;

  const kpis = useMemo(
    () => [
      { label: "Completitud", value: `${ctx.meta.completenessScore}%` },
      { label: "Versión", value: String(ctx.meta.version) },
      {
        label: "Listo para Build",
        value: ctx.meta.readyForBuild ? "Sí" : "No",
      },
      {
        label: "Secciones",
        value: String(
          BUILD_CONTEXT_SECTION_ORDER.filter((id) => ctx.sections[id].status !== "empty").length
        ),
      },
    ],
    [ctx]
  );

  return (
    <Container style={{ paddingBlock: "var(--fhis-space-6)" }}>
      <Stack gap="lg">
        <header>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-2)", marginBottom: "var(--fhis-space-2)" }}>
            <Badge variant="accent">Epic 6.0</Badge>
            <Badge variant="default">Build Context</Badge>
          </div>
          <p style={{ opacity: 0.7, marginBottom: "var(--fhis-space-2)" }}>
            ForgeOS Build Platform Lab · Venture: <code>{LAB_MOCK_VENTURE_ID}</code>
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Build Context</h1>
          <p style={{ opacity: 0.8, marginTop: "var(--fhis-space-2)" }}>
            Fuente única de verdad para la AI Software Factory — secciones, origen, estado y validaciones.
          </p>
        </header>

        <Panel>
          <Stack gap="sm">
            <p style={{ margin: 0, fontWeight: 600 }}>
              Venture: {ctx.meta.ventureName}
            </p>
            <div style={{ display: "flex", gap: "var(--fhis-space-2)", flexWrap: "wrap" }}>
              <Button onClick={refresh}>Reconstruir contexto</Button>
              <Button variant="secondary" onClick={staleFirst}>
                Simular sección stale
              </Button>
            </div>
          </Stack>
        </Panel>

        <Grid cols={4} gap="md">
          {kpis.map((k) => (
            <Card key={k.label}>
              <KpiBlock label={k.label} value={k.value} />
            </Card>
          ))}
        </Grid>

        <Grid cols={2} gap="md">
          <Panel>
            <Stack gap="sm">
              <p style={{ margin: 0, fontWeight: 600 }}>Secciones</p>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr>
                      <th align="left">Sección</th>
                      <th align="left">Estado</th>
                      <th align="left">Origen</th>
                      <th align="left">Score</th>
                      <th align="left">Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BUILD_CONTEXT_SECTION_ORDER.map((id) => {
                      const s = ctx.sections[id];
                      return (
                        <tr
                          key={id}
                          onClick={() => setSelected(id)}
                          style={{
                            cursor: "pointer",
                            background:
                              selected === id ? "var(--fhis-color-surface-elevated)" : undefined,
                          }}
                        >
                          <td style={{ padding: "var(--fhis-space-2)" }}>{BUILD_CONTEXT_SECTION_LABELS[id]}</td>
                          <td style={{ padding: "var(--fhis-space-2)" }}>
                            <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                          </td>
                          <td style={{ padding: "var(--fhis-space-2)" }}>{s.origin}</td>
                          <td style={{ padding: "var(--fhis-space-2)" }}>{s.validation.score}</td>
                          <td style={{ padding: "var(--fhis-space-2)" }}>{s.validation.issues.length}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Stack>
          </Panel>

          <Panel>
            <Stack gap="sm">
              <p style={{ margin: 0, fontWeight: 600 }}>
                Detalle: {selectedSection?.label ?? "Selecciona una fila"}
              </p>
              {selectedSection ? (
                <>
                  <Status status={statusToFhis(selectedSection.status)} label={selectedSection.status} />
                  <p style={{ margin: 0 }}>
                    <strong>Origen:</strong> {selectedSection.origin}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Módulo:</strong> {selectedSection.sourceModule ?? "—"}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Válido:</strong> {selectedSection.validation.valid ? "Sí" : "No"}
                  </p>
                  {selectedSection.validation.issues.length > 0 && (
                    <Card>
                      <p style={{ margin: "0 0 var(--fhis-space-2)", fontWeight: 600 }}>Validaciones</p>
                      <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                        {selectedSection.validation.issues.map((i) => (
                          <li key={i.code}>
                            [{i.severity}] {i.message}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}
                  <Card>
                    <p style={{ margin: "0 0 var(--fhis-space-2)", fontWeight: 600 }}>Datos</p>
                    <pre
                      style={{
                        margin: 0,
                        fontSize: "0.7rem",
                        maxHeight: 280,
                        overflow: "auto",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {JSON.stringify(selectedSection.data, null, 2)}
                    </pre>
                  </Card>
                </>
              ) : (
                <p style={{ color: "var(--fhis-color-text-muted)" }}>Haz clic en una sección de la tabla.</p>
              )}
            </Stack>
          </Panel>
        </Grid>

        <Panel>
          <Stack gap="sm">
            <p style={{ margin: 0, fontWeight: 600 }}>Historial</p>
            <Timeline
              items={session.history.map((h) => ({
                title: h.summary,
                time: h.createdAt,
                description: `v${h.version} · ${h.action} · ${h.completenessScore}%`,
              }))}
            />
          </Stack>
        </Panel>
      </Stack>
    </Container>
  );
}
