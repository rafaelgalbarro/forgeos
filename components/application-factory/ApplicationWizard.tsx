"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import type { AppProject, WizardStepId } from "@/lib/application-factory";
import {
  runPipelineStep,
  runFullPipeline,
  saveProject,
  getProjectProgress,
  WIZARD_STEP_ORDER,
} from "@/lib/application-factory";
import { Stack, Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { Progress } from "@/components/ui/fhis/Progress";
import { Input } from "@/components/ui/fhis/Input";
import { Notification } from "@/components/ui/fhis/Notification";
import { LoadingState } from "@/components/ui/LoadingState";

const ApplicationPreview = dynamic(
  () => import("./ApplicationPreview").then((m) => m.ApplicationPreview),
  { ssr: false, loading: () => <LoadingState title="Cargando preview…" /> }
);

const ApplicationBuildStatus = dynamic(
  () => import("./ApplicationBuildStatus").then((m) => m.ApplicationBuildStatus),
  { ssr: false, loading: () => <LoadingState title="Cargando build status…" /> }
);

const ApplicationExportPanel = dynamic(
  () => import("./ApplicationExportPanel").then((m) => m.ApplicationExportPanel),
  { ssr: false, loading: () => <LoadingState title="Cargando export…" /> }
);

const PRDViewer = dynamic(
  () => import("./PRDViewer").then((m) => m.PRDViewer),
  { ssr: false }
);

const ArchitectureViewer = dynamic(
  () => import("./ArchitectureViewer").then((m) => m.ArchitectureViewer),
  { ssr: false }
);

interface Props {
  project: AppProject;
  onProjectChange: (project: AppProject) => void;
}

export function ApplicationWizard({ project, onProjectChange }: Props) {
  const [running, setRunning] = useState(false);
  const [descInput, setDescInput] = useState(project.description);
  const [nameInput, setNameInput] = useState(project.name);

  const progress = getProjectProgress(project);
  const currentStep = project.currentStep;

  const handleRunStep = useCallback(
    async (stepId: WizardStepId) => {
      setRunning(true);
      try {
        let current = { ...project };
        if (stepId === "prd") {
          current = { ...current, description: descInput, name: nameInput || current.name };
          saveProject(current);
        }
        const result = await runPipelineStep(current, stepId);
        onProjectChange(result.project);
      } finally {
        setRunning(false);
      }
    },
    [project, descInput, nameInput, onProjectChange]
  );

  const handleRunAll = useCallback(async () => {
    setRunning(true);
    try {
      let current = { ...project, description: descInput, name: nameInput || project.name };
      saveProject(current);
      const result = await runFullPipeline(current);
      onProjectChange(result);
    } finally {
      setRunning(false);
    }
  }, [project, descInput, nameInput, onProjectChange]);

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
                      : step?.status === "stub"
                        ? "amber"
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
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button variant="primary" disabled={running} onClick={() => handleRunStep(currentStep)}>
              {running ? "Ejecutando…" : `Ejecutar paso: ${project.steps.find((s) => s.id === currentStep)?.label}`}
            </Button>
            <Button variant="secondary" disabled={running} onClick={handleRunAll}>
              Pipeline completo
            </Button>
          </div>
        </Stack>
      </Panel>

      {currentStep === "prd" && (
        <Panel>
          <Stack gap="md">
            <SectionHeader title="Descripción de la app" subtitle="Describe la aplicación web que quieres crear." />
            <Input
              label="Nombre del proyecto"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Mi Aplicación"
            />
            <label style={{ fontSize: 13 }}>
              Descripción
              <textarea
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                placeholder="Describe tu app: funcionalidades, usuarios, integraciones…"
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
          </Stack>
        </Panel>
      )}

      {(currentStep === "github" || currentStep === "supabase" || currentStep === "deploy") && (
        <Notification
          variant="info"
          title="Integración cloud-foundation"
          body={
            currentStep === "github"
              ? "GitHub — estrategia main/develop/feature/* (Program 4300). Stub preparado."
              : currentStep === "supabase"
                ? "Supabase — entornos dev/preview/staging/prod. Ver /cloud para configuración."
                : "Deploy — Vercel + Supabase via Cloud Foundation (/cloud). Stub preparado."
          }
        />
      )}

      {project.prd && <PRDViewer prd={project.prd} />}
      {project.architecture && <ArchitectureViewer architecture={project.architecture} />}

      {(currentStep === "preview" || project.preview) && (
        <ApplicationPreview preview={project.preview} />
      )}

      <ApplicationBuildStatus project={project} />

      {(project.completed || project.exportBundle) && (
        <ApplicationExportPanel project={project} />
      )}
    </Stack>
  );
}
