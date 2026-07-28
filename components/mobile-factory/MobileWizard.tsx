"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import type { MobileProject, Template, WizardStepId } from "@/lib/mobile-factory";
import {
  runPipelineStep,
  runFullPipeline,
  saveProject,
  getProjectProgress,
  WIZARD_STEP_ORDER,
} from "@/lib/mobile-factory";
import { Container, Stack, Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { Progress } from "@/components/ui/fhis/Progress";
import { Input } from "@/components/ui/fhis/Input";
import { Notification } from "@/components/ui/fhis/Notification";
import { LoadingState } from "@/components/ui/LoadingState";

const MobileTemplates = dynamic(
  () => import("./MobileTemplates").then((m) => m.MobileTemplates),
  { ssr: false, loading: () => <LoadingState title="Cargando plantillas…" /> }
);

const MobilePreview = dynamic(
  () => import("./MobilePreview").then((m) => m.MobilePreview),
  { ssr: false, loading: () => <LoadingState title="Cargando preview…" /> }
);

const MobileBuildStatus = dynamic(
  () => import("./MobileBuildStatus").then((m) => m.MobileBuildStatus),
  { ssr: false, loading: () => <LoadingState title="Cargando builds…" /> }
);

interface Props {
  project: MobileProject;
  onProjectChange: (project: MobileProject) => void;
}

export function MobileWizard({ project, onProjectChange }: Props) {
  const [running, setRunning] = useState(false);
  const [ideaInput, setIdeaInput] = useState(project.idea);
  const [nameInput, setNameInput] = useState(project.name);

  const progress = getProjectProgress(project);

  const handleRunStep = useCallback(
    async (stepId: WizardStepId) => {
      setRunning(true);
      try {
        let current = { ...project };
        if (stepId === "idea") {
          current = { ...current, idea: ideaInput, name: nameInput || current.name };
          saveProject(current);
        }
        const result = await runPipelineStep(current, stepId);
        onProjectChange(result.project);
      } finally {
        setRunning(false);
      }
    },
    [project, ideaInput, nameInput, onProjectChange]
  );

  const handleRunAll = useCallback(async () => {
    setRunning(true);
    try {
      let current = { ...project, idea: ideaInput, name: nameInput || project.name };
      saveProject(current);
      const result = await runFullPipeline(current);
      onProjectChange(result);
    } finally {
      setRunning(false);
    }
  }, [project, ideaInput, nameInput, onProjectChange]);

  const handleTemplateSelect = useCallback(
    (template: Template) => {
      const updated = { ...project, templateId: template.id, name: nameInput || template.name };
      saveProject(updated);
      onProjectChange(updated);
    },
    [project, nameInput, onProjectChange]
  );

  const currentStep = project.currentStep;

  return (
    <Stack gap="lg">
      <Panel>
        <Stack gap="md">
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Badge variant="accent">Wizard</Badge>
            <Badge variant="default">{project.name}</Badge>
            <Badge variant="amber">{progress}%</Badge>
          </div>
          <Progress value={progress} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {WIZARD_STEP_ORDER.map((stepId) => {
              const step = project.steps.find((s) => s.id === stepId);
              const active = currentStep === stepId;
              return (
                <Badge
                  key={stepId}
                  variant={
                    step?.status === "success"
                      ? "accent"
                      : active
                        ? "amber"
                        : "default"
                  }
                >
                  {step?.label ?? stepId}
                </Badge>
              );
            })}
          </div>
        </Stack>
      </Panel>

      {currentStep === "idea" && (
        <Panel>
          <Stack gap="md">
            <SectionHeader title="Tu idea" subtitle="Describe la app móvil que quieres crear." />
            <Input
              label="Nombre del proyecto"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Mi App Móvil"
            />
            <label style={{ fontSize: 13 }}>
              Idea
              <textarea
                value={ideaInput}
                onChange={(e) => setIdeaInput(e.target.value)}
                placeholder="Describe tu app: audiencia, funcionalidades clave…"
                rows={4}
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: 8,
                  borderRadius: 6,
                  border: "1px solid var(--fhis-color-border)",
                  fontFamily: "inherit",
                  fontSize: 14,
                }}
              />
            </label>
            <Button
              variant="primary"
              disabled={running || !ideaInput.trim()}
              onClick={() => void handleRunStep("idea")}
            >
              {running ? "Procesando…" : "Continuar"}
            </Button>
          </Stack>
        </Panel>
      )}

      {currentStep === "template" && (
        <Panel>
          <Stack gap="md">
            <SectionHeader title="Plantilla" subtitle="Selecciona el tipo de app móvil." />
            <MobileTemplates
              selectedId={project.templateId}
              onSelect={handleTemplateSelect}
            />
            <Button
              variant="primary"
              disabled={running || !project.templateId}
              onClick={() => void handleRunStep("template")}
            >
              {running ? "Procesando…" : "Generar navegación →"}
            </Button>
          </Stack>
        </Panel>
      )}

      {(currentStep === "navigation" ||
        currentStep === "screens" ||
        currentStep === "auth" ||
        currentStep === "api" ||
        currentStep === "structure") && (
        <Panel>
          <Stack gap="md">
            <SectionHeader
              title="Generando scaffold"
              subtitle={`Paso actual: ${project.steps.find((s) => s.id === currentStep)?.label}`}
            />
            <Button
              variant="primary"
              disabled={running}
              onClick={() => void handleRunStep(currentStep)}
            >
              {running ? "Generando…" : `Ejecutar paso: ${currentStep}`}
            </Button>
            {project.navigation && (
              <Notification
                variant="info"
                title="Navegación"
                body={`${project.navigation.type} · ${project.navigation.routes.length} rutas`}
              />
            )}
            {project.screens.length > 0 && (
              <Notification
                variant="info"
                title="Pantallas"
                body={`${project.screens.length} pantallas generadas`}
              />
            )}
          </Stack>
        </Panel>
      )}

      {(currentStep === "preview" || project.preview) && (
        <MobilePreview preview={project.preview} />
      )}

      {currentStep === "preview" && !project.preview && (
        <Panel>
          <Button
            variant="primary"
            disabled={running}
            onClick={() => void handleRunStep("preview")}
          >
            {running ? "Generando preview…" : "Generar preview Expo"}
          </Button>
        </Panel>
      )}

      {(currentStep === "android" || currentStep === "ios" || project.androidBuild || project.iosBuild) && (
        <>
          <MobileBuildStatus android={project.androidBuild} ios={project.iosBuild} />
          {(currentStep === "android" || currentStep === "ios") && (
            <Panel>
              <Button
                variant="primary"
                disabled={running}
                onClick={() => void handleRunStep(currentStep)}
              >
                {running ? "Compilando…" : `Ejecutar build ${currentStep}`}
              </Button>
            </Panel>
          )}
        </>
      )}

      {project.completed && (
        <Notification
          variant="info"
          title="¡Proyecto completado!"
          body="Tu app móvil Expo está lista con preview y builds simulados."
        />
      )}

      <Container style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button variant="secondary" disabled={running} onClick={() => void handleRunAll()}>
          Ejecutar pipeline completo
        </Button>
      </Container>
    </Stack>
  );
}
