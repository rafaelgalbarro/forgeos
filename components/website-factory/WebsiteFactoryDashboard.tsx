"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Container,
  Grid,
  Input,
  Notification,
  Panel,
  Progress,
  SectionHeader,
  Stack,
} from "@/components/ui/fhis";
import { EmptyState } from "@/components/ui/fhis/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { WebsiteWizard } from "./WebsiteWizard";
import { WebsiteTemplates } from "./WebsiteTemplates";
import {
  WEBSITE_FACTORY_DISCLAIMER,
  WEBSITE_FACTORY_VERSION,
  WEBSITE_TEMPLATES,
  computeWizardProgress,
  createWebsiteProject,
  ensureDemoProjectSeeded,
  getProjectById,
  listProjects,
  runFullPipeline,
  runPipelineStep,
  setActiveStep,
  updateProjectIdea,
} from "@/lib/website-factory";
import type { WebsiteProject, WizardStepId } from "@/lib/website-factory";

const WebsitePreview = dynamic(() => import("./WebsitePreview").then((m) => m.WebsitePreview), {
  ssr: false,
  loading: () => <LoadingState title="Cargando preview…" description="Generando HTML de vista previa" />,
});

const WebsiteExportPanel = dynamic(
  () => import("./WebsiteExportPanel").then((m) => m.WebsiteExportPanel),
  { ssr: false }
);

const WebsiteBuildStatus = dynamic(
  () => import("./WebsiteBuildStatus").then((m) => m.WebsiteBuildStatus),
  { ssr: false }
);

interface Props {
  projectId?: string;
  showLabLink?: boolean;
}

