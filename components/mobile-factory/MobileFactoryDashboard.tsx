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
  MOBILE_FACTORY_DISCLAIMER,
  MOBILE_FACTORY_VERSION,
  MOBILE_TECH_STACK,
  createMobileProject,
  readMobileFactorySnapshot,
  deleteProject,
  getProjectProgress,
  type MobileProject,
  type MobileFactorySnapshot,
} from "@/lib/mobile-factory";

const MobileWizard = dynamic(
  () => import("./MobileWizard").then((m) => m.MobileWizard),
  { ssr: false, loading: () => <LoadingState title="Cargando wizard…" /> }
);

interface Props {
  initialProjectId?: string;
}

export function MobileFactoryDashboard({ initialProjectId }: Props) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<MobileFactorySnapshot | null>(null);
  const [activeProject, setActiveProject] = useState<MobileProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(() => {
    const data = readMobileFactorySnapshot();
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
    const project = createMobileProject(
      "App móvil con React Native y Expo para iOS y Android."
    );
    const data = readMobileFactorySnapshot();
    data.projects.unshift(project);
    data.activeProjectId = project.id;
    data.lastUpdated = new Date().toISOString();
    if (typeof window !== "undefined") {
      localStorage.setItem("forgeos-mobile-factory", JSON.stringify(data));
    }
    setSnapshot(data);
    setActiveProject(project);
    setCreating(false);
    router.push(`/mobile-factory/${project.id}`);
  }, [router]);

  const handleSelectProject = useCallback(
    (project: MobileProject) => {
      setActiveProject(project);
      router.push(`/mobile-factory/${project.id}`);
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
        router.push(next ? `/mobile-factory/${next.id}` : "/mobile-factory");
      }
    },
    [activeProject, router]
  );

  if (loading) {
    return (
      <Container>
        <LoadingState title="Cargando Mobile Factory…" description="Inicializando pipeline móvil" />
      </Container>
    );
  }

  if (!snapshot) {
    return (
      <Container>
        <ErrorState title="Mobile Factory no disponible" description="No se pudo cargar el estado.">
          <Button onClick={refresh}>Reintentar</Button>
        </ErrorState>
      </Container>
    );
  }

  const completedCount = snapshot.projects.filter((p) => p.completed).length;

  return (
    <Container className="fhis-mf-dashboard">
      <Stack gap="lg">
        <Notification
          variant="info"
          title={MOBILE_FACTORY_VERSION}
          body={MOBILE_FACTORY_DISCLAIMER}
        />

        <header>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <Badge variant="accent">Mobile Factory</Badge>
            {MOBILE_TECH_STACK.map((t) => (
              <Badge key={t} variant="default">
                {t}
              </Badge>
            ))}
          </div>
          <SectionHeader
            title="Fábrica de Apps Móviles"
            subtitle="De la idea a un scaffold Expo/React Native con preview y builds simulados."
          />
        </header>

        <Grid cols={4} gap="md">
          <KpiBlock label="Proyectos" value={String(snapshot.projects.length)} />
          <KpiBlock label="Completados" value={String(completedCount)} />
          <KpiBlock label="Stack" value="Expo 52" />
          <KpiBlock label="Plataformas" value="iOS + Android" />
        </Grid>

        <Grid cols={2} gap="lg">
          <Panel>
            <Stack gap="md">
              <SectionHeader title="Mis proyectos" subtitle="Proyectos guardados en localStorage." />
              <Button variant="primary" disabled={creating} onClick={handleNewProject}>
                {creating ? "Creando…" : "+ Nuevo proyecto móvil"}
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
                      <div>
                        <strong style={{ fontSize: 14 }}>{p.name}</strong>
                        <div style={{ fontSize: 12, color: "var(--fhis-color-text-muted)" }}>
                          {p.idea.slice(0, 60)}
                          {p.idea.length > 60 ? "…" : ""}
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
              <SectionHeader title="Pipeline" subtitle="8 etapas del wizard móvil." />
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
                <li>Navegación (tabs/stack/drawer)</li>
                <li>Pantallas</li>
                <li>Autenticación</li>
                <li>Integración API</li>
                <li>Estructura Expo/RN</li>
                <li>Preview Expo (QR stub)</li>
                <li>Build Android (stub)</li>
                <li>Build iOS (stub)</li>
              </ul>
              <p style={{ margin: 0, fontSize: 12, color: "var(--fhis-color-text-muted)" }}>
                GitHub/Deploy: referencia cloud-foundation (Program 4300) — stub.
              </p>
            </Stack>
          </Panel>
        </Grid>

        {activeProject ? (
          <MobileWizard
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
