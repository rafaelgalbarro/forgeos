/** PROGRAM 5350 — Application output adapter (Application Factory preview). */

import type { CreationOutput, WebApplicationOutputPayload } from "../types";
import { createOutputId } from "../output-registry";
import { buildGenericDemoScenario } from "../demo-fixtures";

export interface ApplicationAdapterInput {
  missionId: string;
  ventureId?: string;
  ideaText: string;
  projectName: string;
}

export async function buildApplicationOutput(input: ApplicationAdapterInput): Promise<CreationOutput> {
  const { createAppProject } = await import("@/lib/application-factory");
  const { generatePreviewApp } = await import("@/lib/application-factory/preview-app");

  const project = createAppProject(input.ideaText, input.projectName);
  const { runFullPipeline } = await import("@/lib/application-factory");
  await runFullPipeline(project);

  const { getProjectById } = await import("@/lib/application-factory");
  const fullProject = getProjectById(project.id);
  const preview = fullProject ? generatePreviewApp(fullProject) : null;
  const scenario = buildGenericDemoScenario(input.ideaText);
  const now = new Date().toISOString();

  const payload: WebApplicationOutputPayload = {
    projectId: project.id,
    scenarios: [{ id: scenario.id, label: scenario.label, description: scenario.description }],
    roles: scenario.roles,
    demoFlows: scenario.flows,
    entities: scenario.entities,
    features: fullProject?.prd?.features ?? ["Dashboard", "CRUD", "Auth", "Admin"],
  };

  const routes = preview?.pages.map((p) => ({
    id: p.id,
    path: `/${p.slug}`,
    label: p.title,
    layout: p.layout,
  })) ?? [
    { id: "dashboard", path: "/dashboard", label: "Dashboard" },
    { id: "login", path: "/login", label: "Login" },
  ];

  return {
    outputId: createOutputId("WEB_APPLICATION_OUTPUT"),
    missionId: input.missionId,
    ventureId: input.ventureId,
    type: "WEB_APPLICATION_OUTPUT",
    title: `${input.projectName} — Web App`,
    status: "PREVIEW_READY",
    version: "1.0.0",
    createdAt: now,
    updatedAt: now,
    factoryProjectId: project.id,
    sourceArtifacts: [
      {
        artifactId: `art-app-${project.id}`,
        type: "application",
        label: "Application Project",
        href: `/application-factory/${project.id}`,
      },
    ],
    previewMode: "sandbox",
    files: [
      { path: "app/(dashboard)/page.tsx", kind: "file", description: "Dashboard" },
      { path: "lib/supabase/", kind: "directory", description: "Supabase client" },
    ],
    routes,
    screenshots: [{ id: "ss-app", label: "Dashboard", device: "desktop", placeholder: true }],
    dataModel: {
      entities: scenario.entities.map((e) => ({
        name: e,
        fields: ["id", "name", "status", "created_at"],
      })),
      provider: "supabase",
    },
    apiSpec: {
      baseUrl: "/api/demo",
      endpoints: scenario.entities.slice(0, 4).map((e) => ({
        method: "GET",
        path: `/api/${e}`,
        description: `List ${e}`,
        auth: true,
      })),
      auth: "demo-session",
    },
    approvals: [],
    warnings: [
      { id: "w-app-demo", severity: "info", message: "Login demo — sin auth real", code: "PREVIEW_SAFETY" },
    ],
    nextActions: [
      { id: "na-preview", label: "Abrir preview", kind: "preview" },
      { id: "na-flow", label: "User Flow Runner", kind: "navigate" },
      { id: "na-change", label: "Solicitar cambios", kind: "change_request" },
    ],
    payload,
    validation: {
      score: preview ? 88 : 60,
      passed: !!preview,
      checks: [
        { id: "preview", label: "Preview navegable", status: preview ? "pass" : "warn" },
        { id: "roles", label: `${scenario.roles.length} roles demo`, status: "pass" },
      ],
      source: "adapter",
    },
  };
}

export async function loadApplicationPreview(projectId: string) {
  const { getProjectById, generatePreviewApp } = await import("@/lib/application-factory");
  const project = getProjectById(projectId);
  if (!project?.frontend) return null;
  return generatePreviewApp(project);
}