export function WebsiteFactoryDashboard({ projectId, showLabLink = false }: Props) {
  const router = useRouter();
  const [projects, setProjects] = useState<WebsiteProject[]>([]);
  const [activeProject, setActiveProject] = useState<WebsiteProject | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<WizardStepId>("idea");
  const [selectedTemplateId, setSelectedTemplateId] = useState(WEBSITE_TEMPLATES[0]?.id ?? "landing-saas");
  const [newProjectName, setNewProjectName] = useState("");
  const [ideaDescription, setIdeaDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      ensureDemoProjectSeeded();
      const all = listProjects();
      setProjects(all);
      const target = projectId ? getProjectById(projectId) : all[0];
      if (target) {
        setActiveProject(target);
        setSelectedStepId(target.currentStepId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando proyectos");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreate = () => {
    if (!newProjectName.trim()) return;
    const project = createWebsiteProject({
      name: newProjectName.trim(),
      templateId: selectedTemplateId,
      idea: { description: ideaDescription.trim() },
    });
    setShowCreate(false);
    setNewProjectName("");
    setIdeaDescription("");
    router.push(`/website-factory/${project.id}`);
  };

  const handleRunStep = async (stepId: WizardStepId) => {
    if (!activeProject) return;
    setRunning(true);
    try {
      const result = runPipelineStep(activeProject.id, stepId);
      setActiveProject(result.project);
      setSelectedStepId(result.project.currentStepId);
      setProjects(listProjects());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error en pipeline");
    } finally {
      setRunning(false);
    }
  };

  const handleRunAll = () => {
    if (!activeProject) return;
    setRunning(true);
    try {
      const updated = runFullPipeline(activeProject.id);
      setActiveProject(updated);
      setSelectedStepId(updated.currentStepId);
      setProjects(listProjects());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error en pipeline completo");
    } finally {
      setRunning(false);
    }
  };

  const handleSaveIdea = (description: string) => {
    if (!activeProject) return;
    const updated = updateProjectIdea(activeProject.id, { description });
    setActiveProject(updated);
  };

  if (loading && !activeProject) {
    return (
      <Container>
        <LoadingState title="Cargando Website Factory…" description={WEBSITE_FACTORY_DISCLAIMER} />
      </Container>
    );
  }

  if (error && !activeProject) {
    return (
      <Container>
        <ErrorState title="Website Factory no disponible" description={error}>
          <Button onClick={refresh}>Reintentar</Button>
        </ErrorState>
      </Container>
    );
  }

  const progress = activeProject
    ? computeWizardProgress(activeProject.steps, selectedStepId)
    : { completedCount: 0, totalCount: 13, percent: 0, currentStepId: "idea" as WizardStepId, currentStepLabel: "Idea" };

  return (
    <Container className="fhis-wf-dashboard">
      <Stack gap="lg">
        <Notification
          variant="info"
          title={WEBSITE_FACTORY_VERSION}
          body={`${WEBSITE_FACTORY_DISCLAIMER}${showLabLink ? " · Modo Lab" : ""}`}
        />

        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <Badge variant="accent">Website Factory</Badge>
              {activeProject && <Badge variant="default">{activeProject.name}</Badge>}
              {showLabLink && (
                <Link href="/website-factory" style={{ fontSize: 14 }}>
                  Salir del Lab →
                </Link>
              )}
              {!showLabLink && (
                <Link href="/lab/website-factory" style={{ fontSize: 14 }}>
                  Abrir Lab →
                </Link>
              )}
            </div>
            <p style={{ margin: 0, color: "var(--fhis-color-text-muted)" }}>
              Pipeline: {progress.completedCount}/{progress.totalCount} etapas ({progress.percent}%)
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button variant="secondary" size="sm" onClick={() => setShowCreate((v) => !v)}>
              {showCreate ? "Cancelar" : "Nuevo proyecto"}
            </Button>
            {activeProject && (
              <Button variant="primary" size="sm" onClick={handleRunAll} disabled={running}>
                Ejecutar pipeline completo
              </Button>
            )}
          </div>
        </header>

        {showCreate && (
          <Panel>
            <SectionHeader title="Nuevo sitio web" subtitle="Elige plantilla y describe tu idea" />
            <Stack gap="md">
              <Input
                placeholder="Nombre del proyecto"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
              <Input
                placeholder="Describe tu idea en una frase"
                value={ideaDescription}
                onChange={(e) => setIdeaDescription(e.target.value)}
              />
              <WebsiteTemplates
                templates={WEBSITE_TEMPLATES}
                selectedId={selectedTemplateId}
                onSelect={setSelectedTemplateId}
              />
              <Button variant="primary" onClick={handleCreate} disabled={!newProjectName.trim()}>
                Crear y abrir wizard
              </Button>
            </Stack>
          </Panel>
        )}

        {!activeProject && (
          <EmptyState
            title="Sin proyectos"
            description="Crea tu primer sitio web con el asistente Website Factory."
          >
            <Button variant="primary" onClick={() => setShowCreate(true)}>
              Crear proyecto
            </Button>
          </EmptyState>
        )}

        {activeProject && (
          <>
            <Progress value={progress.percent} label={`Etapa actual: ${progress.currentStepLabel}`} />

            <Grid cols={4} gap="sm" style={{ marginBottom: 8 }}>
              {projects.slice(0, 4).map((p) => (
                <Link key={p.id} href={`/website-factory/${p.id}`}>
                  <Button variant={p.id === activeProject.id ? "primary" : "secondary"} size="sm">
                    {p.name}
                  </Button>
                </Link>
              ))}
            </Grid>

            {selectedStepId === "idea" && (
              <Panel>
                <SectionHeader title="Idea" subtitle="Define el concepto de tu sitio" />
                <Stack gap="sm">
                  <Input
                    placeholder="Descripción de la idea"
                    defaultValue={activeProject.idea.description}
                    onBlur={(e) => handleSaveIdea(e.target.value)}
                  />
                </Stack>
              </Panel>
            )}

            <WebsiteWizard
              steps={activeProject.steps}
              selectedStepId={selectedStepId}
              onSelectStep={(id) => {
                setSelectedStepId(id);
                const patched = setActiveStep(activeProject.steps, id);
                setActiveProject({ ...activeProject, steps: patched });
              }}
              onRunStep={handleRunStep}
              running={running}
            />

            <Grid cols={2} gap="lg">
              <WebsitePreview project={activeProject} />
              <Stack gap="md">
                <WebsiteExportPanel project={activeProject} />
                <WebsiteBuildStatus project={activeProject} />
              </Stack>
            </Grid>
          </>
        )}
      </Stack>
    </Container>
  );
}
