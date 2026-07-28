"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Container,
  Stack,
  Grid,
  Panel,
} from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { Notification } from "@/components/ui/fhis/Notification";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Progress } from "@/components/ui/fhis/Progress";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import {
  APPLICATION_FACTORY_DISCLAIMER,
  APPLICATION_FACTORY_VERSION,
  APP_TECH_STACK,
  createAppProject,
  readApplicationFactorySnapshot,
  deleteProject,
  getProjectProgress,
  STORAGE_KEY,
  type AppProject,
  type ApplicationFactorySnapshot,
} from "@/lib/application-factory";

const ApplicationWizard = dynamic(
  () => import("./ApplicationWizard").then((m) => m.ApplicationWizard),
  { ssr: false, loading: () => <LoadingState title="Cargando wizard…" /> }
);

interface Props {
  initialProjectId?: string;
}

export function ApplicationFactoryDashboard({ initialProjectId }: Props) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<ApplicationFactorySnapshot | null>(null);
  const [activeProject, setActiveProject] = useState<AppProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(() => {
    const data = readApplicationFactorySnapshot();
    setSnapshot(data);
    const projectId = initialProjectId ?? data.activeProjectId;
    const project = projectId
      ? data.projects.find((p) => p.id === projectId) ?? null
      : null;
    setActiveProject(project);
    setLoading(false);
  }, [initialProjectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleNewProject = useCallback(() => {
    setCreating(true);
    const project = createAppProject(
      "Aplicación web con dashboard, CRUD, autenticación y panel de administración."
    );
    const data = readApplicationFactorySnapshot();
    data.projects.unshift(project);
    data.activeProjectId = project.id;
    data.lastUpdated = new Date().toISOString();
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
    setSnapshot(data);
    setActiveProject(project);
    setCreating(false);
    router.push(`/application-factory/${project.id}`);
  }, [router]);

  const handleSelectProject = useCallback(
    (project: AppProject) => {
      setActiveProject(project);
      router.push(`/application-factory/${project.id}`);
    },
    [router]
  );

  const handleDeleteProject = useCallback(
    (id: string) => {
      const data = deleteProject(id);
      setSnapshot(data);
      if (activeProject?.id === id) {
        const next = data.projects[0] ?? null;
        setActiveProject(next);
        router.push(next ? `/application-factory/${next.id}` : "/application-factory");
      }
    },
    [activeProject, router]
  );

  if (loading) {
    return (
      <Container>
        <LoadingState title="Cargando Application Factory…" description="Inicializando pipeline" />
      </Container>
    );
  }

  if (!snapshot) {
    return (
      <Container>
        <ErrorState title="Application Factory no disponible" description="No se pudo cargar el estado.">
          <Button onClick={refresh}>Reintentar</Button>
        </ErrorState>
      </Container>
    );
  }

  const completedCount = snapshot.projects.filter((p) => p.completed).length;

  return (
    <Container className="fhis-af-dashboard">
      <Stack gap="lg">
        <Notification
          variant="info"
          title={APPLICATION_FACTORY_VERSION}
          body={APPLICATION_FACTORY_DISCLAIMER}
        />

        <header>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <Badge variant="accent">Application Factory</Badge>
            {APP_TECH_STACK.map((t) => (
              <Badge key={t} variant="default">
                {t}
              </Badge>
            ))}
          </div>
          <SectionHeader
            title="Fábrica de Aplicaciones Web"
            subtitle="De la idea a una app funcional con Next.js + Supabase — preview navegable incluido."
          />
        </header>

        <Grid cols={4} gap="md">
          <KpiBlock label="Proyectos" value={String(snapshot.projects.length)} />
          <KpiBlock label="Completados" value={String(completedCount)} />
          <KpiBlock label="Pipeline" value="14 pasos" />
          <KpiBlock label="Stack" value="Next.js + Supabase" />
        </Grid>

        <Grid cols={2} gap="lg">
          <Panel>
            <Stack gap="md">
              <SectionHeader title="Mis proyectos" subtitle="Proyectos guardados en localStorage." />
              <Button variant="primary" disabled={creating} onClick={handleNewProject}>
                {creating ? "Creando…" : "+ Nuevo proyecto"}
              </Button>
              {snapshot.projects.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13, color: "var(--fhis-color-text-muted)" }}>
                  No hay proyectos. Crea uno para empezar el wizard.
                </p>
              ) : (
                <Stack gap="sm">
                  {snapshot.projects.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        padding: "8px 12px",
                        borderRadius: 6,
                        border:
                          activeProject?.id === p.id
                            ? "2px solid var(--fhis-color-accent)"
                            : "1px solid var(--fhis-color-border)",
                        cursor: "pointer",
                      }}
                      onClick={() => handleSelectProject(p)}
                    >
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: 14 }}>{p.name}</strong>
                        <div style={{ fontSize: 12, color: "var(--fhis-color-text-muted)" }}>
                          {p.description.slice(0, 60)}
                          {p.description.length > 60 ? "…" : ""}
                        </div>
                        <Progress value={getProjectProgress(p)} />
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {p.completed && <Badge variant="accent">Listo</Badge>}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(p.id);
                          }}
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                  ))}
                </Stack>
              )}
            </Stack>
          </Panel>

          <Panel>
            <Stack gap="md">
              <SectionHeader title="Pipeline (14 pasos)" subtitle="Generación guiada de aplicación completa." />
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
                <li>PRD → Arquitectura → Base de datos</li>
                <li>API → Frontend → Backend</li>
                <li>Auth → Admin → Permisos → Tests</li>
                <li>GitHub (stub) → Supabase (stub)</li>
                <li>Preview navegable → Deploy (stub)</li>
              </ul>
              <p style={{ margin: 0, fontSize: 12, color: "var(--fhis-color-text-muted)" }}>
                GitHub/Supabase/Deploy: referencia cloud-foundation (Program 4300) — stub.
              </p>
              <Link href="/cloud">
                <Button variant="ghost" size="sm">
                  Ver Cloud Foundation →
                </Button>
              </Link>
            </Stack>
          </Panel>
        </Grid>

        {activeProject ? (
          <ApplicationWizard
            project={activeProject}
            onProjectChange={(p) => {
              setActiveProject(p);
              refresh();
            }}
          />
        ) : (
          <Panel>
            <p style={{ margin: 0, textAlign: "center", color: "var(--fhis-color-text-muted)" }}>
              Selecciona o crea un proyecto para abrir el wizard.
            </p>
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <Link href="/">
                <Button variant="ghost">← Volver al Home</Button>
              </Link>
            </div>
          </Panel>
        )}
      </Stack>
    </Container>
  );
}
